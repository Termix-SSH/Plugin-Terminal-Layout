import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  ServerStatusProvider,
  ShellControllerProvider,
  TabPortals,
  setPermissionsForTesting,
} from "@termix-ssh/plugin-sdk/testing-host";

vi.mock("@termix-ssh/plugin-sdk/frontend", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => key, language: "en" }),
}));
vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { TerminalLayout } from "../../../src/frontend/layout/TerminalLayout";
import { prefix } from "../../../src/frontend/shell/prefix-keys";
import { focusedHost, tabTitle } from "../../../src/frontend/layout/StatusBar";
import { barTabs } from "../../../src/frontend/layout/use-layout-commands";
import type { Tab } from "@termix-ssh/plugin-sdk/ui";

// The shell keeps polling after unmount; its late logs would reach a closed worker.
for (const level of ["log", "info", "warn", "error", "debug"] as const) {
  console[level] = () => {};
}

beforeEach(() => {
  localStorage.clear();
  setPermissionsForTesting([], true);
});
afterEach(cleanup);

function renderLayout() {
  return render(
    <ServerStatusProvider isAuthenticated>
      <ShellControllerProvider username="admin" onLogout={() => {}}>
        <TerminalLayout />
        <TabPortals />
      </ShellControllerProvider>
    </ServerStatusProvider>,
  );
}

describe("TerminalLayout", () => {
  it("draws the status bar and the start screen with nothing open", async () => {
    renderLayout();
    expect(
      await screen.findByRole("navigation", { name: "terminalLayout.tabs" }),
    ).toBeTruthy();
    expect(screen.getByText("terminalLayout.noTabs")).toBeTruthy();
    expect(screen.getByText("terminalLayout.empty.palette")).toBeTruthy();
    expect(screen.getByLabelText("terminalLayout.openPalette")).toBeTruthy();
  });

  it("shows the prefix in the status bar while armed", async () => {
    renderLayout();
    await screen.findByText("termix");
    act(() => {
      prefix.arm();
    });
    expect(screen.getByText("terminalLayout.prefix")).toBeTruthy();
    act(() => prefix.cancel());
    expect(screen.queryByText("terminalLayout.prefix")).toBeNull();
  });

  it("opens and closes the key help with prefix ?", async () => {
    renderLayout();
    await screen.findByText("termix");
    act(() => {
      prefix.arm();
      prefix.press({ kind: "help" });
    });
    expect(
      screen.getByRole("region", { name: "terminalLayout.help.title" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByLabelText("terminalLayout.help.close"));
    expect(
      screen.queryByRole("region", { name: "terminalLayout.help.title" }),
    ).toBeNull();
  });

  it("hides the status bar with prefix s and remembers it", async () => {
    renderLayout();
    await screen.findByText("termix");
    act(() => {
      prefix.arm();
      prefix.press({ kind: "statusBar" });
    });
    await waitFor(() =>
      expect(
        screen.queryByRole("navigation", { name: "terminalLayout.tabs" }),
      ).toBeNull(),
    );
    expect(localStorage.getItem("terminal-layout.statusBar")).toBe("hidden");
    act(() => {
      prefix.arm();
      prefix.press({ kind: "statusBar" });
    });
    expect(
      screen.getByRole("navigation", { name: "terminalLayout.tabs" }),
    ).toBeTruthy();
  });

  it("stops taking prefix keys once unmounted", async () => {
    const { unmount } = renderLayout();
    await screen.findByText("termix");
    unmount();
    expect(prefix.arm()).toBe(false);
  });
});

describe("status bar helpers", () => {
  const t = (key: string) => key;
  const host = { id: "1", name: "web-01", ip: "10.0.0.1", username: "root" };

  it("names tabs by label, host or page", () => {
    expect(
      tabTitle(
        { id: "a", type: "terminal", label: "x", customLabel: "mine" } as Tab,
        t,
      ),
    ).toBe("mine");
    expect(
      tabTitle(
        { id: "a", type: "terminal", label: "x", host } as unknown as Tab,
        t,
      ),
    ).toBe("web-01");
    expect(tabTitle({ id: "a", type: "settings", label: "" } as Tab, t)).toBe(
      "tab.settings",
    );
  });

  it("finds the host in the focused pane", () => {
    const inner = {
      id: "t1",
      type: "terminal",
      label: "",
      host,
    } as unknown as Tab;
    const split = {
      id: "s",
      type: "split-screen",
      label: "Split 1",
      split: {
        focusedPaneId: "p2",
        root: {
          kind: "split",
          id: "r",
          direction: "row",
          sizes: [50, 50],
          children: [
            { kind: "pane", id: "p1", tabId: null },
            { kind: "pane", id: "p2", tabId: "t1" },
          ],
        },
      },
    } as unknown as Tab;
    expect(focusedHost(split, [inner, split])?.name).toBe("web-01");
    expect(focusedHost(inner, [inner])?.ip).toBe("10.0.0.1");
    expect(focusedHost(null, [])).toBeNull();
  });

  it("leaves the Home tab out of the bar", () => {
    expect(
      barTabs([
        { id: "d", type: "dashboard", label: "" },
        { id: "t", type: "terminal", label: "" },
      ] as Tab[]).map((tab) => tab.id),
    ).toEqual(["t"]);
  });
});
