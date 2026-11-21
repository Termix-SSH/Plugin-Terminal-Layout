import { afterEach, describe, expect, it } from "vitest";
import {
  renderWithApp,
  type RenderedPluginApp,
} from "@termix-ssh/plugin-sdk/testing";
import { getRegisteredLayout } from "@termix-ssh/plugin-sdk/testing-host";
import type { PluginManifest } from "@termix-ssh/plugin-sdk/manifest";
import * as plugin from "../../src/frontend/index";
import manifestJson from "../../manifest.json";
import locales from "../../locales/en.json";

const manifest = manifestJson as unknown as PluginManifest;

let rendered: RenderedPluginApp | null = null;

afterEach(async () => {
  await rendered?.deactivate();
  rendered = null;
});

describe(`${manifest.id} activate`, () => {
  it("registers the layout its manifest declares", async () => {
    rendered = await renderWithApp(plugin, { manifest, locales });
    const layout = getRegisteredLayout("terminal");
    expect(layout).toMatchObject({ id: "terminal", pluginId: manifest.id });
    expect(typeof layout?.component).toBe("function");
    expect(manifest.contributes?.layouts?.map((entry) => entry.id)).toEqual([
      "terminal",
    ]);
  });

  it("registers the Dashboard, Manage and Settings tab types", async () => {
    rendered = await renderWithApp(plugin, { manifest, locales });
    expect(rendered.registered.tabs().sort()).toEqual([
      "dashboard",
      "host-manager",
      "settings",
    ]);
  });

  it("registers the prefix as a keybinding people can rebind", async () => {
    rendered = await renderWithApp(plugin, { manifest, locales });
    expect(rendered.registered.keybindingActions()).toEqual([
      "terminal-layout.prefix",
    ]);
    expect(rendered.registered.keybindingDefaults()).toEqual([
      "terminal-layout.prefix",
    ]);
    expect(manifest.contributes?.keybindingActions).toEqual([
      { id: "terminal-layout.prefix" },
    ]);
  });

  it("takes over the appearance step", async () => {
    rendered = await renderWithApp(plugin, { manifest, locales });
    expect(rendered.registered.onboardingSteps().sort()).toEqual([
      "appearance",
    ]);
  });

  it("takes everything back when it is turned off", async () => {
    rendered = await renderWithApp(plugin, { manifest, locales });
    await rendered.deactivate();
    rendered = null;
    expect(getRegisteredLayout("terminal")).toBeUndefined();
  });

  it("is a layout plugin that declares every tab it registers", () => {
    expect(manifest.capabilities).toContain("ui:layout");
    expect(manifest.contributes?.tabs?.map((tab) => tab.id).sort()).toEqual([
      "dashboard",
      "host-manager",
      "settings",
    ]);
  });
});
