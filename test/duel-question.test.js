import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { CARDS } from "../src/content.js";

/* The pre-cast question is generated from the script the player built, so it
   needs the same guarantees every time: the answer is one of the options, no
   option is a second defensible answer, and nothing comes from outside the
   script. These run against the real generator lifted out of App.jsx. */
const ui = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const from = ui.indexOf("const PY_WORDS");
const to = ui.indexOf("\n}\n", ui.indexOf("function askAboutScript")) + 3;
const mod = new Function(`${ui.slice(from, to)}; return { askAboutScript, nameMade, namesUsed };`)();
const { askAboutScript, nameMade, namesUsed } = mod;

const byId = Object.fromEntries(CARDS.map((c) => [c.id, c]));
function hand(size) {
  const ids = ["tomes", "reliquary", "ledger"];
  const pool = CARDS.map((c) => c.id).filter((x) => !ids.includes(x));
  while (ids.length < size) ids.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return ids.map((id) => ({ id })).sort((a, b) => byId[a.id].tier - byId[b.id].tier);
}

describe("the question before a cast", () => {
  it("always includes the answer among the options", () => {
    for (let i = 0; i < 300; i++) {
      const q = askAboutScript(hand(3 + (i % 5)), byId);
      expect(q.options, q.prompt).toContain(q.answer);
    }
  });

  it("only offers lines from the script the player built", () => {
    for (let i = 0; i < 300; i++) {
      const seq = hand(3 + (i % 5));
      const lines = seq.map((c) => byId[c.id].code);
      const q = askAboutScript(seq, byId);
      for (const o of q.options) expect(lines, `stray option: ${o}`).toContain(o);
    }
  });

  it("never repeats an option or shows the line being asked about", () => {
    for (let i = 0; i < 300; i++) {
      const q = askAboutScript(hand(3 + (i % 5)), byId);
      expect(new Set(q.options).size, q.prompt).toBe(q.options.length);
      if (q.subject) expect(q.options).not.toContain(q.subject);
    }
  });

  it("leaves exactly one defensible answer", () => {
    for (let i = 0; i < 500; i++) {
      const q = askAboutScript(hand(3 + (i % 5)), byId);
      const needs = (q.prompt.match(/needs (\w+)/) || [])[1];
      if (needs) {
        const rival = q.options.find((o) => o !== q.answer && nameMade(o) === needs);
        expect(rival, `${q.prompt} also answered by ${rival}`).toBeUndefined();
      }
      if (/breaks first/.test(q.prompt)) {
        const name = (q.why.match(/no (\w+) for/) || [])[1];
        const rival = q.options.find((o) => o !== q.answer && namesUsed(o).includes(name));
        expect(rival, `${q.prompt} also answered by ${rival}`).toBeUndefined();
      }
    }
  });

  it("always offers three options, so it is never a coin flip", () => {
    for (let i = 0; i < 300; i++) {
      const q = askAboutScript(hand(3 + (i % 5)), byId);
      expect(q.options.length, q.prompt).toBe(3);
    }
  });

  it("always explains itself", () => {
    for (let i = 0; i < 100; i++) {
      const q = askAboutScript(hand(3 + (i % 5)), byId);
      expect(q.why.length, q.prompt).toBeGreaterThan(10);
    }
  });
});
