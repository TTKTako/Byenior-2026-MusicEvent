"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/remote");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Incorrect password");
        setPassword("");
      }
    } catch {
      setError("Connection error — is the server running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-orange-950/40 border border-orange-600/30">
            <Lock size={22} className="text-orange-400" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
              Remote Access
            </h1>
            <p className="text-sm text-zinc-500">
              Enter the password to continue
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              autoComplete="current-password"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 pr-11 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              tabIndex={-1}
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-400 text-center px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white rounded-lg px-4 py-3 text-sm font-medium transition-colors"
          >
            <LogIn size={16} />
            {loading ? "Checking..." : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
