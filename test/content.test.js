import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { SCHOOL, WORK_SCHOOL, SCHOOL_INK } from "../src/content.js";

const src = readFileSync(new URL("../src/content.js", import.meta.url), "utf8");
const ui = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const both = src + ui;

function array(name) {
  const start = src.indexOf(`const ${name} = [`);
  return src.slice(start, src.indexOf("\n];", start));
}
function entries(name) {
  return array(name)
    .split(/\n {2}\{ id: "/)
    .slice(1)
    .map((chunk) => {
      const field = (f) => (chunk.match(new RegExp(`${f}: "((?:[^"\\\\]|\\\\.)*)"`)) || [])[1];
      return {
        id: chunk.slice(0, chunk.indexOf('"')),
        name: field("name"),
        real: field("real"),
        school: field("school"),
        from: field("from"),
        say: field("say"),
        image: field("image"),
        when: field("when"),
        mission: field("mission"),
        gotcha: field("gotcha"),
        raw: chunk,
      };
    });
}

const SPELL = entries("SPELL");
const WORK = entries("WORK");
const CARDS = entries("CARDS");
const ALL = [...SPELL, ...WORK];

describe("spell data", () => {
  it("has the expected number of entries", () => {
    expect(SPELL).toHaveLength(37);
    expect(WORK).toHaveLength(33);
    expect(CARDS).toHaveLength(27);
  });

  it("gives every spell all four memory hooks", () => {
    for (const s of ALL) {
      expect(s.say, `${s.id} say`).toBeTruthy();
      expect(s.image, `${s.id} image`).toBeTruthy();
      expect(s.when, `${s.id} when`).toBeTruthy();
      expect(s.gotcha, `${s.id} gotcha`).toBeTruthy();
    }
  });

  it("gives every spell an Apprentice Task", () => {
    for (const s of ALL) expect(s.mission, `${s.id} mission`).toBeTruthy();
  });

  it("uses unique ids within each track", () => {
    for (const [label, list] of [["SPELL", SPELL], ["WORK", WORK], ["CARDS", CARDS]]) {
      const ids = list.map((s) => s.id);
      expect(new Set(ids).size, `${label} has duplicate ids`).toBe(ids.length);
    }
  });

  it("points every prerequisite at a spell that exists", () => {
    const spellIds = new Set(SPELL.map((s) => s.id));
    for (const s of SPELL) if (s.from) expect(spellIds.has(s.from), `${s.id} from ${s.from}`).toBe(true);
  });

  // the Working World gates every spell on a Story Mode one, and the locked card looks
  // the name up in spellById, which only holds SPELL. A trade-to-trade link crashes it.
  it("gates every trade spell on a story spell", () => {
    const spellIds = new Set(SPELL.map((s) => s.id));
    for (const s of WORK) {
      expect(s.from, `${s.id} has no prerequisite`).toBeTruthy();
      expect(spellIds.has(s.from), `${s.id} points at ${s.from}, which is not a story spell`).toBe(true);
    }
  });

  it("never makes a spell its own prerequisite", () => {
    for (const s of ALL) expect(s.from, s.id).not.toBe(s.id);
  });

  it("keeps names short, since long ones break the card layout", () => {
    for (const s of [...ALL, ...CARDS]) {
      expect(s.name.split(" ").length, `${s.id} name "${s.name}"`).toBeLessThanOrEqual(3);
    }
  });

  it("never repeats a card's name in its own description", () => {
    for (const c of CARDS) {
      const flat = (x) => x.toLowerCase().replace(/[^a-z]/g, "");
      expect(flat(c.name), `card ${c.id}`).not.toBe(flat(c.real));
    }
  });
});

describe("worked examples", () => {
  const hands = (block) => {
    const start = src.indexOf(`const ${block} = {`);
    const body = src.slice(start, src.indexOf("\n};", start));
    const out = {};
    for (const m of body.matchAll(/\n {2}(\w+): \[([\s\S]*?)\n {2}\],/g)) {
      out[m[1]] = [...m[2].matchAll(/\{ ctx:/g)].length;
    }
    return out;
  };

  it("gives every story spell exactly three worked examples", () => {
    const h = hands("SPELL_HANDS");
    for (const s of SPELL) expect(h[s.id], `${s.id} hands`).toBe(3);
  });

  it("gives every trade spell exactly three worked examples", () => {
    const h = hands("TRADE_HANDS");
    for (const s of WORK) expect(h[s.id], `${s.id} hands`).toBe(3);
  });
});

describe("labyrinths", () => {
  it("only asks for spells that exist", () => {
    const spellIds = new Set(SPELL.map((s) => s.id));
    const block = array("LABYRINTH");
    for (const m of block.matchAll(/team: \[([^\]]*)\]/g)) {
      for (const id of m[1].match(/"(\w+)"/g).map((x) => x.replace(/"/g, ""))) {
        expect(spellIds.has(id), `labyrinth needs missing spell ${id}`).toBe(true);
      }
    }
  });
});

describe("the four inks", () => {
  it("keeps the palette to four", () => {
    expect(new Set(Object.values(SCHOOL_INK)).size).toBe(4);
  });

  it("gives every school one of them", () => {
    const inks = new Set(Object.values(SCHOOL_INK));
    for (const [key, sc] of Object.entries({ ...SCHOOL, ...WORK_SCHOOL })) {
      expect(inks.has(sc.color), `${key} is off the palette`).toBe(true);
    }
  });

  // one flat colour is what made "standing by school" unreadable
  it("spreads the story schools across all four", () => {
    expect(new Set(Object.values(SCHOOL).map((s) => s.color)).size).toBe(4);
  });

  it("pairs the eight trade schools two to an ink", () => {
    const used = Object.values(WORK_SCHOOL).map((s) => s.color);
    for (const ink of Object.values(SCHOOL_INK)) {
      expect(used.filter((c) => c === ink), `${ink} pairing`).toHaveLength(2);
    }
  });
});

describe("house vocabulary", () => {
  // smudged, forming, inscribed. Three states, three words, both tracks.
  it("uses no retired status word", () => {
    for (const word of ['"KNOWN"', '"INKED"', '"SHUT"']) {
      expect(ui.includes(word), `${word} is retired`).toBe(false);
    }
  });

  it("says all three in the interface", () => {
    for (const word of ['"SMUDGED"', '"FORMING"', '"INSCRIBED"']) {
      expect(ui.includes(word), `${word} missing`).toBe(true);
    }
  });
});

describe("house style", () => {
  it("uses no em or en dashes", () => {
    expect(both.includes("\u2014"), "em dash").toBe(false);
    expect(both.includes("\u2013"), "en dash").toBe(false);
  });

  it("uses no emoji or symbol glyphs in the interface", () => {
    const stray = [...both].filter(
      (ch) => ch.codePointAt(0) >= 0x2010 && ch.codePointAt(0) <= 0x2bff && !"\u2018\u2019\u201c\u201d\u2026".includes(ch)
    );
    expect(stray, `found ${stray.join(" ")}`).toHaveLength(0);
  });
});
