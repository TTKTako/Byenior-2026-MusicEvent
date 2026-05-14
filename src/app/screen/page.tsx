"use client";

import { useRef, useEffect, useState, CSSProperties } from "react";
import { type ScreenState, DEFAULT_STATE } from "../lib/screen-state";
import { QRCodeSVG } from "qrcode.react";

/* ─── Join overlay types ─────────────────────────────────────────── */
interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;       // % from left
  wobble: number;  // px
  duration: number; // seconds
}
interface FloatingText {
  id: string;
  text: string;
  direction: "ltr" | "rtl";
  y: number; // % from top
}
interface FloatingImage {
  id: string;
  url: string;
  x: number;       // % from left
  duration: number; // seconds
  rotation: number; // deg, random tilt
}

/* ─── Color helpers ──────────────────────────────────────────────── */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").padEnd(6, "0");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")
      )
      .join("")
  );
}

function hexToHsl(hex: string): [number, number, number] {
  const [rr, gg, bb] = hexToRgb(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
  else if (max === gg) h = ((bb - rr) / d + 2) / 6;
  else h = ((rr - gg) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const hh = h / 360, ss = s / 100, ll = l / 100;
  if (ss === 0) { const v = Math.round(ll * 255); return rgbToHex(v, v, v); }
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const hue2rgb = (t: number) => {
    const tt = ((t % 1) + 1) % 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return rgbToHex(
    Math.round(hue2rgb(hh + 1 / 3) * 255),
    Math.round(hue2rgb(hh) * 255),
    Math.round(hue2rgb(hh - 1 / 3) * 255)
  );
}

function deriveFlameColors(hex: string): { lantern: string[]; ember: string[] } {
  const [h, s, l] = hexToHsl(hex);
  const sl = Math.max(10, l);
  return {
    lantern: [
      hex,
      hslToHex((h + 8) % 360, Math.min(100, s), Math.min(70, sl + 12)),
      hslToHex((h - 8 + 360) % 360, Math.min(100, s + 8), Math.max(20, sl - 8)),
      hslToHex((h + 18) % 360, Math.min(100, s - 5), Math.min(75, sl + 22)),
    ],
    ember: [
      hslToHex(h, Math.max(40, s - 15), Math.min(88, sl + 28)),
      hslToHex((h + 12) % 360, Math.min(100, s), Math.min(82, sl + 20)),
      hslToHex((h - 12 + 360) % 360, Math.min(100, s + 8), sl),
      hslToHex(h, Math.max(20, s - 25), Math.min(94, sl + 40)),
    ],
  };
}

function darkenBg(hex: string): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, l * 0.3));
}

