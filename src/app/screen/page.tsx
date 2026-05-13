"use client";

import { useRef, useEffect, CSSProperties } from "react";

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

const LANTERN_COLORS = ["#ff4400", "#ff6600", "#ff8800", "#ffaa00"];
const EMBER_COLORS = ["#ffcc44", "#ff9922", "#ff6600", "#ffee88"];

function mkParticle(w: number, h: number): Particle {
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
      ? LANTERN_COLORS[Math.floor(Math.random() * LANTERN_COLORS.length)]
      : EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)],
    life: 0,
    maxLife: isLantern
      ? 500 + Math.random() * 300
      : 100 + Math.random() * 80,
    isLantern,
  };
}

function EmberField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particles = useRef<Particle[]>([]);

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
    for (let i = 0; i < 55; i++) {
      const p = mkParticle(w, h);
      p.y = Math.random() * h;
      p.life = Math.floor(Math.random() * p.maxLife * 0.6);
      particles.current.push(p);
    }

    const draw = () => {
      const cw = window.innerWidth;
      const ch = window.innerHeight;
      ctx.clearRect(0, 0, cw, ch);

      if (Math.random() < 0.35) particles.current.push(mkParticle(cw, ch));
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
}

function GlitchText({
  children,
  speed = 1,
  enableShadows = true,
  color = "#ffd700",
}: GlitchTextProps) {
  return (
    <div
      className="glitch"
      style={
        {
          "--after-duration": `${speed * 9}s`,
          "--before-duration": `${speed * 6}s`,
          "--after-shadow": enableShadows ? "-3px 0 #ff4400" : "none",
          "--before-shadow": enableShadows ? "3px 0 #ffcc00" : "none",
          "--glitch-color": color,
          "--glitch-bg": "#000000",
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
  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100dvh",
        overflow: "hidden",
        background:
          "radial-gradient(ellipse at 50% 80%, #1a0400 0%, #050000 50%, #000000 100%)",
      }}
    >
      <EmberField />

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

      {/* Centered text */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
        }}
      >
        <GlitchText speed={0.2} color="#ffffff">N/A</GlitchText>
      </div>
    </div>
  );
}

