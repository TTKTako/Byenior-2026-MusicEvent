"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Trash2, Check, RotateCcw, Save, Bookmark, Eye, EyeOff, Type } from "lucide-react";
import {
  DEFAULT_STATE,
  type ScreenState,
  type Prefab,
} from "../lib/screen-state";

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

/* ─── RGBPicker ──────────────────────────────────────────────────── */
interface RGBPickerProps {
  color: string;
  onChange: (hex: string) => void;
  label: string;
}

function RGBPicker({ color, onChange, label }: RGBPickerProps) {
  const [r, g, b] = hexToRgb(color);
  const [hexInput, setHexInput] = useState(color);

  useEffect(() => {
    setHexInput(color);
  }, [color]);

  const handleHexInput = (val: string) => {
    setHexInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      onChange(val.toLowerCase());
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded border border-white/20 flex-shrink-0"
          style={{ background: color }}
        />
        <span className="text-sm font-medium text-zinc-300">{label}</span>
        <input
          type="text"
          value={hexInput}
          onChange={(e) => handleHexInput(e.target.value)}
          className="ml-auto w-24 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-200 text-center focus:outline-none focus:border-orange-500"
          maxLength={7}
        />
      </div>

      {/* R */}
      <div className="flex items-center gap-2">
        <span className="w-3 text-xs font-mono font-bold text-red-400">R</span>
        <input
          type="range"
          min={0}
          max={255}
          value={r}
          onChange={(e) => onChange(rgbToHex(+e.target.value, g, b))}
          className="flex-1 h-2 cursor-pointer accent-red-500"
        />
        <span className="w-8 text-right text-xs font-mono text-zinc-400">{r}</span>
      </div>

      {/* G */}
      <div className="flex items-center gap-2">
        <span className="w-3 text-xs font-mono font-bold text-green-400">G</span>
        <input
          type="range"
          min={0}
          max={255}
          value={g}
          onChange={(e) => onChange(rgbToHex(r, +e.target.value, b))}
          className="flex-1 h-2 cursor-pointer accent-green-500"
        />
        <span className="w-8 text-right text-xs font-mono text-zinc-400">{g}</span>
      </div>

      {/* B */}
      <div className="flex items-center gap-2">
        <span className="w-3 text-xs font-mono font-bold text-blue-400">B</span>
        <input
          type="range"
          min={0}
          max={255}
          value={b}
          onChange={(e) => onChange(rgbToHex(r, g, +e.target.value))}
          className="flex-1 h-2 cursor-pointer accent-blue-500"
        />
        <span className="w-8 text-right text-xs font-mono text-zinc-400">{b}</span>
      </div>
    </div>
  );
}