/* â”€â”€â”€ EmberField (floating lanterns + embers) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
  isLantern: boolean;
};

function mkParticle(
  w: number,
  h: number,
  lanternColors: string[],
  emberColors: string[]
): Particle {
  const isLantern = Math.random() < 0.12;
  return {
    x: Math.random() * w,
    y: h + 20,
    vx: (Math.random() - 0.5) * (isLantern ? 0.25 : 0.6),
    vy: isLantern
      ? -(0.35 + Math.random() * 0.25)
      : -(0.8 + Math.random() * 1.2),
    radius: isLantern ? 5 + Math.random() * 6 : 1 + Math.random() * 1.5,
    alpha: 0,
    color: isLantern
      ? lanternColors[Math.floor(Math.random() * lanternColors.length)]
      : emberColors[Math.floor(Math.random() * emberColors.length)],
    life: 0,
    maxLife: isLantern
      ? 500 + Math.random() * 300
      : 100 + Math.random() * 80,
    isLantern,
  };
}

interface EmberFieldProps {
  flameColor: string;
}

function EmberField({ flameColor }: EmberFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particles = useRef<Particle[]>([]);
  const derivedRef = useRef(deriveFlameColors(flameColor));

  useEffect(() => {
    derivedRef.current = deriveFlameColors(flameColor);
  }, [flameColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // Seed particles scattered at various heights so the screen isn't empty on load
    const w = window.innerWidth;
    const h = window.innerHeight;
    const { lantern: lc0, ember: ec0 } = derivedRef.current;
    for (let i = 0; i < 55; i++) {
      const p = mkParticle(w, h, lc0, ec0);
      p.y = Math.random() * h;
      p.life = Math.floor(Math.random() * p.maxLife * 0.6);
      particles.current.push(p);
    }

    const draw = () => {
      const cw = window.innerWidth;
      const ch = window.innerHeight;
      ctx.clearRect(0, 0, cw, ch);

      const { lantern: lc, ember: ec } = derivedRef.current;
      if (Math.random() < 0.35) particles.current.push(mkParticle(cw, ch, lc, ec));
      particles.current = particles.current.filter((p) => p.life < p.maxLife);

      for (const p of particles.current) {
        p.life++;
        p.x += p.vx + Math.sin(p.life * 0.025) * 0.4;
        p.y += p.vy;

        const prog = p.life / p.maxLife;
        let a =
          prog < 0.1
            ? prog / 0.1
            : prog > 0.75
            ? (1 - prog) / 0.25
            : 1;
        a *= p.isLantern ? 0.9 : 0.55;

        ctx.save();
        ctx.globalAlpha = a;

        if (p.isLantern) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 28;
          const grad = ctx.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x,
            p.y,
            p.radius * 2.5
          );
          grad.addColorStop(0, "#ffffff");
          grad.addColorStop(0.3, p.color);
          grad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, display: "block" }}
    />
  );
}

/* â”€â”€â”€ GlitchText (ReactBits) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
interface GlitchTextProps {
  children: string;
  speed?: number;
  enableShadows?: boolean;
  color?: string;
  bgColor?: string;
  fontSize?: number; // vw units
}

function GlitchText({
  children,
  speed = 1,
  enableShadows = true,
  color = "#ffd700",
  bgColor = "transparent",
  fontSize,
}: GlitchTextProps) {
  return (
    <div
      className="glitch"
      style={
        {
          ...(fontSize !== undefined ? { fontSize: `${fontSize}vw` } : {}),
          "--after-duration": `${speed * 9}s`,
          "--before-duration": `${speed * 6}s`,
          "--after-shadow": enableShadows ? "-3px 0 #ff4400" : "none",
          "--before-shadow": enableShadows ? "3px 0 #ffcc00" : "none",
          "--glitch-color": color,
          "--glitch-bg": bgColor,
        } as CSSProperties
      }
      data-text={children}
    >
      {children}
    </div>
  );
}

/* â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function ScreenPage() {
  const [screenState, setScreenState] = useState<ScreenState>(DEFAULT_STATE);
  const [displayName, setDisplayName] = useState(DEFAULT_STATE.activeName);
  const [transitionClass, setTransitionClass] = useState("");
  const pendingNameRef = useRef<string | null>(null);

  // ── Join overlay state ──────────────────────────────────────────
  const [floatEmojis, setFloatEmojis] = useState<FloatingEmoji[]>([]);
  const [floatTexts, setFloatTexts] = useState<FloatingText[]>([]);
  const [floatImages, setFloatImages] = useState<FloatingImage[]>([]);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);

  // Load initial state from API
  useEffect(() => {
    fetch("/api/screen")
      .then((r) => r.json())
      .then((data: ScreenState) => {
        setScreenState(data);
        setDisplayName(data.activeName);
      })
      .catch(() => {
        // Server not available yet — show defaults
      });
  }, []);

  // Subscribe to live updates via SSE
  useEffect(() => {
    const es = new EventSource("/api/screen/stream");
    es.onmessage = (e) => {
      try {
        const next: ScreenState = { ...DEFAULT_STATE, ...JSON.parse(e.data) };
        setScreenState(next);
      } catch {
        // ignore malformed event
      }
    };
    return () => es.close();
  }, []);

  // ── Join overlay SSE + QR URL ───────────────────────────────────
  useEffect(() => {
    setJoinUrl(window.location.origin + "/join");

    const es = new EventSource("/api/join/stream");
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as {
          type: "emoji" | "text" | "image";
          id: string;
          payload: string;
          direction?: "ltr" | "rtl";
        };
        const { id } = ev;

        if (ev.type === "emoji") {
          const item: FloatingEmoji = {
            id,
            emoji: ev.payload,
            x: Math.random() * 85 + 5,
            wobble: Math.floor(Math.random() * 30 + 10),
            duration: 2.5 + Math.random() * 1.5,
          };
          setFloatEmojis((p) => [...p, item]);
          setTimeout(
            () => setFloatEmojis((p) => p.filter((em) => em.id !== id)),
            (item.duration + 0.6) * 1000
          );
        } else if (ev.type === "text") {
          const item: FloatingText = {
            id,
            text: ev.payload,
            direction: ev.direction ?? "ltr",
            y: Math.floor(Math.random() * 60 + 15),
          };
          setFloatTexts((p) => [...p, item]);
          setTimeout(
            () => setFloatTexts((p) => p.filter((t) => t.id !== id)),
            11_000
          );
        } else if (ev.type === "image") {
          const item: FloatingImage = {
            id,
            url: ev.payload,
            x: Math.random() * 70 + 5,
            duration: 6 + Math.random() * 2,
            rotation: (Math.random() * 16 - 8) || 4, // -8 to +8 deg, never 0
          };
          setFloatImages((p) => [...p, item]);
          setTimeout(
            () => setFloatImages((p) => p.filter((img) => img.id !== id)),
            (item.duration + 0.6) * 1000
          );
        }
      } catch {
        // ignore
      }
    };
    return () => es.close();
  }, []);

  // Animate text transition when activeName changes
  useEffect(() => {
    if (screenState.activeName === displayName) return;
    pendingNameRef.current = screenState.activeName;

    setTransitionClass("text-transition-out");
    const exitTimer = setTimeout(() => {
      if (pendingNameRef.current !== null) {
        setDisplayName(pendingNameRef.current);
        pendingNameRef.current = null;
      }
      setTransitionClass("text-transition-in");
      setTimeout(() => setTransitionClass(""), 450);
    }, 350);

    return () => clearTimeout(exitTimer);
  }, [screenState.activeName]); // eslint-disable-line react-hooks/exhaustive-deps

  const bg = screenState.bgColor;

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100dvh",
        overflow: "hidden",
        background: "#000000",
      }}
    >
      {/* Smoothly transitioning background color */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: bg,
          transition: "background-color 1s ease",
        }}
      />

      {/* Radial darkening overlay — always on top of base color */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 80%, transparent 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.92) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Flame particles — fades out when hidden */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: screenState.showFlame ? 1 : 0,
          transition: "opacity 1s ease",
        }}
      >
        <EmberField flameColor={screenState.flameColor} />
      </div>

      {/* Vignette overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.7) 100%)",
          zIndex: 5,
        }}
      />

      {/* Centered text — fades out when hidden */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          opacity: screenState.showText ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
      >
        <div
          className={transitionClass}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.1em" }}
        >
          {displayName.split("\n").map((line, i) => (
            <GlitchText
              key={i}
              speed={0.2}
              color="#ffffff"
              bgColor="transparent"
              fontSize={screenState.textSize}
            >
              {line || "\u00A0"}
            </GlitchText>
          ))}
        </div>
      </div>

      {/* ── Scrolling texts — behind main content ── */}
      {floatTexts.map((t) => (
        <div
          key={t.id}
          style={{
            position: "absolute",
            top: `${t.y}%`,
            zIndex: 4,
            whiteSpace: "nowrap",
            fontSize: "clamp(0.7rem, 1.8vw, 1rem)",
            color: "rgba(255,255,255,0.6)",
            textShadow: "0 1px 4px rgba(0,0,0,0.9)",
            animation: `text-scroll-${t.direction} 10s linear forwards`,
            pointerEvents: "none",
            fontFamily: "monospace",
          }}
        >
          {t.text}
        </div>
      ))}

      {/* ── Floating images — behind main content ── */}
      {floatImages.map((img) => (
        <div
          key={img.id}
          style={{
            position: "absolute",
            top: 0,
            left: `${img.x}%`,
            zIndex: 8,
            animation: `image-fall ${img.duration}s linear forwards`,
            "--img-rot": `${img.rotation}deg`,
            pointerEvents: "none",
          } as CSSProperties}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.url}
            alt=""
            style={{
              maxWidth: "140px",
              maxHeight: "140px",
              borderRadius: "8px",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>
      ))}

      {/* ── Floating emojis — in front of everything ── */}
      {floatEmojis.map((em) => (
        <div
          key={em.id}
          style={{
            position: "absolute",
            bottom: "0",
            left: `${em.x}%`,
            zIndex: 20,
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            animation: `emoji-float ${em.duration}s ease-out forwards`,
            "--emoji-wobble": `${em.wobble}px`,
            pointerEvents: "none",
            userSelect: "none",
          } as CSSProperties}
        >
          {em.emoji}
        </div>
      ))}

      {/* ── QR code — bottom left ── */}
      {joinUrl && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "20px",
            zIndex: 30,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(8px)",
            borderRadius: "14px",
            padding: "10px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <QRCodeSVG
            value={joinUrl}
            size={90}
            bgColor="transparent"
            fgColor="rgba(255,255,255,0.9)"
          />
          <span
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: "0.55rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Join the Show
          </span>
        </div>
      )}
    </div>
  );
}


