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
    expect(text()).toContain("Inscribe a spell");
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

describe("rating a card", () => {
  const seeded = () => localStorage.setItem("spellbook.save.v1",
    JSON.stringify({ inscribed: { varibuddy: true, condifork: true } }));

  it("only offers a grading once the card is turned over", async () => {
    seeded();
    await render();
    await click(button("Flash Cards"));
    expect(text()).toContain("Turn it over, then say how it went");
    expect(button("Easy")).toBeUndefined();
    await click(button("Flip"));
    expect(button("Easy")).toBeTruthy();
  });

  it("keeps the grading, the count and the last one", async () => {
    seeded();
    await render();
    await click(button("Flash Cards"));
    await click(button("Flip"));
    await click(button("Shaky"));
    const saved = JSON.parse(localStorage.getItem("spellbook.save.v1"));
    expect(saved.reviews.varibuddy).toMatchObject({ last: "shaky", seen: 1, shaky: 1, easy: 0 });
  });

  it("moves on to the next card once graded", async () => {
    seeded();
    await render();
    await click(button("Flash Cards"));
    expect(text()).toContain("1 / 2");
    await click(button("Flip"));
    await click(button("Easy"));
    expect(text()).toContain("2 / 2");
  });

  // the save is written from Spellbook, which holds every key. Written from
  // inside a mode it would drop the keys that mode cannot see.
  it("does not lose ratings when another mode saves", async () => {
    seeded();
    await render();
    await click(button("Flash Cards"));
    await click(button("Flip"));
    await click(button("Easy"));
    await click(button("Story Mode"));
    await click(find("button.page-card").find((b) => !b.disabled));
    const saved = JSON.parse(localStorage.getItem("spellbook.save.v1"));
    expect(saved.reviews.varibuddy, "a spell page wiped the ratings").toBeTruthy();
  });
});

describe("when a card comes back", () => {
  it("pushes an easy card out and brings a lost one back today", async () => {
    localStorage.setItem("spellbook.save.v1",
      JSON.stringify({ inscribed: { varibuddy: true, condifork: true } }));
    await render();
    await click(button("Flash Cards"));
    await click(button("Flip"));
    await click(button("Easy"));
    await click(button("Flip"));
    await click(button("Lost"));
    const r = JSON.parse(localStorage.getItem("spellbook.save.v1")).reviews;
    expect(r.varibuddy.due, "easy should wait a day").toBeGreaterThan(r.varibuddy.at);
    expect(r.condifork.due, "lost should come round again today").toBe(r.condifork.at);
    expect(r.varibuddy.step).toBe(1);
    expect(r.condifork.step).toBe(0);
  });

  it("keeps a card that is not due out of the due pile", async () => {
    const now = Date.now();
    localStorage.setItem("spellbook.save.v1", JSON.stringify({
      inscribed: { varibuddy: true, condifork: true },
      reviews: { varibuddy: { last: "easy", seen: 1, easy: 1, shaky: 0, lost: 0, step: 3, at: now, due: now + 7 * 86400000 } },
    }));
    await render();
    await click(button("Flash Cards"));
    expect(text(), "only the unseen card is due").toContain("1 / 1");
    await click(button("Whole deck"));
    expect(text(), "the whole deck still holds both").toContain("1 / 2");
  });

  it("rests once nothing is due", async () => {
    const now = Date.now();
    localStorage.setItem("spellbook.save.v1", JSON.stringify({
      inscribed: { varibuddy: true },
      reviews: { varibuddy: { last: "easy", seen: 1, easy: 1, shaky: 0, lost: 0, step: 2, at: now, due: now + 3 * 86400000 } },
    }));
    await render();
    await click(button("Flash Cards"));
    expect(text()).toContain("Nothing due");
    expect(button("Go through the whole deck")).toBeTruthy();
  });
});

