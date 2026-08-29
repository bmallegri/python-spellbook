// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import App from "../src/App.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host;
const render = async () => {
  host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(React.createElement(App)));
  return root;
};
const find = (sel) => [...host.querySelectorAll(sel)];
const button = (text) => find("button").find((b) => b.textContent.trim() === text);
const click = async (el) => act(async () => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
const text = () => host.textContent;

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
});

describe("the app", () => {
  it("mounts and shows the title", async () => {
    await render();
    expect(text()).toContain("Python Spellbook");
  });

  it("opens every mode without crashing", async () => {
    await render();
    for (const mode of ["Working World", "Spell Duel", "Flash Cards", "Your Standing", "Story Mode"]) {
      await click(button(mode));
      expect(text().length, `${mode} rendered empty`).toBeGreaterThan(400);
    }
  });

  it("names spells after the Python they teach", async () => {
    await render();
    expect(text()).toContain("Variables");
    expect(text()).toContain("Control Flow");
  });
});

describe("a spell page", () => {
  it("shows all four memory hooks and deals its tokens", async () => {
    await render();
    await click(find("button.page-card").find((b) => !b.disabled));
    for (const hook of ["SAY IT", "REMEMBER IT", "REACH FOR IT WHEN", "WATCH FOR"]) {
      expect(text(), `missing ${hook}`).toContain(hook);
    }
    expect(find("button.rune").length).toBeGreaterThan(0);
  });

  it("keeps a spell locked until its prerequisite is inscribed", async () => {
    await render();
    const locked = find("button.page-card").filter((b) => b.disabled);
    expect(locked.length).toBeGreaterThan(0);
  });
});

describe("the duel", () => {
  it("starts, deals a hand, and runs the script", async () => {
    await render();
    await click(button("Spell Duel"));
    await click(find("button").find((b) => b.textContent.includes("Begin the Duel")));
    expect(text()).toContain("THE SCRIPT");

    const hand = find('[role="button"]');
    expect(hand.length).toBeGreaterThan(0);
    await click(hand[0]);
    await click(button("RUN"));
    expect(text()).toContain("WHAT IT DID");
  });

  // the forced-output branch only fires on some draws, so this needs repeating
  it("survives many openings without a crash", async () => {
    const errors = [];
    const original = console.error;
    console.error = (...args) => errors.push(args.map(String).join(" "));
    for (let i = 0; i < 12; i++) {
      localStorage.clear();
      document.body.innerHTML = "";
      const root = await render();
      await click(button("Spell Duel"));
      const begin = find("button").find((b) => b.textContent.includes("Begin the Duel"));
      if (begin) await click(begin);
      await act(async () => root.unmount());
    }
    console.error = original;
    const real = errors.filter((e) => /ReferenceError|is not defined|is not a function/.test(e));
    expect(real, real[0]).toHaveLength(0);
  }, 20000);
});

describe("the flash cards", () => {
  it("says the deck is empty before anything is inscribed", async () => {
    await render();
    await click(button("Flash Cards"));
    expect(text()).toContain("Nothing to turn over yet");
    expect(text()).toContain("COMING SOON");
  });

  it("deals a card once a spell is inscribed", async () => {
    await render();
    localStorage.setItem("spellbook.save.v1", JSON.stringify({ inscribed: { varibuddy: true } }));
    document.body.innerHTML = "";
    await render();
    await click(button("Flash Cards"));
    expect(text()).toContain("Variables");
    expect(text()).toContain("TURN IT OVER");
    expect(text()).toContain("1 / 1");
  });
});

describe("saving", () => {
  it("writes progress under the current key", async () => {
    await render();
    await click(find("button.page-card").find((b) => !b.disabled));
    expect(localStorage.getItem("spellbook.save.v1")).toBeTruthy();
  });
});
