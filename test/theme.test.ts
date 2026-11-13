import test from "node:test";
import assert from "node:assert/strict";

type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  mode: ThemeMode;
  systemIsDark: boolean;
}

function resolveActiveTheme(state: ThemeState): "light" | "dark" {
  if (state.mode === "system") {
    return state.systemIsDark ? "dark" : "light";
  }
  return state.mode;
}

function getNextCycledTheme(current: ThemeMode): ThemeMode {
  if (current === "light") return "dark";
  if (current === "dark") return "system";
  return "light";
}

test("Theme Service: Mode definitions and resolution logic", () => {
  // 1. Explicit light mode
  assert.equal(resolveActiveTheme({ mode: "light", systemIsDark: true }), "light");
  assert.equal(resolveActiveTheme({ mode: "light", systemIsDark: false }), "light");

  // 2. Explicit dark mode
  assert.equal(resolveActiveTheme({ mode: "dark", systemIsDark: true }), "dark");
  assert.equal(resolveActiveTheme({ mode: "dark", systemIsDark: false }), "dark");

  // 3. System selection mode matches system preference dynamically
  assert.equal(resolveActiveTheme({ mode: "system", systemIsDark: true }), "dark");
  assert.equal(resolveActiveTheme({ mode: "system", systemIsDark: false }), "light");
});

test("Theme Service: Theme cycling transitions", () => {
  let mode: ThemeMode = "light";
  mode = getNextCycledTheme(mode);
  assert.equal(mode, "dark");

  mode = getNextCycledTheme(mode);
  assert.equal(mode, "system");

  mode = getNextCycledTheme(mode);
  assert.equal(mode, "light");
});

test("Theme Service: Storage and fallback defaults", () => {
  const STORAGE_KEY = "marc_theme";
  const mockStorage: Record<string, string> = {};

  const saveTheme = (m: ThemeMode) => {
    mockStorage[STORAGE_KEY] = m;
  };

  const loadTheme = (): ThemeMode => {
    const val = mockStorage[STORAGE_KEY] as ThemeMode | undefined;
    if (val === "light" || val === "dark" || val === "system") {
      return val;
    }
    return "system";
  };

  // Default is system when storage empty
  assert.equal(loadTheme(), "system");

  // Save light
  saveTheme("light");
  assert.equal(loadTheme(), "light");

  // Save dark
  saveTheme("dark");
  assert.equal(loadTheme(), "dark");

  // Save system
  saveTheme("system");
  assert.equal(loadTheme(), "system");
});
