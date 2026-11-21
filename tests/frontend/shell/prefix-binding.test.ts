import { beforeEach, describe, expect, it, vi } from "vitest";

const prefs = vi.hoisted(() => ({
  customKeybindings: null as string | null,
  saved: [] as unknown[],
}));

vi.mock("@termix-ssh/plugin-sdk/ui", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getUserPreferences: vi.fn(async () => ({
    customKeybindings: prefs.customKeybindings,
  })),
  saveUserPreferences: vi.fn(async (update: { customKeybindings: string }) => {
    prefs.saved.push(JSON.parse(update.customKeybindings));
    prefs.customKeybindings = update.customKeybindings;
  }),
}));

import {
  hasPrefixBinding,
  prefixBinding,
  prefixOverridden,
  seedPrefixBinding,
} from "../../../src/frontend/shell/prefix-binding";
import { PREFIX_ACTION } from "../../../src/frontend/shell/prefix-keys";

beforeEach(() => {
  localStorage.clear();
  prefs.customKeybindings = null;
  prefs.saved = [];
});

describe("prefix binding", () => {
  it("saves Ctrl+Space as the user's binding once", async () => {
    const changed = vi.fn();
    window.addEventListener("customKeybindingsChanged", changed);
    await seedPrefixBinding();
    expect(prefs.saved).toHaveLength(1);
    const [binding] = prefs.saved[0] as ReturnType<typeof prefixBinding>[];
    expect(binding.action.type).toBe(PREFIX_ACTION);
    expect(binding.overridesDefaultId).toBe(PREFIX_ACTION);
    expect(binding.combo).toMatchObject({ key: "Space", ctrl: true });
    expect(prefixOverridden()).toBe(true);
    expect(changed).toHaveBeenCalledTimes(1);

    await seedPrefixBinding();
    expect(prefs.saved).toHaveLength(1);
    window.removeEventListener("customKeybindingsChanged", changed);
  });

  it("keeps the user's other bindings and a rebound prefix", async () => {
    const other = {
      ...prefixBinding(),
      id: "x",
      action: { type: "nextTab" },
      overridesDefaultId: undefined,
    };
    prefs.customKeybindings = JSON.stringify([other]);
    await seedPrefixBinding();
    expect((prefs.saved[0] as { id: string }[]).map((b) => b.id)[0]).toBe("x");

    localStorage.clear();
    prefs.saved = [];
    prefs.customKeybindings = JSON.stringify([
      { ...prefixBinding(), combo: { ...prefixBinding().combo, key: "KeyB" } },
    ]);
    await seedPrefixBinding();
    expect(prefs.saved).toHaveLength(0);
  });

  it("does not add it back after the user removed it on this device", async () => {
    await seedPrefixBinding();
    prefs.customKeybindings = "[]";
    prefs.saved = [];
    await seedPrefixBinding();
    expect(prefs.saved).toHaveLength(0);
    expect(hasPrefixBinding([])).toBe(false);
  });
});