/* ─── Remote Page ────────────────────────────────────────────────── */
export default function RemotePage() {
  const [state, setState] = useState<ScreenState>(DEFAULT_STATE);
  const [newBand, setNewBand] = useState("");
  const [prefabName, setPrefabName] = useState("");

  // Debounce refs — used to batch rapid color slider changes
  const pendingFlushRef = useRef<ScreenState | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load initial state from API
  useEffect(() => {
    fetch("/api/screen")
      .then((r) => r.json())
      .then((data: ScreenState) => setState(data))
      .catch(() => setState(DEFAULT_STATE));
  }, []);

  /**
   * update — optimistically applies patch to local state.
   * debounce=true: batches rapid changes (color sliders) into a single API
   * call fired 250 ms after the last movement.
   * debounce=false (default): flushes immediately (band changes, toggles, etc).
   */
  const update = useCallback((patch: Partial<ScreenState>, debounce = false) => {
    setState((prev) => {
      const next = { ...prev, ...patch };

      if (debounce) {
        pendingFlushRef.current = next;
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          if (pendingFlushRef.current) {
            fetch("/api/screen", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(pendingFlushRef.current),
            }).catch(() => {});
            pendingFlushRef.current = null;
          }
        }, 250);
      } else {
        fetch("/api/screen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        }).catch(() => {});
      }

      return next;
    });
  }, []);

  const addBand = () => {
    const name = newBand.trim();
    if (!name || state.bands.includes(name)) return;
    update({ bands: [...state.bands, name] });
    setNewBand("");
  };

  const removeBand = (name: string) => {
    update({
      bands: state.bands.filter((b) => b !== name),
      activeName: state.activeName === name ? "N/A" : state.activeName,
    });
  };

  const setActive = (name: string) => update({ activeName: name });

  const savePrefab = () => {
    const name = prefabName.trim() || `Preset ${state.prefabs.length + 1}`;
    const prefab: Prefab = {
      id: crypto.randomUUID(),
      name,
      flameColor: state.flameColor,
      bgColor: state.bgColor,
      textSize: state.textSize,
    };
    update({ prefabs: [...state.prefabs, prefab] });
    setPrefabName("");
  };

  const applyPrefab = (p: Prefab) =>
    update({ flameColor: p.flameColor, bgColor: p.bgColor, textSize: p.textSize });

  const removePrefab = (id: string) =>
    update({ prefabs: state.prefabs.filter((p) => p.id !== id) });

  const resetColors = () =>
    update({
      flameColor: DEFAULT_STATE.flameColor,
      bgColor: DEFAULT_STATE.bgColor,
      textSize: DEFAULT_STATE.textSize,
    });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-10">

        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-2xl font-bold tracking-tight">Remote Control</h1>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            live
          </div>
        </div>

        {/* ── Band Management ── */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Bands
          </h2>

          {/* Active display */}
          <div className="rounded-lg bg-zinc-900 px-4 py-3 border border-zinc-800 flex items-center gap-3">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Now Showing</span>
            <span className="ml-auto text-lg font-bold text-orange-400 font-mono whitespace-pre-line text-right max-w-xs">
              {state.activeName}
            </span>
          </div>

          {/* Add band input */}
          <div className="flex gap-2 items-end">
            <textarea
              value={newBand}
              onChange={(e) => setNewBand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  addBand();
                }
              }}
              placeholder={"Band name...\nShift+Enter for new line"}
              rows={2}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors resize-none"
            />
            <button
              onClick={addBand}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Add
            </button>
          </div>

          {/* Band list */}
          {state.bands.length === 0 ? (
            <p className="text-sm text-zinc-600 text-center py-6 border border-dashed border-zinc-800 rounded-lg">
              No bands yet. Add one above.
            </p>
          ) : (
            <ul className="space-y-2">
              {state.bands.map((band) => {
                const isActive = band === state.activeName;
                return (
                  <li
                    key={band}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 border transition-colors ${
                      isActive
                        ? "bg-orange-950/40 border-orange-600/50"
                        : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <span
                      className={`flex-1 font-medium whitespace-pre-line leading-snug ${
                        isActive ? "text-orange-300" : "text-zinc-200"
                      }`}
                    >
                      {band}
                    </span>
                    {isActive ? (
                      <span className="text-xs text-orange-500 font-mono uppercase tracking-wider px-2">
                        active
                      </span>
                    ) : (
                      <button
                        onClick={() => setActive(band)}
                        className="flex items-center gap-1 text-xs text-zinc-400 hover:text-orange-400 transition-colors px-2 py-1 rounded border border-transparent hover:border-orange-600/40"
                      >
                        <Check size={13} />
                        Set
                      </button>
                    )}
                    <button
                      onClick={() => removeBand(band)}
                      className="text-zinc-600 hover:text-red-400 transition-colors p-1 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Visibility ── */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Visibility
          </h2>
          <div className="flex gap-3">
            {/* Flame toggle */}
            <button
              onClick={() => update({ showFlame: !state.showFlame })}
              className={`flex items-center gap-2.5 flex-1 rounded-lg px-4 py-3 border text-sm font-medium transition-colors ${
                state.showFlame
                  ? "bg-orange-950/30 border-orange-600/50 text-orange-300"
                  : "bg-zinc-900 border-zinc-800 text-zinc-500"
              }`}
            >
              {state.showFlame ? <Eye size={15} /> : <EyeOff size={15} />}
              Flame
            </button>
            {/* Text toggle */}
            <button
              onClick={() => update({ showText: !state.showText })}
              className={`flex items-center gap-2.5 flex-1 rounded-lg px-4 py-3 border text-sm font-medium transition-colors ${
                state.showText
                  ? "bg-zinc-800/60 border-zinc-600 text-zinc-200"
                  : "bg-zinc-900 border-zinc-800 text-zinc-500"
              }`}
            >
              {state.showText ? <Eye size={15} /> : <EyeOff size={15} />}
              Text
            </button>
          </div>

          {/* Text size */}
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <Type size={14} className="text-zinc-400 flex-shrink-0" />
              <span className="text-sm text-zinc-300 flex-1">Text Size</span>
              <span className="text-xs font-mono text-zinc-400 w-12 text-right">{state.textSize}vw</span>
            </div>
            <input
              type="range"
              min={3}
              max={22}
              step={0.5}
              value={state.textSize}
              onChange={(e) => update({ textSize: +e.target.value }, true)}
              className="w-full cursor-pointer accent-zinc-400"
            />
          </div>
        </section>

        {/* ── Colors ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Colors
            </h2>
            <button
              onClick={resetColors}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <RotateCcw size={12} />
              Reset defaults (colors + size)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
              <RGBPicker
                label="Flame Color"
                color={state.flameColor}
                onChange={(c) => update({ flameColor: c }, true)}
              />
            </div>
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
              <RGBPicker
                label="Background Color"
                color={state.bgColor}
                onChange={(c) => update({ bgColor: c }, true)}
              />
            </div>
          </div>
        </section>

        {/* ── Color Presets ── */}
        <section className="space-y-4 pb-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Color Presets
          </h2>

          {/* Save preset */}
          <div className="flex gap-2">
            <input
              type="text"
              value={prefabName}
              onChange={(e) => setPrefabName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && savePrefab()}
              placeholder="Preset name (optional)..."
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
            <button
              onClick={savePrefab}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-zinc-200 rounded-lg px-4 py-2 text-sm font-medium transition-colors border border-zinc-700"
            >
              <Save size={15} />
              Save Current
            </button>
          </div>

          {/* Preset list */}
          {state.prefabs.length === 0 ? (
            <p className="text-sm text-zinc-600 text-center py-6 border border-dashed border-zinc-800 rounded-lg">
              No presets yet. Save your current colors as a preset.
            </p>
          ) : (
            <ul className="space-y-2">
              {state.prefabs.map((p) => {
                const isActive =
                  p.flameColor === state.flameColor &&
                  p.bgColor === state.bgColor &&
                  p.textSize === state.textSize;
                return (
                  <li
                    key={p.id}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 border transition-colors ${
                      isActive
                        ? "bg-zinc-800/60 border-zinc-600"
                        : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    {/* Color swatches + size badge */}
                    <div className="flex gap-1.5 flex-shrink-0 items-center">
                      <div
                        className="w-5 h-5 rounded-sm border border-white/10"
                        style={{ background: p.flameColor }}
                        title={`Flame: ${p.flameColor}`}
                      />
                      <div
                        className="w-5 h-5 rounded-sm border border-white/10"
                        style={{ background: p.bgColor }}
                        title={`Background: ${p.bgColor}`}
                      />
                      <span className="text-[10px] font-mono text-zinc-600 ml-0.5">{p.textSize}vw</span>
                    </div>
                    <span className="flex-1 text-sm font-medium text-zinc-200 truncate">
                      {p.name}
                    </span>
                    <button
                      onClick={() => applyPrefab(p)}
                      className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-colors border ${
                        isActive
                          ? "text-orange-400 border-orange-600/50 bg-orange-950/30"
                          : "text-zinc-400 hover:text-orange-400 border-zinc-700 hover:border-orange-600/50"
                      }`}
                    >
                      <Bookmark size={12} />
                      {isActive ? "Active" : "Apply"}
                    </button>
                    <button
                      onClick={() => removePrefab(p.id)}
                      className="text-zinc-600 hover:text-red-400 transition-colors p-1 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

