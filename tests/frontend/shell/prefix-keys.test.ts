import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  commandForKey,
  installPrefixKeys,
  isDefaultPrefix,
  isModifierOnly,
  prefix,
  PREFIX_KEY_HELP,
  PREFIX_TIMEOUT_MS,
  type PrefixCommand,
} from "../../../src/frontend/shell/prefix-keys";

const key = (k: string, mods: Partial<KeyboardEvent> = {}) => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...mods,
});

function press(init: KeyboardEventInit) {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  document.body.dispatchEvent(event);
  return event;
}

describe("commandForKey", () => {
  it.each<[string, PrefixCommand]>([
    ["%", { kind: "split", edge: "right" }],
    ["|", { kind: "split", edge: "right" }],
    ['"', { kind: "split", edge: "bottom" }],
    ["-", { kind: "split", edge: "bottom" }],
    ["ArrowLeft", { kind: "focus", direction: "left" }],
    ["l", { kind: "focus", direction: "right" }],
    ["k", { kind: "focus", direction: "up" }],
    ["j", { kind: "focus", direction: "down" }],
    ["z", { kind: "zoom" }],
    ["x", { kind: "closePane" }],
    ["=", { kind: "equalize" }],
    ["c", { kind: "palette" }],
    [":", { kind: "palette" }],
    [" ", { kind: "palette" }],
    ["n", { kind: "nextTab" }],
    ["p", { kind: "prevTab" }],
    ["Tab", { kind: "lastTab" }],
    ["3", { kind: "jump", index: 2 }],
    [",", { kind: "rename" }],
    ["s", { kind: "statusBar" }],
    ["?", { kind: "help" }],
  ])("maps %s", (k, command) => {
    expect(commandForKey(key(k))).toEqual(command);
  });

  it("ignores unknown keys and keys with Ctrl, except arrows", () => {
    expect(commandForKey(key("q"))).toBeNull();
    expect(commandForKey(key("0"))).toBeNull();
    expect(commandForKey(key("z", { ctrlKey: true }))).toBeNull();
    expect(commandForKey(key("ArrowUp", { ctrlKey: true }))).toEqual({
      kind: "focus",
      direction: "up",
    });
  });

  it("knows the default prefix and lone modifiers", () => {
    const ctrlSpace = new KeyboardEvent("keydown", {
      code: "Space",
      key: " ",
      ctrlKey: true,
    });
    expect(isDefaultPrefix(ctrlSpace)).toBe(true);
    expect(
      isDefaultPrefix(
        new KeyboardEvent("keydown", {
          code: "Space",
          ctrlKey: true,
          shiftKey: true,
        }),
      ),
    ).toBe(false);
    expect(isModifierOnly({ key: "Shift" })).toBe(true);
    expect(isModifierOnly({ key: "%" })).toBe(false);
  });

  it("has help for every key group", () => {
    expect(PREFIX_KEY_HELP.length).toBeGreaterThan(10);
  });
});

describe("prefix store and keys", () => {
  let remove: () => void;
  let overridden = false;
  const runner = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    overridden = false;
    runner.mockReset();
    prefix.setRunner(runner);
    remove = installPrefixKeys(() => overridden);
  });

  afterEach(() => {
    remove();
    prefix.setRunner(null);
    prefix.setSink(null);
    vi.useRealTimers();
  });

  it("arms on Ctrl+Space and runs the next key", () => {
    const first = press({ code: "Space", key: " ", ctrlKey: true });
    expect(first.defaultPrevented).toBe(true);
    expect(prefix.isArmed()).toBe(true);
    press({ key: "Shift" });
    expect(prefix.isArmed()).toBe(true);
    const second = press({ key: "%", shiftKey: true });
    expect(second.defaultPrevented).toBe(true);
    expect(prefix.isArmed()).toBe(false);
    expect(runner).toHaveBeenCalledWith({ kind: "split", edge: "right" });
  });

  it("cancels on Escape, on an unknown key and after the timeout", () => {
    press({ code: "Space", key: " ", ctrlKey: true });
    press({ key: "Escape" });
    expect(prefix.isArmed()).toBe(false);

    press({ code: "Space", key: " ", ctrlKey: true });
    press({ key: "q" });
    expect(prefix.isArmed()).toBe(false);

    press({ code: "Space", key: " ", ctrlKey: true });
    vi.advanceTimersByTime(PREFIX_TIMEOUT_MS + 10);
    expect(prefix.isArmed()).toBe(false);
    expect(runner).not.toHaveBeenCalled();
  });

  it("leaves Ctrl+Space alone once the user rebound it", () => {
    overridden = true;
    const event = press({ code: "Space", key: " ", ctrlKey: true });
    expect(event.defaultPrevented).toBe(false);
    expect(prefix.isArmed()).toBe(false);
  });

  it("does nothing while no layout is on screen", () => {
    prefix.setRunner(null);
    press({ code: "Space", key: " ", ctrlKey: true });
    expect(prefix.isArmed()).toBe(false);
  });

  it("holds focus in the sink while armed and gives it back", () => {
    const input = document.createElement("input");
    const sink = document.createElement("span");
    sink.tabIndex = -1;
    document.body.append(input, sink);
    prefix.setSink(sink);
    input.focus();
    prefix.arm();
    expect(document.activeElement).toBe(sink);
    prefix.press({ kind: "zoom" });
    expect(document.activeElement).toBe(input);
    input.remove();
    sink.remove();
  });

  it("skips the keybinding recorder", () => {
    const recorder = document.createElement("div");
    recorder.setAttribute("data-keybinding-recorder", "");
    document.body.append(recorder);
    recorder.dispatchEvent(
      new KeyboardEvent("keydown", {
        code: "Space",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(prefix.isArmed()).toBe(false);
    recorder.remove();
  });
});