describe("writing the line from memory", () => {
  const type = async (el, value) => act(async () => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const sheet = () => find("textarea")[0];

  const open = async () => {
    localStorage.setItem("spellbook.save.v1", JSON.stringify({ inscribed: { varibuddy: true } }));
    await render();
    await click(button("Flash Cards"));
    await click(button("Write it"));
  };

  it("holds the back shut until the line is right", async () => {
    await open();
    await type(sheet(), "hero = 'nope'");
    await click(button("Check"));
    expect(text()).toContain("Not that line");
    expect(button("Easy"), "the back opened on a wrong line").toBeUndefined();
  });

  it("opens the back on the right line, forgiving the whitespace", async () => {
    await open();
    await type(sheet(), 'hero   =  "Luna"\n   level = 7\nprint(f"{hero} reached level {level}")');
    await click(button("Check"));
    expect(button("Easy"), "the right line should open the back").toBeTruthy();
  });

  it("offers no Flip button to walk around the check", async () => {
    await open();
    expect(button("Flip"), "Flip bypassed the writing check").toBeUndefined();
  });

  it("still lets you ask to be shown", async () => {
    await open();
    await click(button("Show me"));
    expect(button("Easy")).toBeTruthy();
  });
});

describe("a run of ten", () => {
  it("ends and says to stop", async () => {
    localStorage.setItem("spellbook.save.v1",
      JSON.stringify({ inscribed: { varibuddy: true, condifork: true } }));
    await render();
    await click(button("Flash Cards"));
    await click(button("A run of ten"));
    expect(text()).toContain("0 / 2 done");
    for (let i = 0; i < 2; i++) {
      await click(button("Flip"));
      await click(button("Easy"));
    }
    expect(text()).toContain("That is your ten");
    expect(text()).toContain("Stopping here is the point");
  });

  it("never deals more than ten at once", async () => {
    const inscribed = {};
    for (const s of ["varibuddy", "condifork", "listling", "comprehendra", "functo",
                     "trycatchu", "mirrorrite", "nestedra", "argstar", "lambdaux", "sortkey"]) inscribed[s] = true;
    localStorage.setItem("spellbook.save.v1", JSON.stringify({ inscribed }));
    await render();
    await click(button("Flash Cards"));
    await click(button("A run of ten"));
    expect(text()).toContain("0 / 10 done");
  });
});

describe("the standing readout", () => {
  // it used to filter on the display label, so renaming the label silently
  // emptied the row and it claimed everything had come out solid
  it("lists a spell that held only after a lot of friction", async () => {
    localStorage.setItem("spellbook.save.v1", JSON.stringify({
      inscribed: { varibuddy: true },
      misdraws: { varibuddy: 7 },
    }));
    await render();
    await click(button("Your Standing"));
    expect(text()).toContain("Solid, with friction");
    expect(text(), "a friction spell was treated as nothing to report")
      .not.toContain("Everything with a reading came out solid");
  });

  it("still says so when everything really is clean", async () => {
    localStorage.setItem("spellbook.save.v1",
      JSON.stringify({ inscribed: { varibuddy: true }, misdraws: {} }));
    await render();
    await click(button("Your Standing"));
    expect(text()).toContain("Everything with a reading came out solid");
  });
});

describe("the recall ledger", () => {
  const D = 86400000;

  it("says nothing is rated before any card is graded", async () => {
    localStorage.setItem("spellbook.save.v1",
      JSON.stringify({ inscribed: { varibuddy: true } }));
    await render();
    await click(button("Your Standing"));
    expect(text()).toContain("The Deck");
    expect(text()).toContain("No cards rated yet");
  });

  it("counts what is holding against what is slipping", async () => {
    const n = Date.now();
    localStorage.setItem("spellbook.save.v1", JSON.stringify({
      inscribed: { varibuddy: true, condifork: true, listling: true },
      reviews: {
        varibuddy: { last: "easy", seen: 3, easy: 3, shaky: 0, lost: 0, step: 3, at: n, due: n + 7 * D },
        condifork: { last: "lost", seen: 4, easy: 0, shaky: 1, lost: 3, step: 0, at: n, due: n },
      },
    }));
    await render();
    await click(button("Your Standing"));
    expect(text(), "two of three cards rated").toContain("2/3");
    expect(text(), "the lost card should be named").toContain("Control Flow");
    expect(text()).toContain("What keeps slipping");
  });

  it("says so when nothing is slipping", async () => {
    const n = Date.now();
    localStorage.setItem("spellbook.save.v1", JSON.stringify({
      inscribed: { varibuddy: true },
      reviews: { varibuddy: { last: "easy", seen: 2, easy: 2, shaky: 0, lost: 0, step: 2, at: n, due: n + 3 * D } },
    }));
    await render();
    await click(button("Your Standing"));
    expect(text()).toContain("Nothing is slipping");
  });
});

describe("saving", () => {
  it("writes progress under the current key", async () => {
    await render();
    await click(find("button.page-card").find((b) => !b.disabled));
    expect(localStorage.getItem("spellbook.save.v1")).toBeTruthy();
  });
});
