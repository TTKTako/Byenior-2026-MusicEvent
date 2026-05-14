export const STORAGE_KEY = "byenior-screen-state";

export interface Prefab {
  id: string;
  name: string;
  flameColor: string;
  bgColor: string;
  textSize: number;
}

export interface ScreenState {
  activeName: string;
  bands: string[];
  flameColor: string;
  bgColor: string;
  prefabs: Prefab[];
  showFlame: boolean;
  showText: boolean;
  textSize: number; // vw units, default 10
}

export const DEFAULT_STATE: ScreenState = {
  activeName: "N/A",
  bands: [],
  flameColor: "#ff6600",
  bgColor: "#1a0400",
  prefabs: [],
  showFlame: true,
  showText: true,
  textSize: 10,
};

export function readState(): ScreenState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

export function writeState(state: ScreenState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
