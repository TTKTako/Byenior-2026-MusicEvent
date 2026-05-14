"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Upload, Search, X } from "lucide-react";

const REACTION_EMOJIS = [
  { emoji: "😢", label: "Cry" },
  { emoji: "❤️", label: "Heart" },
  { emoji: "💔", label: "Broken Heart" },
  { emoji: "👍", label: "Thumbs Up" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "😂", label: "Laugh" },
];

type Status = "idle" | "sending" | "sent" | "error" | "wait";

export default function JoinPage() {
  // ── Emoji ──────────────────────────────────────────────────────
  const [emojiFlash, setEmojiFlash] = useState<string | null>(null);

  const sendEmoji = async (emoji: string) => {
    setEmojiFlash(emoji);
    setTimeout(() => setEmojiFlash(null), 600);
    await fetch("/api/join/emoji", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
  };

  // ── Text ───────────────────────────────────────────────────────
  const [text, setText] = useState("");
  const [textStatus, setTextStatus] = useState<Status>("idle");
  const [textMsg, setTextMsg] = useState("");

  const sendText = async () => {
    const trimmed = text.trim();
    if (!trimmed || textStatus === "sending") return;
    setTextStatus("sending");
    try {
      const res = await fetch("/api/join/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setTextStatus("wait");
        setTextMsg(data.error ?? "Screen is busy. Wait a moment.");
        setTimeout(() => setTextStatus("idle"), 3500);
      } else if (res.ok) {
        setTextStatus("sent");
        setText("");
        setTimeout(() => setTextStatus("idle"), 2000);
      } else {
        setTextStatus("error");
        setTextMsg(data.error ?? "Failed to send.");
        setTimeout(() => setTextStatus("idle"), 3000);
      }
    } catch {
      setTextStatus("error");
      setTextMsg("Network error.");
      setTimeout(() => setTextStatus("idle"), 3000);
    }
  };

  // ── Image ──────────────────────────────────────────────────────
  type ImageMode = "none" | "device" | "url";
  const [imageMode, setImageMode] = useState<ImageMode>("none");
  const [imageUrl, setImageUrl] = useState("");
  const [imageStatus, setImageStatus] = useState<Status>("idle");
  const [imageMsg, setImageMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // GIF search
  interface GifResult { id: string; title: string; preview: string; url: string; }
  const [gifSearch, setGifSearch] = useState("");
  const [gifResults, setGifResults] = useState<GifResult[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifError, setGifError] = useState("");
  const [showPasteUrl, setShowPasteUrl] = useState(false);

  // Debounced GIF search
  useEffect(() => {
    if (!gifSearch.trim() || imageMode !== "url") {
      setGifResults([]);
      setGifError("");
      return;
    }
    setGifLoading(true);
    setGifError("");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/join/gif-search?q=${encodeURIComponent(gifSearch)}`
        );
        const data = await res.json();
        if (data.error) { setGifError(data.error); setGifResults([]); }
        else setGifResults(data.results ?? []);
      } catch {
        setGifError("Network error.");
        setGifResults([]);
      } finally {
        setGifLoading(false);
      }
    }, 400);
    return () => { clearTimeout(t); setGifLoading(false); };
  }, [gifSearch, imageMode]);

  const resetImageMode = () => {
    setImageMode("none");
    setImageUrl("");
    setGifSearch("");
    setGifResults([]);
    setGifError("");
    setShowPasteUrl(false);
  };

  const handleImageResult = async (
    res: Response,
    data: { error?: string }
  ) => {
    if (res.ok) {
      setImageStatus("sent");
      setImageUrl("");
      setImageMode("none");
      setTimeout(() => setImageStatus("idle"), 2500);
    } else if (res.status === 429) {
      setImageStatus("wait");
      setImageMsg(data.error ?? "Screen is busy. Wait a moment.");
      setTimeout(() => setImageStatus("idle"), 3500);
    } else {
      setImageStatus("error");
      setImageMsg(data.error ?? "Failed to send.");
      setTimeout(() => setImageStatus("idle"), 3500);
    }
  };

  const sendGifDirect = async (gifUrl: string) => {
    resetImageMode();
    setImageStatus("sending");
    try {
      const res = await fetch("/api/join/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: gifUrl }),
      });
      await handleImageResult(res, await res.json());
    } catch {
      setImageStatus("error");
      setImageMsg("Network error.");
      setTimeout(() => setImageStatus("idle"), 3500);
    }
  };

  const sendImageUrl = async () => {
    const trimmed = imageUrl.trim();
    if (!trimmed || imageStatus === "sending") return;
    setImageStatus("sending");
    try {
      const res = await fetch("/api/join/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      await handleImageResult(res, await res.json());
    } catch {
      setImageStatus("error");
      setImageMsg("Network error.");
      setTimeout(() => setImageStatus("idle"), 3500);
    }
  };

  const sendImageFile = async (file: File) => {
    setImageStatus("sending");
    setImageMode("none");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/join/image", { method: "POST", body: form });
      await handleImageResult(res, await res.json());
    } catch {
      setImageStatus("error");
      setImageMsg("Network error.");
      setTimeout(() => setImageStatus("idle"), 3500);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col select-none">
      {/* Header */}
      <header className="text-center pt-10 pb-6 px-4">
        <h1 className="text-3xl font-black tracking-tight text-white">
          Byenior 2026
        </h1>
        <p className="text-sm text-zinc-400 mt-1 tracking-wide">Join the show</p>
      </header>

      <main className="flex-1 px-4 pb-10 max-w-md mx-auto w-full space-y-8">
        {/* ── Reactions ─────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Reactions
          </h2>
          <div className="grid grid-cols-6 gap-2">
            {REACTION_EMOJIS.map(({ emoji, label }) => (
              <button
                key={emoji}
                onClick={() => sendEmoji(emoji)}
                aria-label={label}
                className={`flex items-center justify-center aspect-square text-3xl rounded-2xl border transition-all duration-150 active:scale-90 ${
                  emojiFlash === emoji
                    ? "bg-zinc-700 border-zinc-500 scale-95"
                    : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-600"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </section>

        {/* ── Message ───────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Message
          </h2>

          {textStatus === "wait" && (
            <div className="rounded-xl bg-yellow-950/40 border border-yellow-700/40 px-4 py-2.5 text-sm text-yellow-400">
              {textMsg}
            </div>
          )}
          {textStatus === "error" && (
            <div className="rounded-xl bg-red-950/40 border border-red-700/40 px-4 py-2.5 text-sm text-red-400">
              {textMsg}
            </div>
          )}
          {textStatus === "sent" && (
            <div className="rounded-xl bg-green-950/40 border border-green-700/40 px-4 py-2.5 text-sm text-green-400">
              Sent to screen!
            </div>
          )}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 100))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendText();
              }
            }}
            placeholder="Type a short message..."
            rows={2}
            maxLength={100}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none transition-colors"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-600">{text.length}/100</span>
            <button
              onClick={sendText}
              disabled={textStatus === "sending" || !text.trim()}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 disabled:opacity-40 text-zinc-200 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
            >
              <Send size={14} />
              {textStatus === "sending" ? "Sending..." : "Send"}
            </button>
          </div>
        </section>

        {/* ── Image / GIF ───────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Image / GIF
          </h2>

          {imageStatus === "sent" && (
            <div className="rounded-xl bg-green-950/40 border border-green-700/40 px-4 py-2.5 text-sm text-green-400">
              Sent to screen!
            </div>
          )}
          {imageStatus === "wait" && (
            <div className="rounded-xl bg-yellow-950/40 border border-yellow-700/40 px-4 py-2.5 text-sm text-yellow-400">
              {imageMsg}
            </div>
          )}
          {imageStatus === "error" && (
            <div className="rounded-xl bg-red-950/40 border border-red-700/40 px-4 py-2.5 text-sm text-red-400">
              {imageMsg}
            </div>
          )}
          {imageStatus === "sending" && (
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-400">
              Uploading...
            </div>
          )}

          {imageMode === "none" && imageStatus === "idle" && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setImageMode("device");
                  // Trigger file input after state update
                  setTimeout(() => fileRef.current?.click(), 50);
                }}
                className="flex flex-col items-center gap-2 p-5 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-600 active:scale-95 transition-all"
              >
                <Upload size={26} className="text-zinc-400" />
                <span className="text-sm text-zinc-300">From Device</span>
                <span className="text-xs text-zinc-600">JPEG · PNG · GIF · WebP</span>
              </button>
              <button
                onClick={() => setImageMode("url")}
                className="flex flex-col items-center gap-2 p-5 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-600 active:scale-95 transition-all"
              >
                <Search size={26} className="text-zinc-400" />
                <span className="text-sm text-zinc-300">Search GIF</span>
                <span className="text-xs text-zinc-600">Powered by Giphy</span>
              </button>
            </div>
          )}

          {/* Hidden file input — triggered programmatically */}
          <input
            type="file"
            accept="image/*"
            ref={fileRef}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                sendImageFile(file);
                e.target.value = "";
              }
              setImageMode("none");
            }}
          />

          {imageMode === "url" && imageStatus === "idle" && (
            <div className="space-y-3">
              {/* Search input */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  value={gifSearch}
                  onChange={(e) => setGifSearch(e.target.value)}
                  placeholder="Search GIFs on Giphy..."
                  autoFocus
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              {/* Results grid */}
              {gifLoading && (
                <p className="text-xs text-zinc-500 text-center py-4">Searching...</p>
              )}
              {gifError && (
                <p className="text-xs text-red-400 text-center py-2">{gifError}</p>
              )}
              {!gifLoading && gifResults.length > 0 && (
                <div className="grid grid-cols-3 gap-1.5 max-h-64 overflow-y-auto rounded-xl">
                  {gifResults.map((gif) => (
                    <button
                      key={gif.id}
                      onClick={() => sendGifDirect(gif.url)}
                      title={gif.title}
                      className="aspect-square overflow-hidden rounded-lg border border-zinc-800 hover:border-zinc-500 active:scale-95 transition-all bg-zinc-900"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={gif.preview}
                        alt={gif.title}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
              {!gifLoading && gifSearch.trim() && !gifError && gifResults.length === 0 && (
                <p className="text-xs text-zinc-600 text-center py-3">No results found</p>
              )}

              {/* Paste URL fallback */}
              {!showPasteUrl ? (
                <button
                  onClick={() => setShowPasteUrl(true)}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-2"
                >
                  or paste an image URL manually
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendImageUrl()}
                    placeholder="https://media.giphy.com/..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                  <button
                    onClick={sendImageUrl}
                    disabled={!imageUrl.trim()}
                    className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
                  >
                    <Send size={14} />
                  </button>
                </div>
              )}

              <button
                onClick={resetImageMode}
                className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <X size={12} /> Cancel
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
