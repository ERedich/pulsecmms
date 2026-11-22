import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "pulse-theme";
/** Keep in sync with `html.theme-transition` duration in index.css. */
const THEME_TRANSITION_MS = 300;
const listeners = new Set<() => void>();
let transitionTimer: ReturnType<typeof setTimeout> | null = null;

function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function beginThemeTransition() {
  if (prefersReducedMotion()) return;

  const root = document.documentElement;
  root.classList.add("theme-transition");
  // Force layout so the transition class is active before colors change.
  void root.offsetWidth;

  if (transitionTimer !== null) {
    clearTimeout(transitionTimer);
  }
  transitionTimer = setTimeout(() => {
    root.classList.remove("theme-transition");
    transitionTimer = null;
  }, THEME_TRANSITION_MS);
}

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function getTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  beginThemeTransition();
  applyTheme(theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures (private mode, quota, etc.)
  }
  emit();
}

export function toggleTheme() {
  setTheme(getTheme() === "dark" ? "light" : "dark");
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => "light");
}

/** Apply stored preference once at app startup (after FOUC script). */
export function initTheme() {
  applyTheme(readStoredTheme());
}
