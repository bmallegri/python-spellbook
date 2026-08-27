import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  INK, INSCRIBED_INK, FORMING_INK, stateInk,
  SCHOOL, SPELL, LABYRINTH, RANKS, ACTS, LAB_NOTE, SPELL_HANDS,
  TIERS, CARDS, ENEMIES, WORK_SCHOOL, WORK, TRADE_HANDS,
} from "./content.js";

const GRAIN_CSS = `.ground { background-color: #e7e3d9; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/></filter><rect width='160' height='160' filter='url(%23g)' opacity='0.055'/></svg>"); }`;

// one thin brass scrollbar everywhere, so the page and the modals match
const SCROLL_CSS = `
  * { scrollbar-width: thin; scrollbar-color: ${INK.brass} transparent; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${INK.brass}; border-radius: 99px; }
`;

const SAVE_KEY = "spellbook.save.v1";
// throws in private mode, returns junk after a failed write
function readGrimoire() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; }
}
function writeGrimoire(state) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* private mode or quota */ }
}
function burnGrimoire() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* private mode or quota */ }
}

const spellById = Object.fromEntries(SPELL.map((s) => [s.id, s]));
const pageNo = (id) => String(SPELL.findIndex((s) => s.id === id) + 1).padStart(2, "0");

function shuffled(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (n > 1 && a.every((v, i) => v === i)) [a[0], a[1]] = [a[1], a[0]];
  return a;
}

function Grimoire({ inscribed, setInscribed, cleared, setCleared, misdraws, setMisdraws }) {
  const [openSpell, setOpenSpell] = useState(null);
  const [filter, setFilter] = useState("all");
  const [celebrate, setCelebrate] = useState(null);
  const [openCode, setOpenCode] = useState(null);

  const [trayOrder, setTrayOrder] = useState([]);
  const [laid, setLaid] = useState([]);
  const [reveal, setReveal] = useState(false);
  const [fizzle, setFizzle] = useState(false);
  const [justCast, setJustCast] = useState(false);
  const [handIdx, setHandIdx] = useState(0);
  const [heldFlash, setHeldFlash] = useState(false);

  const inked = useMemo(() => new Set(Object.keys(inscribed).filter((k) => inscribed[k])), [inscribed]);
  const count = inked.size;
  const pct = Math.round((count / SPELL.length) * 100);
  const rank = RANKS.find(([n]) => count >= n)[1];

  const revealed = (s) => !s.from || inked.has(s.from);
  const stateOf = (s) => (!revealed(s) ? "locked" : inked.has(s.id) ? "inscribed" : "seen");

  // shuffle once per open, not per render
  useEffect(() => {
    if (!openSpell) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setHandIdx(0); setHeldFlash(false);
    setTrayOrder(shuffled(SPELL_HANDS[openSpell][0].runes.length));
    setLaid([]); setReveal(false); setFizzle(false); setJustCast(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [openSpell]);

  useEffect(() => {
    if (!celebrate) return;
    const t = setTimeout(() => setCelebrate(null), 1500);
    return () => clearTimeout(t);
  }, [celebrate]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setOpenSpell(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { writeGrimoire({ inscribed, cleared, misdraws }); }, [inscribed, cleared, misdraws]);

  const resetProgress = () => {
    if (!window.confirm("Strip every page back to blank and begin again?")) return;
    setInscribed({}); setCleared({}); setMisdraws({});
    setOpenSpell(null);
    burnGrimoire();
  };

  const placeRune = (idx) => { if (laid.includes(idx)) return; setFizzle(false); setLaid((p) => [...p, idx]); };
  const liftRune = (idx) => setLaid((p) => p.filter((x) => x !== idx));
  const clearTrace = () => { setLaid([]); setFizzle(false); };

  const castSpell = () => {
    const hands = SPELL_HANDS[openSpell];
    const thisHand = hands[handIdx];
    const correct = laid.length === thisHand.runes.length && laid.every((v, i) => thisHand.runes[v] === thisHand.runes[i]);
    if (!correct) { setMisdraws((m) => ({ ...m, [openSpell]: (m[openSpell] || 0) + 1 })); setFizzle(true); setTimeout(() => setFizzle(false), 600); return; }
    setFizzle(false);
    if (handIdx + 1 < hands.length) {
      const ni = handIdx + 1;
      setHandIdx(ni);
      setTrayOrder(shuffled(hands[ni].runes.length));
      setLaid([]); setReveal(false);
      setHeldFlash(true); setTimeout(() => setHeldFlash(false), 1100);
    } else {
      setInscribed((m) => ({ ...m, [openSpell]: true }));
      setJustCast(true);
    }
  };
  const erase = (id) => { setInscribed((m) => ({ ...m, [id]: false })); if (id === openSpell) { setHandIdx(0); setTrayOrder(shuffled(SPELL_HANDS[id][0].runes.length)); setLaid([]); setJustCast(false); } };

  const canEnter = (l) => l.team.every((id) => inked.has(id));
  const enter = (l) => { if (!canEnter(l) || cleared[l.id]) return; setCleared((x) => ({ ...x, [l.id]: true })); setCelebrate(l.id); };

  const onThePage = SPELL.filter((s) => filter === "all" || s.school === filter);

  return (
    <div className="ground" style={{
      color: INK.text, minHeight: "100vh",
      fontFamily: "'Vollkorn', Georgia, serif",
      padding: "clamp(14px, 3.5vw, 34px)",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vollkorn:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .arc { font-family: 'Vollkorn', Georgia, serif; letter-spacing: .2px; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .ground { background-color: ${INK.ink}; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/></filter><rect width='160' height='160' filter='url(%23g)' opacity='0.055'/></svg>"); }
        * { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; }
        .page-card { transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease; }
        .page-card:hover { transform: none; border-color: ${INK.candle}; }
        .page-card:focus-visible, .chip:focus-visible, .rune:focus-visible, .btn:focus-visible { outline: 2px solid ${INK.verdigris}; outline-offset: 2px; }
        @keyframes floaty { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-3px) } }
        @keyframes shakeX { 0%,100%{ transform: translateX(0) } 20%{ transform: translateX(-6px) } 40%{ transform: translateX(6px) } 60%{ transform: translateX(-4px) } 80%{ transform: translateX(4px) } }
        @keyframes ignite { 0%{ transform: scale(.4); opacity:0; filter: grayscale(1) } 60%{ transform: scale(1.15); filter: grayscale(0) } 100%{ transform: scale(1); opacity:1 } }
        @keyframes fadein { from{ opacity:0; transform: translateY(8px) } to{ opacity:1; transform: none } }
        .floaty { animation: floaty 3.6s ease-in-out infinite; }
        .fizzle { animation: shakeX .5s ease; }
        .ignite { animation: ignite .5s ease; }
        .fadein { animation: fadein .5s ease; }
        @media (prefers-reduced-motion: reduce){ .floaty,.fizzle,.ignite,.fadein{ animation:none } .page-card:hover{ transform:none } }
        .codeleaf { background: ${INK.vellum} !important; color: ${INK.vellumInk} !important; border: 1px solid ${INK.vellumEdge} !important; border-left: 3px solid ${INK.candle} !important; border-radius: 1px !important; box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 1px 0 rgba(0,0,0,0.35); }
        .codeleaf::selection, .codeleaf *::selection { background: ${INK.candle}55; }
        .rune { border-radius: 1px !important; }
        .page-card { border-radius: 2px 2px 2px 14px !important; position: relative; }
        .page-card::before { content: ""; position: absolute; left: 6px; top: 10px; bottom: 10px; width: 1px; background: ${INK.candle}26; }
        .leaf-grid > *:nth-child(4n+3) { margin-top: 16px; }
        .leaf-grid > *:nth-child(7n+5) { border-radius: 2px 14px 2px 2px !important; }
        .leaf-grid > *:nth-child(7n+5)::before { left: auto; right: 6px; }
        .leafsheet { background-image: repeating-linear-gradient(180deg, transparent 0 21px, ${INK.candle}14 21px 22px); }
      `}</style>

      <div style={{ maxWidth: 1060, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div className="arc" style={{ fontSize: "clamp(28px,5vw,44px)", fontWeight: 700, lineHeight: 1, display: "flex", alignItems: "center", gap: 12 }}>
              Python Spellbook
            </div>
            <div style={{ color: INK.dim, fontSize: 15, marginTop: 8, maxWidth: 680, lineHeight: 1.45 }}>
              Learn a spell, put its tokens in order to inscribe it, and a full kit opens a Labyrinth.
              A page only fills in once you've put it in order three times, in three different contexts.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <button className="btn" onClick={resetProgress} title="Erase progress and start over" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13.5, color: INK.faint, border: `1px solid ${INK.line}`, borderRadius: 99, padding: "6px 14px", fontFamily: "'Vollkorn', Georgia, serif" }}>
                Reset
              </button>
            </div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div className="arc" style={{ fontSize: 12, color: INK.faint }}>GRIMOIRE FILLED</div>
            <div className="arc" style={{ fontSize: 32, fontWeight: 700, color: INK.candle }}>{pct}%</div>
            <div className="arc" style={{ fontSize: 13, color: INK.dim }}>{count}/{SPELL.length} spells · {rank}</div>
          </div>
        </div>

        <div style={{ background: INK.page, border: `1px solid ${INK.line}`, borderRadius: 3, padding: 14, marginTop: 18 }}>
          <div style={{ height: 9, background: INK.ink, borderRadius: 99, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: INK.candle, transition: "width .4s ease" }} />
          </div>
        </div>

        <div className="arc" style={{ fontSize: 22, fontWeight: 700, marginTop: 28, display: "flex", alignItems: "center", gap: 10 }}>
          Your Spellbook
          <span style={{ fontSize: 14, color: INK.faint, fontStyle: "italic", fontFamily: "'Vollkorn', Georgia, serif", letterSpacing: 0 }}>
           Smudged pages clear once you inscribe the spell they came from.
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <button className="chip" onClick={() => setFilter("all")} style={chipStyle(filter === "all", INK.text)}>All Schools</button>
          {Object.entries(SCHOOL).map(([k, sc]) => {
            const act = ACTS.find((a) => a.school === k);
            return (
              <button key={k} className="chip" onClick={() => setFilter(k)} style={chipStyle(filter === k, sc.color)}>
                {act ? act.numeral + " · " : ""}{sc.name}
              </button>
            );
          })}
        </div>
        {filter !== "all" && (() => {
          const act = ACTS.find((a) => a.school === filter);
          return (
            <div style={{ margin: "14px 2px 2px" }}>
              {act && <span className="arc" style={{ fontSize: 12, color: INK.faint, letterSpacing: 1.5 }}>ACT {act.numeral} · {act.title.toUpperCase()}</span>}
              <p style={{ color: INK.dim, fontSize: 15, margin: "4px 0 8px" }}>{SCHOOL[filter].blurb}</p>
              <div style={{ height: 1, maxWidth: 280, background: INK.line }} />
            </div>
          );
        })()}

        <div className="leaf-grid" style={{ display: "grid", gap: 12, marginTop: 14, alignItems: "start", gridTemplateColumns: "repeat(auto-fill, minmax(158px, 1fr))" }}>
          {onThePage.map((s) => {
            const st = stateOf(s);
            const sc = SCHOOL[s.school];
            const locked = st === "locked";
            const on = st === "inscribed";
            const mark = stateInk(st);
            return (
              <button key={s.id} className="page-card" disabled={locked} onClick={() => !locked && setOpenSpell(s.id)}
                style={{
                  position: "relative", textAlign: "left", minHeight: 126,
                  background: on ? INK.page : INK.page,
                  border: `1.5px solid ${locked ? INK.line : mark}`,
                  borderRadius: 3, padding: 14, display: "flex", flexDirection: "column",
                  cursor: locked ? "not-allowed" : "pointer",
                  boxShadow: "none",
                  opacity: locked ? 0.78 : 1,
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="arc mono" style={{ fontSize: 11, color: INK.faint }}>PAGE {pageNo(s.id)}</span>
                  <span className="arc" style={{ fontSize: 10, color: INK.faint, letterSpacing: 1 }}>RANK {s.rank}</span>
                </div>
                <div style={{ height: 1, background: locked ? INK.line : `${mark}44`, margin: "12px 0 10px" }} />
                <div className="arc" style={{ fontSize: 20, fontWeight: 600, color: locked ? INK.faint : INK.text, lineHeight: 1.1 }}>{locked ? "smudged" : s.name}</div>
                <div style={{ fontSize: 12.5, color: INK.dim, minHeight: 34, lineHeight: 1.3, marginTop: 4 }}>
                  {locked ? "Ink still smudged. Inscribe its base spell to reveal" : s.real}
                </div>
                <div className="arc" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, fontSize: 10, marginTop: 6, letterSpacing: .5 }}>
                  <span style={{ color: INK.faint }}>{locked ? "SHUT" : sc.name.toUpperCase()}</span>
                  {on ? <span style={{ color: INSCRIBED_INK, fontWeight: 700 }}>KNOWN</span>
                    : !locked && st === "seen" ? <span style={{ color: FORMING_INK }}>FORMING</span> : null}
                </div>
              </button>
            );
          })}
        </div>

        <div className="arc" style={{ fontSize: 22, fontWeight: 700, marginTop: 40, display: "flex", alignItems: "center", gap: 10 }}>
          Labyrinths
          <span style={{ fontSize: 14, color: INK.faint, fontStyle: "italic", fontFamily: "'Vollkorn', Georgia, serif", letterSpacing: 0 }}>
           Inscribe every spell in the kit and the door opens.
          </span>
        </div>
        <div style={{ display: "grid", gap: 14, marginTop: 14, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          {LABYRINTH.map((l) => {
            const ready = canEnter(l);
            const won = cleared[l.id];
            const have = l.team.filter((id) => inked.has(id)).length;
            const accent = "#4a6238";
            return (
              <div key={l.id} style={{
                position: "relative", overflow: "hidden",
                background: won ? INK.pageHi : INK.page,
                border: `1.5px solid ${won ? INK.candle : ready ? accent : INK.line}`,
                borderRadius: 3, padding: 16,
              }}>
                <div className="arc" style={{ fontSize: 11, color: INK.faint, fontWeight: 600, letterSpacing: 1 }}>{l.tier}</div>
                <div className="arc" style={{ fontSize: 21, fontWeight: 700, marginTop: 2 }}>{l.name}</div>
                <p style={{ color: INK.dim, fontSize: 14.5, lineHeight: 1.5, margin: "10px 0" }}>{l.desc}</p>
                <div className="arc" style={{ fontSize: 11, color: INK.faint, marginBottom: 8, letterSpacing: .5 }}>SPELL-KIT · {have}/{l.team.length} inscribed</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                  {l.team.filter((id) => spellById[id]).map((id) => {
                    const sp = spellById[id];
                    const has = inked.has(id);
                    return (
                      <button key={id} className="arc btn" title={sp.real} onClick={() => setOpenSpell(id)}
                        style={{ borderRadius: 2, padding: "4px 9px", fontSize: 12.5, letterSpacing: .3, border: `1px solid ${has ? SCHOOL[sp.school].color : INK.line}`, background: has ? INK.pageHi : "transparent", color: has ? SCHOOL[sp.school].color : INK.faint }}>
                        {sp.name}
                      </button>
                    );
                  })}
                </div>
                <button className="btn" disabled={!ready || won} onClick={() => enter(l)} style={{
                  width: "100%", padding: "11px 0", borderRadius: 2, fontWeight: 700, fontSize: 15,
                  fontFamily: "'Vollkorn', Georgia, serif", letterSpacing: .5,
                  background: won ? "transparent" : ready ? accent : INK.ink,
                  color: won ? INK.candle : ready ? INK.ink : INK.faint,
                  border: won ? `1.5px solid ${INK.candle}` : "none",
                  cursor: ready && !won ? "pointer" : "default",
                }}>
                  {won ? "CLEARED" : ready ? "Enter the Labyrinth" : `Sealed. Inscribe ${l.team.length - have} more`}
                </button>
                {won && LAB_NOTE[l.id] && (
                  <div style={{ marginTop: 10, fontSize: 13, color: INK.dim, lineHeight: 1.5 }}>{LAB_NOTE[l.id]}</div>
                )}
                {l.code && (
                  <>
                    <button className="btn" onClick={() => setOpenCode(openCode === l.id ? null : l.id)}
                      style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: INK.dim }}>
                      {openCode === l.id ? "Hide the script" : "Reveal the script it becomes"}
                    </button>
                    {openCode === l.id && (
                      <pre className="mono codeleaf" style={{ marginTop: 10, background: INK.ink, border: `1px solid ${INK.line}`, borderRadius: 2, padding: 12, fontSize: 11.5, color: INK.dim, overflowX: "auto", lineHeight: 1.55, whiteSpace: "pre" }}>{l.code}</pre>
                    )}
                  </>
                )}
                {celebrate === l.id && (
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                    {Array.from({ length: 16 }).map((_, i) => {
                      const a = (i / 16) * Math.PI * 2;
                      return <span key={i} style={{ position: "absolute", left: "50%", top: "52%", width: 6, height: 6, borderRadius: 99, background: i % 2 ? INK.candle : INK.verdigris, "--dx": `${Math.cos(a) * 95}px`, "--dy": `${Math.sin(a) * 95}px`, animation: "ember 1s ease-out forwards" }} />;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* spell detail */}
      {openSpell && (() => {
        const s = spellById[openSpell];
        const sc = SCHOOL[s.school];
        const on = inked.has(s.id);
        const chain = spellChain(s);
        const hands = SPELL_HANDS[s.id];
        const ci = Math.min(handIdx, hands.length - 1);
        const thisHand = hands[ci];
        const trayLeft = trayOrder.filter((i) => !laid.includes(i));
        const full = laid.length === thisHand.runes.length;
        return (
          <div onClick={() => setOpenSpell(null)} style={{ position: "fixed", inset: 0, background: "rgba(38,29,18,0.50)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50, backdropFilter: "blur(3px)" }}>
            <div onClick={(e) => e.stopPropagation()} style={{
              background: INK.pageHi,
              border: `1.5px solid ${sc.color}`, borderRadius: "2px 18px 2px 2px", maxWidth: 560, width: "100%",
              maxHeight: "92vh", overflowY: "auto", padding: 22, position: "relative",
            }}>
              <button className="btn arc" onClick={() => setOpenSpell(null)} aria-label="Close" style={{ position: "absolute", top: 14, right: 14, color: INK.faint, fontSize: 12, letterSpacing: 1 }}>CLOSE</button>

              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div className="arc" style={{ fontSize: 40, fontWeight: 700, color: on ? sc.color : INK.faint, lineHeight: 1, borderRight: `1px solid ${sc.color}44`, paddingRight: 16, flexShrink: 0 }}>{pageNo(s.id)}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="arc mono" style={{ fontSize: 12, color: INK.faint }}>PAGE {pageNo(s.id)} · RANK {s.rank}</div>
                  <div className="arc" style={{ fontSize: 27, fontWeight: 700, color: sc.color, lineHeight: 1.05 }}>{s.name}</div>
                  <div className="arc" style={{ fontSize: 12, color: INK.dim, letterSpacing: 1, marginTop: 3 }}>{sc.name.toUpperCase()} SCHOOL</div>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div className="arc" style={{ fontSize: 12, color: INK.faint, letterSpacing: .5 }}>THE REAL SPELL</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: INK.text, marginTop: 2 }}>{s.real}</div>
              </div>
              <p style={{ color: INK.dim, fontSize: 15, lineHeight: 1.55, marginTop: 10 }}>{s.desc}</p>

              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <MemoryRow color={SCHOOL.transmutation.color} label="SAY IT">
                  <span style={{ fontStyle: "italic", color: INK.text }}>“{s.say}”</span>
                </MemoryRow>
                <MemoryRow color={INK.candle} label="REMEMBER IT">
                  {s.image}
                </MemoryRow>
                <MemoryRow color={SCHOOL.divination.color} label="REACH FOR IT WHEN">
                  {s.when}
                </MemoryRow>
                {s.gotcha && <MemoryRow color="#8a5220" label="WATCH FOR">
                  {s.gotcha}
                </MemoryRow>}
              </div>

              {chain.length > 1 && (
                <div style={{ marginTop: 16 }}>
                  <div className="arc" style={{ fontSize: 12, color: INK.faint, marginBottom: 8, letterSpacing: .5 }}>SPELL LINE. Inscribe each before the next is legible</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {chain.map((id, i) => {
                      const n = spellById[id];
                      const nOn = inked.has(id);
                      const nLock = !revealed(n);
                      const here = id === s.id;
                      return (
                        <React.Fragment key={id}>
                          <button className="btn" onClick={() => setOpenSpell(id)} title={n.real} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 8px", borderRadius: 3, minWidth: 76, border: `1.5px solid ${here ? sc.color : nOn ? SCHOOL[n.school].color : INK.line}`, background: here ? INK.pageHi : "transparent" }}>
                            <span className="arc mono" style={{ fontSize: 10, color: INK.faint }}>{pageNo(n.id)}</span>
                            <span className="arc" style={{ fontSize: 11.5, color: nLock ? INK.faint : SCHOOL[n.school].color, fontWeight: nOn ? 700 : 400 }}>{nLock ? "smudged" : n.name}</span>
                          </button>
                          {i < chain.length - 1 && <span className="arc" style={{ fontSize: 11, color: INK.faint }}>then</span>}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* tracing */}
              <div style={{ marginTop: 18, padding: 16, borderRadius: 3, border: `1.5px solid ${on ? INK.candle + "66" : sc.color + "55"}`, background: `${sc.color}0d` }}>
                <div className="arc" style={{ fontSize: 13, color: on ? INK.candle : sc.color, letterSpacing: .5, display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                  {on ? "DONE THREE TIMES" : "PUT IT IN ORDER"}
                  {!on && <span style={{ marginLeft: "auto", fontSize: 11, color: INK.faint, fontFamily: "'IBM Plex Mono', monospace" }}>{ci + 1} / {hands.length} · {thisHand.ctx}</span>}
                </div>

                {on && !justCast ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <span style={{ fontSize: 14.5, color: INK.text }}>Held across all three contexts.</span>
                      <button className="btn" onClick={() => erase(s.id)} style={{ marginLeft: "auto", fontSize: 12, color: INK.faint, display: "flex", alignItems: "center", gap: 5 }}>erase to practice</button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {hands.map((e, i) => (
                        <div key={i} style={{ background: INK.ink, border: `1px solid ${INK.line}`, borderRadius: 2, padding: 12 }}>
                          <div className="arc" style={{ fontSize: 11, color: sc.color, letterSpacing: 1, marginBottom: 6 }}>{e.ctx.toUpperCase()}</div>
                          <pre className="mono codeleaf" style={{ margin: 0, fontSize: 12.5, color: sc.color, overflowX: "auto", lineHeight: 1.6, whiteSpace: "pre" }}>{e.code}</pre>
                          <div style={{ fontSize: 13, color: INK.dim, marginTop: 8, lineHeight: 1.5 }}>{e.note}</div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : justCast ? (
                  <div className="ignite" style={{ textAlign: "center", padding: "6px 0" }}>
                    <div style={{ fontSize: 15, color: INK.candle, fontWeight: 600 }}>Three hands, one spell. It holds.</div>
                    <div style={{ fontSize: 13.5, color: INK.dim, marginTop: 10 }}>Once is luck. Three times in three shapes is not. Put it in a real file before you lose it.</div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 13.5, color: INK.dim, marginBottom: 10, lineHeight: 1.45 }}>{thisHand.note}</div>
                    {heldFlash && <div style={{ fontSize: 13, color: INK.candle, fontStyle: "italic", marginBottom: 10 }}>Held. Now the same spell in another hand. <b>{thisHand.ctx}</b>.</div>}
                    <div className={fizzle ? "fizzle" : ""} style={{ minHeight: 46, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", padding: "8px 10px", borderRadius: 2, background: INK.ink, border: `1px dashed ${fizzle ? "#8f3a2a" : INK.line}`, marginBottom: 12 }}>
                      {laid.length === 0 && <span style={{ color: INK.faint, fontSize: 13, fontStyle: "italic" }}>Put the tokens here, left to right…</span>}
                      {laid.map((idx, pos) => (
                        <button key={idx} className="rune mono" onClick={() => liftRune(idx)} title="lift"
                          style={{ fontSize: 13, padding: "6px 10px", borderRadius: 1, background: `${sc.color}22`, border: `1px solid ${sc.color}`, color: INK.text }}>
                          <span style={{ color: sc.color, fontSize: 10, marginRight: 4 }}>{pos + 1}</span>{thisHand.runes[idx]}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {trayLeft.map((idx) => (
                        <button key={idx} className="rune mono" onClick={() => placeRune(idx)}
                          style={{ fontSize: 13, padding: "7px 11px", borderRadius: 1, background: INK.page, border: `1px solid ${INK.lineHi}`, color: INK.dim }}>
                          {thisHand.runes[idx]}
                        </button>
                      ))}
                      {trayLeft.length === 0 && <span style={{ color: INK.faint, fontSize: 13, fontStyle: "italic", padding: "6px 0" }}>All runes laid. Cast it.</span>}
                    </div>
                    {fizzle && <div style={{ color: "#8f3a2a", fontSize: 13, marginTop: 10 }}>Out of order. Say the line under your breath before your hand moves.</div>}
                    <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
                      <button className="btn" disabled={!full} onClick={castSpell} style={{ padding: "9px 18px", borderRadius: 2, fontWeight: 700, fontFamily: "'Vollkorn', Georgia, serif", fontSize: 14, background: full ? sc.color : INK.ink, color: full ? INK.ink : INK.faint, cursor: full ? "pointer" : "default" }}>{ci + 1 < hands.length ? "Cast" : "Cast (final)"}</button>
                      <button className="btn" onClick={clearTrace} style={{ fontSize: 12.5, color: INK.dim, display: "flex", alignItems: "center", gap: 5 }}>clear</button>
                      <button className="btn" onClick={() => setReveal((r) => !r)} style={{ marginLeft: "auto", fontSize: 12.5, color: INK.dim, display: "flex", alignItems: "center", gap: 5 }}>
                        {reveal ? "hide" : "study"} this incantation
                      </button>
                    </div>
                    {reveal && <pre className="mono codeleaf" style={{ marginTop: 10, background: INK.ink, border: `1px solid ${INK.line}`, borderRadius: 8, padding: 12, fontSize: 12.5, color: sc.color, overflowX: "auto", lineHeight: 1.6, whiteSpace: "pre" }}>{thisHand.code}</pre>}
                  </>
                )}
              </div>

              <div style={{ marginTop: 12, padding: 12, borderRadius: 2, background: `${sc.color}12`, border: `1px solid ${sc.color}44`, fontSize: 14, color: INK.text, display: "flex", gap: 8 }}>
                <span><b className="arc" style={{ color: sc.color }}>APPRENTICE TASK.</b> {s.mission}</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function MemoryRow({ color, label, children }) {
  return (
    <div style={{ background: `${color}12`, borderLeft: `3px solid ${color}`, padding: "9px 13px" }}>
      <div className="arc" style={{ fontSize: 11, color, letterSpacing: 1, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14.5, color: INK.dim, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

function spellChain(s) {
  let head = s;
  while (head.from) head = spellById[head.from];
  const chain = [head.id];
  let nx = SPELL.find((x) => x.from === head.id);
  while (nx) { chain.push(nx.id); nx = SPELL.find((x) => x.from === nx.id); }
  return chain;
}

function chipStyle(active, color) {
  return {
    fontFamily: "'Vollkorn', Georgia, serif", fontSize: 13, fontWeight: 600, padding: "8px 14px", borderRadius: 99,
    border: `1px solid ${active ? color : INK.line}`, background: active ? `${color}1f` : "transparent",
    color: active ? color : INK.dim, letterSpacing: .3,
  };
}

const cardById = Object.fromEntries(CARDS.map((c) => [c.id, c]));

const MOXIE_MAX = 6, HAND_SIZE = 10, PLAYS = 2, SEQ_MAX = 6, START_FOCUS = 46, ULT_DMG = 40;

function EnemyArt({ id, color, size = 84 }) {
  const s = { fill: "none", stroke: color, strokeWidth: 4, strokeLinecap: "round", strokeLinejoin: "round" };
  const eye = (cx) => <circle cx={cx} cy="46" r="4" fill={color} />;
  const A = {
    wraith: <><path d="M30 30 Q50 18 70 30 V64 L62 56 L54 66 L46 56 L38 66 L30 58 Z" {...s} />{eye(42)}{eye(58)}</>,
    specter: <><path d="M50 20 L74 50 L50 80 L26 50 Z" {...s} />{eye(43)}{eye(57)}<path d="M42 62 Q50 56 58 62" {...s} /></>,
    oracle: <><circle cx="50" cy="50" r="28" {...s} /><circle cx="50" cy="50" r="12" {...s} />{eye(50)}<path d="M50 22 V16 M50 84 V78 M22 50 H16 M84 50 H78" {...s} /></>,
    segfault: <><path d="M28 30 H72 V70 H28 Z" {...s} /><path d="M40 30 L52 50 L44 70 M60 30 L54 50 L64 70" {...s} />{eye(38)}{eye(66)}</>,
  };
  return <svg width={size} height={size} viewBox="0 0 100 100">{A[id]}</svg>;
}

const pickAny = (arr) => arr[Math.floor(Math.random() * arr.length)];
function readCast({ ordered, tiers, weakHits, length }) {
  const notes = [];
  if (!ordered) notes.push("out of order, so it lands weak");
  else notes.push(`${tiers} tiers in order`);
  if (weakHits) notes.push(`${weakHits} card${weakHits > 1 ? "s" : ""} it's weak to, doubled`);
  if (length >= 5) notes.push(`${length} lines long`);
  return notes.join(" · ");
}

const PY_WORDS = new Set(["import", "as", "from", "def", "class", "return", "for", "in", "if",
  "else", "print", "len", "sum", "assert", "pass", "True", "False", "None", "self", "r", "x", "o"]);

// what a line brings into existence, if anything
function nameMade(code) {
  let m = code.match(/^import\s+[\w.]+\s+as\s+(\w+)/);
  if (m) return m[1];
  m = code.match(/^(?:def|class)\s+(\w+)/);
  if (m) return m[1];
  m = code.match(/^(\w+)\s*=[^=]/);
  if (m) return m[1];
  return null;
}

// names a line leans on, ignoring the one it defines itself
function namesUsed(code) {
  const made = nameMade(code);
  const body = code.replace(/"[^"]*"|'[^']*'/g, "");
  return [...new Set([...body.matchAll(/\b([A-Za-z_]\w*)\b/g)].map((m) => m[1]))]
    .filter((n) => n !== made && !PY_WORDS.has(n));
}

const shuffle = (a) => a.slice().sort(() => Math.random() - 0.5);

/* The question has to be about the script the player just built, so it is
   generated from the lines in the sequence and every option is one of them. */
function askAboutScript(seq, cardById) {
  const lines = seq.map((c) => cardById[c.id].code);
  // decoys are always other lines from this same script, never from the deck
  const pool = (all, banned) => shuffle(all.filter((l) => !banned.includes(l))).slice(0, 2);
  const asked = [];

  // every place a later line leans on a name an earlier line makes
  const links = [];
  for (let i = 1; i < lines.length; i++) {
    for (const need of namesUsed(lines[i])) {
      const j = lines.slice(0, i).map(nameMade).lastIndexOf(need);
      if (j >= 0) links.push({ needs: need, user: lines[i], userAt: i, maker: lines[j], makerAt: j });
    }
  }

  if (lines.length >= 3 && links.length) {
    const l = links[Math.floor(Math.random() * links.length)];
    // any other line touching the same name would make a second answer defensible
    const alsoMakes = lines.filter((ln, i) => i !== l.makerAt && nameMade(ln) === l.needs);
    asked.push({
      prompt: `This line needs ${l.needs}. Which line makes it?`,
      subject: l.user,
      answer: l.maker,
      options: shuffle([l.maker, ...pool(lines, [l.maker, l.user, ...alsoMakes])]),
      why: `${l.needs} has to exist before that line runs, which is why the order matters.`,
    });
    // "breaks first" is only fair against the earliest line that uses the name,
    // and only if no other option uses it too
    const firstUser = links.filter((k) => k.needs === l.needs && k.makerAt === l.makerAt)
      .sort((x, y) => x.userAt - y.userAt)[0];
    const alsoUses = lines.filter((ln, i) => i !== firstUser.userAt && namesUsed(ln).includes(l.needs));
    asked.push({
      prompt: "Delete this line. Which one breaks first?",
      subject: l.maker,
      answer: firstUser.user,
      options: shuffle([firstUser.user, ...pool(lines, [firstUser.user, l.maker, ...alsoUses, ...alsoMakes])]),
      why: `Without it there is no ${l.needs} for that line to use.`,
    });
  }

  if (lines.length >= 3) {
    const first = seq
      .map((c, i) => ({ code: cardById[c.id].code, tier: cardById[c.id].tier, i }))
      .sort((a, b) => a.tier - b.tier || a.i - b.i)[0].code;
    asked.push({
      prompt: "Python reads this top to bottom. Which of these runs first?",
      subject: null,
      answer: first,
      options: shuffle([first, ...pool(lines, [first])]),
      why: "Imports and setup come before anything that uses them.",
    });
  }

  if (!asked.length) {
    const last = lines[lines.length - 1];
    asked.push({
      prompt: "Which line does Python reach last?",
      subject: null,
      answer: last,
      options: shuffle([last, ...pool(lines, [last])]),
      why: "It runs top to bottom, so the bottom line goes last.",
    });
  }
  // a two-option question is a coin flip, so prefer any that can offer three
  const full = asked.filter((a) => a.options.length >= 3);
  const usable = full.length ? full : asked;
  return usable[Math.floor(Math.random() * usable.length)];
}

function runWorking(seq) {
  const defined = new Set();
  const lines = [];
  const tiers = seq.map((c) => cardById[c.id].tier);
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i] < tiers[i - 1]) {
      return { lines: [
        { k: "err", t: "Traceback (most recent call last):" },
        { k: "err", t: "NameError: a value is used before it's defined" },
        { k: "hint", t: "out of order. Hit Sort" },
      ], ok: false };
    }
  }
  const sample = () => [{ drink: "chai", sales: 30 }, { drink: "cocoa", sales: 12 }, { drink: "matcha", sales: 25 }];
  let orders = null, df = null;
  const need = {
    comet: ["pd"], ledger: ["pd", "orders"], sieve: ["df"], ward: ["df"], mapweave: ["df"],
    glass: ["df", "px"], threshold: ["df"], printword: ["df"], proving: ["df"],
    branch: ["orders"], weaving: ["orders"], stream: ["orders"],
  };
  const defs = {
    tomes: ["pd"], runeimport: ["px"], vessel: ["goal"], reliquary: ["orders"], bound: ["total"],
    blueprint: ["Shop"], comet: ["df"], ledger: ["df"], call: ["resp"], sieve: ["df"], ward: ["df"],
    mapweave: ["df"], glass: ["fig"], weaving: ["names"], stream: ["gen"],
  };
  const hintFor = (n) => n === "df" ? "you used the data before making it. Play a Data card first"
    : n === "px" ? "Plotly isn't imported. Add the second Import card (Runed Import)"
    : n === "pd" ? "pandas isn't imported. Play Import first"
    : n === "orders" ? "'orders' doesn't exist yet. Play the Reliquary (Setup) first"
    : "that name doesn't exist yet. Check the order";
  const pad = (s, n) => String(s) + " ".repeat(Math.max(0, n - String(s).length));
  const table = (d) => {
    const w = d.cols.map((col) => Math.max(col.length, ...d.rows.map((r) => String(r[col]).length)));
    const iw = String(Math.max(0, d.rows.length - 1)).length;
    const head = " ".repeat(iw) + "  " + d.cols.map((col, i) => pad(col, w[i])).join("  ");
    const body = d.rows.map((r, ri) => pad(ri, iw) + "  " + d.cols.map((col, i) => pad(r[col], w[i])).join("  "));
    return [head, ...body];
  };
  for (const c of seq) {
    const id = c.id;
    const miss = (need[id] || []).find((n) => !defined.has(n));
    if (miss) {
      lines.push({ k: "err", t: "Traceback (most recent call last):" });
      lines.push({ k: "err", t: `NameError: name '${miss}' is not defined` });
      lines.push({ k: "hint", t: hintFor(miss) });
      return { lines, ok: false };
    }
    if (id === "reliquary") orders = sample();
    if (id === "comet" || id === "ledger") df = { rows: sample(), cols: ["drink", "sales"] };
    if (id === "sieve" && df) df = { cols: df.cols, rows: df.rows.filter((r) => r.sales > 20) };
    if (id === "mapweave" && df) df = { cols: [...df.cols, "big"], rows: df.rows.map((r) => ({ ...r, big: r.sales > 20 ? "True" : "False" })) };
    if (id === "branch" && orders) orders.forEach((r) => lines.push({ k: "out", t: r.drink }));
    if (id === "printword" && df) table(df).forEach((l) => lines.push({ k: "out", t: l }));
    if (id === "glass") lines.push({ k: "note", t: "bar chart rendered. Drink × sales" });
    if (id === "threshold") lines.push({ k: "note", t: "saved report.csv" });
    if (id === "familiar") lines.push({ k: "note", t: "scheduled a daily backup" });
    if (id === "call") lines.push({ k: "note", t: "GET returned 200 OK" });
    if (id === "seer") lines.push({ k: "note", t: "breakpoint(). Paused to inspect" });
    if (id === "proving") lines.push({ k: "ok", t: "assert passed" });
    if (id === "ward") lines.push({ k: "note", t: "filled the missing gaps (fillna)" });
    if (id === "tomes") lines.push({ k: "note", t: "imported the tools" });
    if (id === "runeimport") lines.push({ k: "note", t: "pulled in a specific name" });
    if (id === "vessel") lines.push({ k: "note", t: "stored a value in a variable" });
    if (id === "bound") lines.push({ k: "note", t: "defined a function" });
    if (id === "blueprint") lines.push({ k: "note", t: "defined a class" });
    if (id === "weaving") lines.push({ k: "note", t: "wove a list in one line" });
    if (id === "stream") lines.push({ k: "note", t: "readied a generator to yield" });
    if (id === "cells") lines.push({ k: "note", t: "SELECT returned 3 rows from teas.db" });
    if (id === "window") lines.push({ k: "note", t: "due = start + 7 days" });
    if (id === "typed") lines.push({ k: "note", t: "types annotated. Mypy clean" });
    if (id === "decorator") lines.push({ k: "note", t: "area now reads like a field" });
    if (id === "gitbranch") lines.push({ k: "note", t: "Puppy inherits Dog.speak()" });
    if (id === "sealed") lines.push({ k: "note", t: "__eq__ defined. Objects compare" });
    (defs[id] || []).forEach((n) => defined.add(n));
  }
  lines.push({ k: lines.length ? "ok" : "dim", t: lines.length ? "finished, no errors" : "# ran clean. Nothing to print" });
  return { lines, ok: true };
}

function SpellDuel({ inscribed }) {
  const uid = useRef(1);
  const newCard = (id, rank = 1) => ({ uid: uid.current++, id, rank });

  const [phase, setPhase] = useState("intro");
  const [enemyIdx, setEnemyIdx] = useState(0);
  const [enemyHp, setEnemyHp] = useState(ENEMIES[0].hp);
  const [moveIdx, setMoveIdx] = useState(0);
  const [enemyGuard, setEnemyGuard] = useState(false);
  const [focus, setFocus] = useState(START_FOCUS);
  const [moxie, setMoxie] = useState(0);
  const [plays, setPlays] = useState(PLAYS);
  const [hand, setHand] = useState([]);
  const [seq, setSeq] = useState([]);
  const [casting, setCasting] = useState(null);
  const [weaveOut, setWeaveOut] = useState(null);
  const [flash, setFlash] = useState(null);
  const [banner, setBanner] = useState("");
  const [note, setNote] = useState("");
  const [showCodex, setShowCodex] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [runOut, setRunOut] = useState(null);
  const [runFx, setRunFx] = useState(0);         // re-key to replay the reveal animation
  const [kept, setKept] = useState([]);
  const [castMsg, setCastMsg] = useState(null);

  const enemy = ENEMIES[enemyIdx];
  const intent = enemy.moves[moveIdx];
  const wc = SCHOOL[enemy.weak].color;

  const duelDone = new Set(Object.keys(inscribed || {}).filter((k) => inscribed[k]));
  const drawPile = CARDS.filter((c) => !c.req || duelDone.has(c.req));
  const dealHand = (held) => {
    const out = [...held];
    // these three always run clean together, so every hand has something that works
    for (const id of ["tomes", "reliquary", "ledger"]) if (!out.some((c) => c.id === id)) out.push(newCard(id));
    while (out.length < HAND_SIZE) out.push(newCard(pickAny(drawPile).id));
    // with no output card the run prints nothing and looks broken
    const canShow = out.some((c) => c.id === "printword" || c.id === "branch" || (c.id === "glass" && out.some((x) => x.id === "runeimport")));
    if (!canShow) {
      const locked = new Set(["tomes", "reliquary", "ledger", ...held.map((c) => c.id)]);
      const idx = out.findIndex((c) => !locked.has(c.id));
      if (idx >= 0) out[idx] = newCard(Math.random() < 0.6 ? "printword" : "branch");
    }
    return out;
  };

  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 750); return () => clearTimeout(t); }, [flash]);
  useEffect(() => { if (!castMsg) return; const t = setTimeout(() => setCastMsg(null), 2400); return () => clearTimeout(t); }, [castMsg]);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(""), 2600); return () => clearTimeout(t); }, [note]);
  // old output would look like a pass on a script that has changed
  /* eslint-disable-next-line react-hooks/set-state-in-effect */
  useEffect(() => { setRunOut(null); }, [seq]);

  const startDuel = () => {
    uid.current = 1;
    setEnemyIdx(0); setEnemyHp(ENEMIES[0].hp); setMoveIdx(0); setEnemyGuard(false);
    setFocus(START_FOCUS); setMoxie(0); setPlays(PLAYS); setHand(dealHand([])); setSeq([]); setKept([]);
    setCasting(null); setWeaveOut(null); setFlash(null); setBanner(""); setNote(""); setCastMsg(null); setPhase("play");
  };
  const startTurn = () => {
    const keepers = hand.filter((c) => kept.includes(c.uid));
    setPlays(PLAYS); setHand(dealHand(keepers)); setSeq([]); setKept([]); setPhase("play");
  };
  const toggleKeep = (u) => setKept((k) => k.includes(u) ? k.filter((x) => x !== u) : k.length >= 2 ? k : [...k, u]);

  const addToSeq = (u) => {
    if (casting || phase !== "play") return;
    const card = hand.find((c) => c.uid === u);
    if (!card) return;
    const match = seq.find((s) => s.id === card.id && s.rank === card.rank && s.rank < 3);
    if (!match && seq.length >= SEQ_MAX) { setNote("The working is full. Weave it or send a card back."); return; }
    setHand((h) => h.filter((c) => c.uid !== u));
    setKept((k) => k.filter((x) => x !== u));
    if (match) setSeq((s) => s.map((x) => (x.uid === match.uid ? { ...x, rank: x.rank + 1 } : x)));
    else setSeq((s) => [...s, card]);
  };
  const backToHand = (u) => {
    if (casting || phase !== "play") return;
    const card = seq.find((s) => s.uid === u);
    if (!card) return;
    setSeq((s) => s.filter((x) => x.uid !== u));
    setHand((h) => [...h, card]);
  };
  const sortSeq = () => {
    if (casting || phase !== "play" || seq.length < 2) return;
    setSeq((s) => [...s].sort((a, b) => cardById[a.id].tier - cardById[b.id].tier));
    setNote("Ordered the way code runs. Imports, then setup, data, logic, reveal, prove.");
  };

  const tiersArr = seq.map((c) => cardById[c.id].tier);
  const ordered = tiersArr.every((t, i) => i === 0 || t >= tiersArr[i - 1]);
  const baseTotal = seq.reduce((s, c) => s + cardById[c.id].base * c.rank * (cardById[c.id].school === enemy.weak ? 2 : 1), 0);
  const distinctTiers = new Set(tiersArr).size;
  const weakHits = seq.filter((c) => cardById[c.id].school === enemy.weak).length;
  const has = (id) => seq.some((c) => c.id === id);
  const hasPipe = has("ledger") && has("glass");
  let mult, comboName;
  if (!seq.length) { mult = 0; comboName = ""; }
  else if (!ordered) { mult = 0.5; comboName = "NameError"; }
  else {
    const lenBonus = 0.1 * (seq.length - 1);
    if (hasPipe) { mult = 1.45 + lenBonus; comboName = "Data Pipeline"; }
    else if (distinctTiers >= 4) { mult = 1.3 + lenBonus; comboName = "Full Script"; }
    else if (distinctTiers >= 3) { mult = 1.2 + lenBonus; comboName = "Pipeline"; }
    else { mult = 1 + lenBonus; comboName = "Clean compile"; }
  }
  const big = ordered && (hasPipe || distinctTiers >= 3);
  const previewDmg = Math.round(baseTotal * mult);
  const keystone = seq.length ? seq.reduce((k, c) => (cardById[c.id].tier >= cardById[k.id].tier ? c : k), seq[0]) : null;
  let firstBad = -1;
  for (let i = 1; i < tiersArr.length; i++) { if (tiersArr[i] < tiersArr[i - 1]) { firstBad = i; break; } }
  // no casting until it runs clean
  const canWeave = seq.length > 0 && plays > 0 && !!(runOut && runOut.ok);

  const weave = () => {
    if (casting || phase !== "play" || !canWeave) return;
    setCasting(askAboutScript(seq, cardById));
    setWeaveOut(null);
  };
  const pickKeystone = (picked) => {
    if (weaveOut) return;
    const correct = picked === casting.answer;
    const sigilMult = correct ? 1 : 0.6;
    const dmg = Math.round(baseTotal * mult * sigilMult);
    const combo = ordered && !correct ? "Compiled. Misread the order" : comboName;
    const hint = !ordered && firstBad >= 0
      ? `${TIERS[tiersArr[firstBad]].name} runs before ${TIERS[tiersArr[firstBad - 1]].name}. Code runs top to bottom. Tap Sort to fix the order.`
      : "";
    setWeaveOut({ correct, ordered, dmg, combo, hint, big, tiers: distinctTiers, weakHits,
      answer: casting.answer, why: casting.why, code: seq.map((c) => cardById[c.id].code) });
  };
  const unleash = () => {
    const dmg = enemyGuard ? Math.ceil(weaveOut.dmg / 2) : weaveOut.dmg;
    const moxGain = 1 + (weaveOut.big ? 1 : 0);
    const nhp = Math.max(0, enemyHp - dmg);
    setMoxie((m) => Math.min(MOXIE_MAX, m + moxGain));
    setFlash({ dmg, crit: weaveOut.big && weaveOut.correct && !enemyGuard });
    setCastMsg(readCast({
      ordered: weaveOut.ordered,
      tiers: weaveOut.tiers,
      weakHits: weaveOut.weakHits,
      length: weaveOut.code.length,
    }));
    setEnemyHp(nhp);
    setSeq([]); setPlays((p) => p - 1); setCasting(null); setWeaveOut(null);
    if (nhp <= 0) enemyDown();
  };

  const ultimate = () => {
    if (moxie < MOXIE_MAX || casting || phase !== "play") return;
    const nhp = Math.max(0, enemyHp - ULT_DMG);
    setMoxie(0); setFlash({ dmg: ULT_DMG, crit: true }); setEnemyHp(nhp);
    if (nhp <= 0) enemyDown();
  };

  const enemyDown = () => {
    if (enemyIdx >= ENEMIES.length - 1) { setPhase("won"); return; }
    setBanner(`${enemy.name} is banished! You steady yourself as ${ENEMIES[enemyIdx + 1].name} takes shape.`);
    setPhase("between");
  };
  const continueBetween = () => {
    const ni = enemyIdx + 1;
    setEnemyIdx(ni); setEnemyHp(ENEMIES[ni].hp); setMoveIdx(0); setEnemyGuard(false);
    setFocus((f) => Math.min(START_FOCUS, f + 14));
    setPlays(PLAYS); setHand(dealHand([])); setSeq([]); setBanner(""); setPhase("play");
  };

  const endTurn = () => {
    if (phase !== "play" || casting) return;
    const mv = enemy.moves[moveIdx];
    let guard = false;
    if (mv.t === "atk") {
      const nf = focus - mv.v;
      setFocus(Math.max(0, nf));
      if (nf <= 0) { setBanner(`${enemy.name} strikes for ${mv.v}. Your focus shatters.`); setPhase("lost"); return; }
      setBanner(`${enemy.name} strikes. You lose ${mv.v} focus.`);
    } else if (mv.t === "guard") {
      guard = true; setBanner(`${enemy.name} fades. It will take halved damage on your next turn.`);
    } else if (mv.t === "heal") {
      setEnemyHp((h) => Math.min(enemy.hp, h + mv.v)); setBanner(`${enemy.name} mends ${mv.v} of its wounds.`);
    }
    setEnemyGuard(guard);
    setMoveIdx((i) => (i + 1) % enemy.moves.length);
    setPhase("enemyMsg");
  };
  const continueFromMsg = () => { setBanner(""); startTurn(); };

  const enemyPct = Math.max(0, (enemyHp / enemy.hp) * 100);
  const focusPct = Math.max(0, (focus / START_FOCUS) * 100);

  return (
    <div className="ground" style={{ color: INK.text, minHeight: "100vh", fontFamily: "'Vollkorn', Georgia, serif", padding: "clamp(12px, 3vw, 28px)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vollkorn:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .arc { font-family: 'Vollkorn', Georgia, serif; letter-spacing: .2px; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .ground { background-color: ${INK.ink}; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/></filter><rect width='160' height='160' filter='url(%23g)' opacity='0.055'/></svg>"); }
        * { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; }
        .tile { transition: transform .14s ease, box-shadow .14s ease, border-color .14s ease; }
        .tile:hover { transform: translateY(-4px); }
        .btn:focus-visible, .tile:focus-visible, .opt:focus-visible { outline: 2px solid ${INK.verdigris}; outline-offset: 2px; }
        @keyframes floaty { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-4px) } }
        @keyframes pop { 0%{ transform: scale(.5); opacity:0 } 60%{ transform: scale(1.18) } 100%{ transform: scale(1); opacity:1 } }
        @keyframes hit { 0%,100%{ transform: translateX(0) } 25%{ transform: translateX(-7px) } 75%{ transform: translateX(7px) } }
        @keyframes pulse { 0%,100%{ opacity:1 } 50%{ opacity:.5 } }
        .floaty { animation: floaty 3.4s ease-in-out infinite; } .pop { animation: pop .45s ease; }
        .hit { animation: hit .4s ease; } .pulse { animation: pulse 1.3s ease-in-out infinite; }
        @keyframes blink { 0%,100%{ opacity:1 } 50%{ opacity:0 } }
        @keyframes runline { from{ opacity:0; transform: translateX(-6px) } to{ opacity:1; transform:none } }
        .blink { animation: blink 1.05s step-end infinite; }
        .runline { animation: runline .28s ease both; }
        .runbtn { transition: filter .15s, transform .15s; } .runbtn:hover:not(:disabled){ filter: brightness(1.12); transform: translateY(-1px); }
        @media (prefers-reduced-motion: reduce){ .floaty,.pop,.hit,.pulse,.blink,.runline{ animation:none } .tile:hover{ transform:none } }
      `}</style>

      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <div className="arc" style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
            The Spell Duel
          </div>
          {phase !== "intro" && phase !== "won" && phase !== "lost" && (
            <span className="arc" style={{ fontSize: 12, color: INK.faint, letterSpacing: 1 }}>FOE {enemyIdx + 1} / {ENEMIES.length}</span>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn" onClick={() => setShowHow(true)} style={pill(INK.dim)}>How to Duel</button>
            <button className="btn" onClick={() => setShowCodex(true)} style={pill(INK.verdigris)}>Codex</button>
            <button className="btn" onClick={startDuel} style={pill(INK.faint)}>Restart</button>
          </div>
        </div>

        {phase === "intro" ? <Intro onStart={startDuel} />
          : phase === "won" ? <DuelEnd win onAgain={startDuel} />
          : phase === "lost" ? <DuelEnd onAgain={startDuel} />
          : (
            <>
              <div style={{ background: INK.page, border: `1.5px solid ${wc}66`, borderRadius: 3, padding: 16, position: "relative", overflow: "hidden" }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <div className={flash ? "hit" : "floaty"} style={{ position: "relative" }}>
                    <EnemyArt id={enemy.art} color={wc} size={84} />
                    {enemyGuard && <span className="arc" style={{ position: "absolute", bottom: 0, right: 0, fontSize: 10, color: INK.terreVerte, letterSpacing: 1 }}>GUARDED</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span className="arc" style={{ fontSize: 20, fontWeight: 700 }}>{enemy.name}</span>
                      <IntentTag move={intent} />
                    </div>
                    <div style={{ fontSize: 13, color: INK.dim, fontStyle: "italic", margin: "2px 0 8px" }}>{enemy.quip}</div>
                    <div style={{ height: 12, background: INK.ink, borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: `${enemyPct}%`, height: "100%", background: INK.oxblood, transition: "width .3s ease" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                      <span className="mono" style={{ fontSize: 12, color: INK.dim }}>{enemyHp} / {enemy.hp}{enemyGuard && <span style={{ color: INK.terreVerte }}> · guarded</span>}</span>
                      <span className="arc" style={{ fontSize: 12, color: wc }}>WEAK: {SCHOOL[enemy.weak].name.toUpperCase()} · 2×</span>
                    </div>
                  </div>
                </div>
                {flash && (
                  <div className="pop" style={{ position: "absolute", top: 14, right: 20, fontFamily: "'Vollkorn', Georgia, serif", fontWeight: 700, fontSize: flash.crit ? 34 : 26, color: flash.crit ? INK.candle : INK.text }}>
                    -{flash.dmg}{flash.crit && <span style={{ fontSize: 13, marginLeft: 4 }}>CRIT!</span>}
                  </div>
                )}
                {castMsg && (
                  <div className="pop" style={{ position: "absolute", top: 52, left: "50%", transform: "translateX(-50%)", background: `${INK.ink2}f2`, border: `1px solid ${INK.candle}`, borderRadius: 999, padding: "5px 15px", fontSize: 12.5, color: INK.candle, fontFamily: "'Vollkorn', Georgia, serif", whiteSpace: "nowrap", zIndex: 5 }}>
                    {castMsg}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 190px", background: INK.page, border: `1px solid ${INK.line}`, borderRadius: 3, padding: "10px 14px" }}>
                  <div className="arc" style={{ fontSize: 11, color: INK.faint, letterSpacing: 1 }}>FOCUS</div>
                  <div style={{ height: 10, background: INK.ink, borderRadius: 99, overflow: "hidden", margin: "6px 0 3px" }}>
                    <div style={{ width: `${focusPct}%`, height: "100%", background: focus <= 8 ? INK.oxblood : INK.terreVerte, transition: "width .3s ease" }} />
                  </div>
                  <span className="mono" style={{ fontSize: 12, color: INK.dim }}>{focus} / {START_FOCUS}</span>
                </div>
                <div style={{ flex: "1 1 190px", background: INK.page, border: `1px solid ${moxie >= MOXIE_MAX ? INK.candle : INK.line}`, borderRadius: 3, padding: "10px 14px" }}>
                  <div className="arc" style={{ fontSize: 11, color: INK.faint, letterSpacing: 1, display: "flex", justifyContent: "space-between" }}>
                    <span>MOXIE</span><span className="mono" style={{ color: plays > 0 ? INK.dim : INK.candle }}>weaves left: {plays}</span>
                  </div>
                  <div style={{ display: "flex", gap: 5, marginTop: 7 }}>
                    {Array.from({ length: MOXIE_MAX }).map((_, i) => (
                      <div key={i} style={{ flex: 1, height: 10, borderRadius: 4, background: i < moxie ? INK.candle : INK.ink, border: `1px solid ${i < moxie ? INK.candle : INK.line}` }} />
                    ))}
                  </div>
                </div>
                <button className="btn" disabled={moxie < MOXIE_MAX} onClick={ultimate} style={{ flex: "0 0 auto", padding: "0 18px", borderRadius: 3, fontFamily: "'Vollkorn', Georgia, serif", fontWeight: 700, fontSize: 14, background: moxie >= MOXIE_MAX ? INK.candle : INK.ink, color: moxie >= MOXIE_MAX ? INK.ink : INK.faint, cursor: moxie >= MOXIE_MAX ? "pointer" : "default", display: "flex", alignItems: "center", gap: 6 }}>
                  Ultimate
                </button>
                <button className={`btn ${plays <= 0 ? "pulse" : ""}`} onClick={endTurn} style={{ flex: "0 0 auto", padding: "0 18px", borderRadius: 3, fontFamily: "'Vollkorn', Georgia, serif", fontWeight: 700, fontSize: 14, border: `1px solid ${plays <= 0 ? INK.candle : INK.line}`, color: plays <= 0 ? INK.candle : INK.dim, display: "flex", alignItems: "center", gap: 6 }}>
                  End Turn</button>
              </div>

              <div style={{ background: INK.page, border: `1.5px solid ${ordered ? INK.line : INK.oxblood + "88"}`, borderRadius: 3, padding: 14, marginTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                  <span className="arc" style={{ fontSize: 13, color: INK.candle, letterSpacing: 1, display: "inline-flex", alignItems: "center", gap: 6 }}>THE SCRIPT</span>
                  <span className="mono" style={{ fontSize: 11, color: INK.faint }}>run order: 1 import, 2 setup, 3 data, 4 logic, 5 reveal, 6 prove</span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    <button className="btn" disabled={seq.length < 2} onClick={sortSeq} style={{ ...pill(seq.length < 2 ? INK.faint : INK.terreVerte), opacity: seq.length < 2 ? 0.5 : 1 }}>Sort</button>
                    <button className="btn" disabled={!canWeave} onClick={weave} title={canWeave ? "cast the script" : "Run it clean first. The working must run without errors to cast"} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "'Vollkorn', Georgia, serif", fontWeight: 700, borderRadius: 99, padding: "6px 16px", background: canWeave ? INK.candle : INK.ink, color: canWeave ? INK.ink : INK.faint, cursor: canWeave ? "pointer" : "default", opacity: canWeave ? 1 : .7 }}>Weave</button>
                  </div>
                </div>

                {seq.length === 0 ? (
                  <div style={{ color: INK.faint, fontSize: 13.5, fontStyle: "italic", padding: "14px 4px" }}>Tap cards below to stack a script. Put them in the order code runs. Or hit <b style={{ color: INK.terreVerte }}>Sort</b> and I'll order them for you.</div>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "stretch", gap: 4, flexWrap: "wrap", marginTop: 10 }}>
                      {seq.map((c, i) => {
                        const info = cardById[c.id]; const col = SCHOOL[info.school].color;
                        const badStep = i === firstBad;
                        return (
                          <React.Fragment key={c.uid}>
                            {i > 0 && <div style={{ alignSelf: "center", color: badStep ? INK.oxblood : INK.faint, fontSize: 18, fontWeight: 700 }}>{badStep ? "stops here" : "then"}</div>}
                            <button className="btn tile" onClick={() => backToHand(c.uid)} title="tap to send back to hand"
                              style={{ width: 108, textAlign: "left", background: INK.ink, border: `1.5px solid ${badStep ? INK.oxblood : col}`, borderRadius: 3, padding: "8px 9px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span className="arc" style={{ fontSize: 9.5, color: INK.candle }}>{info.tier}·{TIERS[info.tier].name}</span>
                                <span className="arc" style={{ fontSize: 10, color: INK.candle }}>rank {c.rank}</span>
                              </div>
                              <div style={{ height: 1, background: `${col}44`, margin: "7px 0" }} />
                              <div className="arc" style={{ fontSize: 12.5, fontWeight: 600, color: col, lineHeight: 1.15 }}>{info.name}</div>
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                      {ordered
                        ? <span className="arc" style={{ fontSize: 12, color: INK.terreVerte }}>{comboName}</span>
                        : <span className="arc" style={{ fontSize: 12, color: INK.oxblood }}>Out of order. Hit Sort</span>}
                      <span className="mono" style={{ fontSize: 12, color: INK.dim }}>Weave, about <b style={{ color: canWeave ? INK.candle : INK.faint }}>{previewDmg}</b> dmg{keystone ? ` · keystone: ${cardById[keystone.id].name}` : ""}</span>
                      <span className="mono arc" style={{ fontSize: 11.5, marginLeft: "auto", fontWeight: 600, color: canWeave ? INK.terreVerte : runOut && !runOut.ok ? INK.oxblood : INK.candle }}>
                        {canWeave ? "runs clean. Weave is open" : runOut && !runOut.ok ? "fix the error, then Run again" : "Run it clean to cast"}
                      </span>
                    </div>

                    <div className="mono leafsheet" style={{ marginTop: 12, background: INK.vellum, color: INK.vellumInk, border: `1px solid ${ordered ? INK.vellumEdge : INK.oxblood}`, borderLeft: `4px solid ${ordered ? INK.candle : INK.oxblood}`, borderRadius: "1px 1px 10px 1px", overflow: "hidden", transition: "border-color .35s" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 6px 5px 12px", borderBottom: `1px solid ${INK.vellumEdge}`, background: "rgba(0,0,0,0.05)", fontSize: 10.5, color: "#5c4a22", letterSpacing: .5 }}>
                        <span>working.py <span style={{ color: ordered ? "#4f6330" : INK.oxblood }}>{ordered ? "in order" : "out of order"}</span></span>
                        <button className="btn runbtn" disabled={!seq.length} onClick={() => { setRunOut(runWorking(seq)); setRunFx((n) => n + 1); }}
                          title="press the seal to run it"
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontFamily: "'Vollkorn', Georgia, serif", fontWeight: 700, letterSpacing: 1, color: seq.length ? INK.vellum : "#8a7a5a", background: seq.length ? INK.oxblood : "transparent", border: `1px solid ${seq.length ? INK.oxblood : "#a89468"}`, borderRadius: "10px 10px 10px 2px", padding: "3px 14px", opacity: seq.length ? 1 : .55 }}>
                          RUN
                        </button>
                      </div>
                      <div style={{ padding: "9px 0" }}>
                        {seq.map((c, i) => (
                          <div key={c.uid} style={{ display: "flex", alignItems: "baseline", fontSize: 12, lineHeight: 1.8, background: i === firstBad ? `${INK.oxblood}1f` : "transparent" }}>
                            <span style={{ width: 34, flex: "0 0 auto", textAlign: "right", paddingRight: 10, marginRight: 10, borderRight: `1px solid ${INK.candle}55`, color: "#8a7a5a", userSelect: "none" }}>{i + 1}</span>
                            <span style={{ color: i === firstBad ? INK.oxblood : INK.vellumInk, whiteSpace: "pre" }}>{cardById[c.id].code}{i === firstBad ? "   # runs too early" : ""}</span>
                          </div>
                        ))}
                      </div>
                      {runOut && (
                        <div key={runFx} style={{ borderTop: `1px dashed ${INK.vellumEdge}`, background: "rgba(0,0,0,0.06)", padding: "7px 12px 10px 16px" }}>
                          <div style={{ fontSize: 9.5, color: "#6f5f3e", letterSpacing: 1.5, marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span>WHAT IT DID{runOut.ok ? "" : " · error"}</span>
                            <button className="btn" onClick={() => setRunOut(null)} style={{ color: "#6f5f3e", fontSize: 10, letterSpacing: 1 }}>clear</button>
                          </div>
                          {runOut.lines.map((ln, i) => (
                            <div key={i} className="runline" style={{ animationDelay: `${i * 60}ms`, fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap", color: ln.k === "err" ? INK.oxblood : ln.k === "hint" ? "#7a5c18" : ln.k === "note" ? "#3f6259" : ln.k === "ok" ? "#5d7340" : ln.k === "dim" ? "#8a7a5a" : INK.vellumInk }}>{ln.t}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {note && <div className="arc" style={{ fontSize: 12.5, color: INK.terreVerte, background: `${INK.terreVerte}14`, border: `1px solid ${INK.terreVerte}33`, borderRadius: 2, padding: "8px 12px", marginTop: 10 }}>{note}</div>}

              <div className="arc" style={{ fontSize: 12, color: INK.faint, letterSpacing: 1, margin: "16px 2px 8px" }}>
                YOUR HAND. Tap to add · matching cards merge · <span style={{ color: kept.length ? INK.candle : INK.faint }}>Keep holds up to 2 for next turn ({kept.length}/2)</span>
              </div>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
                {hand.map((c) => {
                  const info = cardById[c.id]; const col = SCHOOL[info.school].color;
                  const wk = info.school === enemy.weak;
                  const merges = seq.some((s) => s.id === c.id && s.rank === c.rank && s.rank < 3);
                  const isKept = kept.includes(c.uid); const keptFull = kept.length >= 2;
                  return (
                    <div key={c.uid} className="tile" role="button" tabIndex={0}
                      onClick={() => addToSeq(c.uid)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); addToSeq(c.uid); } }}
                      style={{ position: "relative", background: INK.page, border: `1.5px solid ${isKept ? INK.candle : merges ? INK.terreVerte : col}`, borderRadius: 3, padding: 12, cursor: "pointer", boxShadow: isKept ? `inset 3px 0 0 ${INK.candle}` : merges ? `inset 3px 0 0 ${INK.terreVerte}` : "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="arc" style={{ fontSize: 9.5, color: INK.candle }}>{info.tier}·{TIERS[info.tier].name}</span>
                        <span className="arc" style={{ fontSize: 11, color: INK.candle, letterSpacing: 1 }}>rank {c.rank}</span>
                      </div>
                      <div style={{ height: 1, background: `${col}44`, margin: "9px 0 7px" }} />
                      <div className="arc" style={{ fontSize: 16, fontWeight: 600, color: col }}>{info.name}</div>
                      <div style={{ fontSize: 11.5, color: INK.dim, minHeight: 16, lineHeight: 1.2 }}>{info.real}</div>
                      <div className="mono" style={{ fontSize: 10, color: INK.faint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 2 }}>{info.code}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                        <span className="mono" style={{ fontSize: 12, color: wk ? wc : INK.dim }}>{Math.round(info.base * c.rank * (wk ? 2 : 1))}{wk && <span style={{ fontSize: 10, letterSpacing: .5 }}> x2</span>}</span>
                        <span className="arc" style={{ fontSize: 11, color: merges ? INK.terreVerte : INK.verdigris }}>{merges ? "merge" : "stack"}</span>
                      </div>
                      <button className="btn" onClick={(e) => { e.stopPropagation(); toggleKeep(c.uid); }} disabled={!isKept && keptFull}
                        title={isKept ? "held for next turn" : keptFull ? "keep limit reached (2)" : "hold this card for next turn"}
                        style={{ marginTop: 8, width: "100%", fontSize: 10.5, fontFamily: "'Vollkorn', Georgia, serif", letterSpacing: .5, padding: "3px 0", borderRadius: "1px 1px 8px 1px", background: isKept ? `${INK.candle}22` : "transparent", border: `1px solid ${isKept ? INK.candle : INK.line}`, color: isKept ? INK.candle : (!isKept && keptFull) ? INK.faint : INK.dim, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, opacity: (!isKept && keptFull) ? .5 : 1 }}>
                        {isKept ? "Keeping" : "Keep"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
      </div>

      {/* weave overlay */}
      {casting && keystone && (() => {
        const col = SCHOOL[cardById[keystone.id].school].color;
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(38,29,18,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 60, backdropFilter: "blur(4px)" }}>
            <div className="pop" style={{ position: "relative", background: INK.pageHi, border: `1.5px solid ${col}`, borderRadius: "2px 2px 18px 2px", maxWidth: 480, width: "100%", padding: 24, textAlign: "center" }}>
              <button className="btn arc" onClick={() => { setCasting(null); setWeaveOut(null); }} aria-label="Cancel" style={{ position: "absolute", top: 14, right: 14, color: INK.faint, fontSize: 12, letterSpacing: 1 }}>CANCEL</button>
              <div className="arc" style={{ fontSize: 12, color: col, letterSpacing: 1 }}>CAST THE SCRIPT · {seq.length} {seq.length === 1 ? "card" : "cards"}</div>

              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 3, flexWrap: "wrap", margin: "12px 0 6px" }}>
                {seq.map((c, i) => (
                  <React.Fragment key={c.uid}>
                    {i > 0 && <span className="arc" style={{ color: INK.faint, fontSize: 11 }}>then</span>}
                    <span className="arc" style={{ fontSize: 12.5, color: SCHOOL[cardById[c.id].school].color }}>{cardById[c.id].name}</span>
                  </React.Fragment>
                ))}
              </div>

              <div style={{ fontSize: 10.5, color: INK.faint, textAlign: "left", margin: "8px 0 3px", letterSpacing: .5 }} className="mono"># the script, as code</div>
              <div className="mono" style={{ textAlign: "left", background: INK.vellum, border: `1px solid ${INK.vellumEdge}`, borderLeft: `4px solid ${INK.candle}`, borderRadius: "1px 1px 10px 1px", padding: "10px 14px", marginBottom: 8, fontSize: 12, lineHeight: 1.7, overflowX: "auto" }}>
                {seq.map((c, i) => (
                  <div key={c.uid} style={{ color: i === firstBad ? INK.oxblood : INK.vellumInk, whiteSpace: "pre" }}>
                    {cardById[c.id].code}{i === firstBad ? "   # runs too early" : ""}
                  </div>
                ))}
              </div>

              {!weaveOut ? (
                <>
                  <div className="arc" style={{ fontSize: 11, color: INK.faint, letterSpacing: 1.5, margin: "14px 0 6px" }}>BEFORE YOU CAST</div>
                  <div style={{ fontSize: 15.5, color: INK.text, marginBottom: casting.subject ? 8 : 14, lineHeight: 1.45 }}>{casting.prompt}</div>
                  {casting.subject && (
                    <div className="mono" style={{ background: INK.vellum, color: INK.vellumInk, border: `1px solid ${INK.vellumEdge}`, borderLeft: `3px solid ${INK.oxblood}`, padding: "7px 11px", fontSize: 12.5, marginBottom: 14, textAlign: "left", overflowX: "auto", whiteSpace: "pre" }}>{casting.subject}</div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {casting.options.map((line) => (
                      <button key={line} className="opt btn mono" onClick={() => pickKeystone(line)}
                        style={{ background: INK.ink, border: `1.5px solid ${INK.lineHi}`, borderRadius: 2, padding: "10px 13px", fontSize: 12.5, color: INK.text, textAlign: "left", whiteSpace: "pre", overflowX: "auto", transition: "border-color .15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = col; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = INK.lineHi; }}>
                        {line}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="pop" style={{ marginTop: 12 }}>
                  <div className="arc" style={{ fontSize: 20, fontWeight: 700, color: weaveOut.ordered ? (weaveOut.big ? INK.candle : INK.terreVerte) : INK.oxblood }}>{weaveOut.combo}</div>
                  {weaveOut.hint
                    ? <div style={{ fontSize: 13, color: INK.oxblood, marginTop: 6, lineHeight: 1.45 }}>{weaveOut.hint}</div>
                    : <div style={{ fontSize: 13, color: INK.dim, marginTop: 6, lineHeight: 1.5 }}>
                        {weaveOut.ordered && weaveOut.correct && "In order, and you read it right."}
                        {weaveOut.ordered && !weaveOut.correct && (
                          <>
                            <span style={{ color: INK.oxblood }}>Not that one. </span>
                            <span className="mono" style={{ fontSize: 12.5 }}>{weaveOut.answer}</span>
                            <div style={{ marginTop: 4 }}>{weaveOut.why}</div>
                          </>
                        )}
                      </div>}
                  <div className="mono" style={{ fontSize: 22, color: weaveOut.ordered ? INK.candle : INK.dim, marginTop: 8 }}>{weaveOut.dmg} dmg{enemyGuard ? ` cut to ${Math.ceil(weaveOut.dmg / 2)} by the guard` : ""}</div>
                  <button className="btn" onClick={unleash} style={{ marginTop: 16, padding: "11px 30px", borderRadius: 3, fontFamily: "'Vollkorn', Georgia, serif", fontWeight: 700, fontSize: 15, background: col, color: INK.onAccent, display: "inline-flex", alignItems: "center", gap: 7 }}>Unleash</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {(phase === "enemyMsg" || phase === "between") && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(38,29,18,0.52)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 55, backdropFilter: "blur(3px)" }}>
          <div className="pop" style={{ background: INK.pageHi, border: `1.5px solid ${phase === "between" ? INK.candle : INK.line}`, borderRadius: "2px 2px 2px 18px", maxWidth: 440, width: "100%", padding: 24, textAlign: "center" }}>
            <p style={{ color: INK.text, fontSize: 16, lineHeight: 1.55, margin: "0 0 18px" }}>{banner}</p>
            <button className="btn" onClick={phase === "between" ? continueBetween : continueFromMsg} style={{ padding: "11px 26px", borderRadius: 3, fontFamily: "'Vollkorn', Georgia, serif", fontWeight: 700, fontSize: 15, background: INK.verdigris, color: INK.onAccent }}>Continue</button>
          </div>
        </div>
      )}

      {showCodex && (
        <Overlay onClose={() => setShowCodex(false)} title="The Codex" subtitle="Every card, and where in a program it runs.">
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
            {[...CARDS].sort((a, b) => a.tier - b.tier).map((c) => (
              <div key={c.id} style={{ display: "flex", gap: 12, alignItems: "center", background: INK.ink, border: `1px solid ${SCHOOL[c.school].color}44`, borderRadius: 3, padding: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="arc" style={{ fontSize: 14, fontWeight: 600, color: SCHOOL[c.school].color }}>{c.name}</span>
                    <span className="arc" style={{ fontSize: 9.5, color: INK.candle, border: `1px solid ${INK.candle}55`, borderRadius: 99, padding: "1px 6px" }}>{c.tier}·{TIERS[c.tier].name}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: INK.dim }}>{c.real}</div>
                  <div style={{ fontSize: 11.5, color: INK.faint, fontStyle: "italic", marginTop: 2 }}>{c.mnem}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: INK.dim, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.code}</div>
                </div>
              </div>
            ))}
          </div>
        </Overlay>
      )}

      {showHow && (
        <Overlay onClose={() => setShowHow(false)} title="How to Duel" subtitle="Cards are lines of a program. Play them in the order code runs.">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              ["Stack a script", "Tap cards to add them. Two of the same card at the same rank merge into one stronger card."],
              ["Order matters", "Imports, setup, data, logic, reveal, prove. Out of that order it won't compile, which is also true outside this game."],
              ["Sort", "Rearranges the cards the way Python would run them, and tells you why they moved."],
              ["Run before you cast", "Right order gives you real output. Wrong order gives you a real error naming what isn't defined yet. Weave stays shut until it runs clean."],
              ["Weave to cast", "Fires the whole script at once. Seal it by naming the keystone, the highest-tier card, from its description."],
              ["Pipelines", "Three tiers in order is a Pipeline. Four is a Full Script. A data card into a chart pays the most."],
              ["Hit the weakness", "Cards from a foe's weak school deal double."],
              ["Keep", "Hold up to two cards for next turn. Worth it for a hard-to-draw import."],
              ["Intent and Ultimate", "The tag beside the foe is its next move. Every card woven builds Moxie, and a full bar goes through a guard."],
            ].map(([h, b], i) => (
              <div key={i} style={{ display: "flex", gap: 12 }}>
                <span style={{ marginTop: 8, width: 14, height: 1, background: INK.verdigris, flexShrink: 0 }} />
                <div style={{ fontSize: 14, color: INK.dim, lineHeight: 1.5 }}><b style={{ color: INK.text }}>{h}.</b> {b}</div>
              </div>
            ))}
          </div>
        </Overlay>
      )}
    </div>
  );
}

function IntentTag({ move }) {
  const map = {
    atk: { color: "#8f3a2a", label: `strikes for ${move.v}` },
    guard: { color: "#4a6238", label: "guards" },
    heal: { color: "#7a5c18", label: `mends ${move.v}` },
  };
  const m = map[move.t];
  return (
    <span className="arc" title="the foe's next move" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: m.color, border: `1px solid ${m.color}55`, background: `${m.color}18`, borderRadius: 2, padding: "3px 10px" }}>
      <span style={{ color: INK.faint, fontSize: 10, fontWeight: 600, letterSpacing: .5 }}>NEXT</span>
      {m.label}
    </span>
  );
}

function Intro({ onStart }) {
  return (
    <div style={{ background: INK.pageHi, border: `1.5px solid ${INK.verdigris}66`, borderRadius: "2px 18px 2px 2px", padding: "30px 24px", textAlign: "center" }}>
      <div className="arc" style={{ fontSize: 26, fontWeight: 700, color: INK.candle }}>The Spell Duel</div>
      <p style={{ color: INK.dim, fontSize: 16, lineHeight: 1.6, maxWidth: 580, margin: "14px auto 0" }}>
        Every card is a line of Python. Stack them in the order code runs, hit <b style={{ color: INK.text }}>Run</b>, and cast the whole thing at once. A failed run costs nothing.
      </p>
      <p style={{ color: INK.faint, fontSize: 13.5, margin: "12px auto 0", maxWidth: 540 }}>
        Four foes. Each is weak to one school.
      </p>
      <button className="btn" onClick={onStart} style={{ marginTop: 22, padding: "13px 30px", borderRadius: 3, fontFamily: "'Vollkorn', Georgia, serif", fontWeight: 700, fontSize: 16, background: INK.candle, color: INK.onAccent }}>Begin the Duel</button>
    </div>
  );
}

function DuelEnd({ win, onAgain }) {
  return (
    <div style={{ background: INK.pageHi, border: `1.5px solid ${win ? INK.candle : INK.oxblood}88`, borderRadius: "2px 2px 2px 18px", padding: "34px 24px", textAlign: "center" }}>
      <div className="arc" style={{ fontSize: 13, color: win ? INK.candle : INK.oxblood, letterSpacing: 2 }}>{win ? "THE GRIMOIRE IS CLEAN" : "THE CORRUPTION SPREADS"}</div>
      <div className="arc" style={{ fontSize: 30, fontWeight: 700, color: INK.text, marginTop: 4 }}>{win ? "Victory" : "You Fall"}</div>
      <p style={{ color: INK.text, fontSize: 16, lineHeight: 1.6, fontStyle: "italic", maxWidth: 560, margin: "16px auto 0" }}>
        {win
          ? "You knew the spells, and you knew the order they belong in. That second part is the one people skip."
          : "A script out of order is only early. Tools first, then the thing you build with them. Come back when it sits right."}
      </p>
      <button className="btn" onClick={onAgain} style={{ marginTop: 22, padding: "12px 28px", borderRadius: 3, fontFamily: "'Vollkorn', Georgia, serif", fontWeight: 700, fontSize: 15, background: win ? INK.candle : INK.verdigris, color: INK.onAccent }}>
        {win ? "Duel again" : "Try again"}
      </button>
    </div>
  );
}

function Overlay({ title, subtitle, children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(38,29,18,0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 16, zIndex: 65, backdropFilter: "blur(4px)", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: INK.pageHi, border: `1.5px solid ${INK.verdigris}66`, borderRadius: "2px 2px 2px 18px", maxWidth: 700, width: "100%", margin: "24px 0", padding: "26px 24px", position: "relative" }}>
        <button className="btn arc" onClick={onClose} aria-label="Close" style={{ position: "absolute", top: 14, right: 14, color: INK.faint, fontSize: 12, letterSpacing: 1 }}>CLOSE</button>
        <div className="arc" style={{ fontSize: 24, fontWeight: 700, color: INK.candle }}>{title}</div>
        <div style={{ color: INK.dim, fontSize: 14, fontStyle: "italic", margin: "4px 0 18px" }}>{subtitle}</div>
        {children}
      </div>
    </div>
  );
}

function pill(color) {
  return { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color, border: `1px solid ${color}55`, borderRadius: 99, padding: "6px 12px", fontFamily: "'Vollkorn', Georgia, serif" };
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (this.state.err) {
      return (
        <div style={{ maxWidth: 620, margin: "40px auto", padding: 24, borderRadius: 3, background: INK.page, border: `1.5px solid ${INK.oxblood}`, color: INK.text, fontFamily: "'Vollkorn', Georgia, serif" }}>
          <div style={{ fontFamily: "'Vollkorn', Georgia, serif", fontWeight: 700, color: INK.oxblood, fontSize: 18, marginBottom: 8 }}>A rune misfired in {this.props.label}.</div>
          <div style={{ color: INK.dim, fontSize: 14, lineHeight: 1.5 }}>{String((this.state.err && this.state.err.message) || this.state.err)}</div>
          <button onClick={() => this.setState({ err: null })} style={{ marginTop: 16, cursor: "pointer", border: "none", borderRadius: 2, padding: "9px 18px", background: INK.verdigris, color: INK.onAccent, fontFamily: "'Vollkorn', Georgia, serif", fontWeight: 700 }}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function DeskTab({ active, onClick, label }) {
  return (
    <button onClick={onClick} style={{ cursor: "pointer", border: `1.5px solid ${active ? INK.candle : INK.line}`, background: active ? INK.pageHi : "transparent", color: active ? INK.text : INK.dim, borderRadius: 99, padding: "8px 20px", fontFamily: "'Vollkorn', Georgia, serif", fontWeight: 700, fontSize: 14, letterSpacing: .5, display: "inline-flex", alignItems: "center", gap: 8 }}>
      {label}
    </button>
  );
}

const workById = Object.fromEntries(WORK.map((s) => [s.id, s]));

function WorkTrace({ hands, onDone, onMiss, color }) {
  const [handIdx, setHandIdx] = useState(0);
  const [trayOrder, setTrayOrder] = useState(() => shuffled(hands[0].runes.length));
  const [laid, setLaid] = useState([]);
  const [fizzle, setFizzle] = useState(false);
  const [reveal, setReveal] = useState(false);
  const thisHand = hands[handIdx];
  const trayLeft = trayOrder.filter((i) => !laid.includes(i));
  const full = laid.length === thisHand.runes.length;
  const place = (i) => { if (laid.includes(i)) return; setFizzle(false); setLaid((p) => [...p, i]); };
  const lift = (i) => setLaid((p) => p.filter((x) => x !== i));
  const cast = () => {
    const ok = full && laid.every((v, i) => thisHand.runes[v] === thisHand.runes[i]);
    if (!ok) { onMiss(); setFizzle(true); setTimeout(() => setFizzle(false), 550); return; }
    if (handIdx + 1 < hands.length) { const n = handIdx + 1; setHandIdx(n); setTrayOrder(shuffled(hands[n].runes.length)); setLaid([]); setReveal(false); }
    else onDone();
  };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span className="arc mono" style={{ fontSize: 11.5, color: INK.faint, letterSpacing: 1 }}>PASS {handIdx + 1} OF {hands.length} · {thisHand.ctx.toUpperCase()}</span>
        <div style={{ display: "flex", gap: 4 }}>{hands.map((_, i) => <span key={i} style={{ width: 7, height: 7, borderRadius: 99, background: i < handIdx ? color : i === handIdx ? INK.candle : INK.line }} />)}</div>
      </div>
      <div style={{ fontSize: 13.5, color: INK.dim, marginBottom: 10, lineHeight: 1.45 }}>{thisHand.note}</div>
      <div className={fizzle ? "fizzle" : ""} style={{ minHeight: 44, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", padding: "8px 10px", borderRadius: 2, background: INK.ink, border: `1px dashed ${fizzle ? "#8f3a2a" : INK.line}`, marginBottom: 12 }}>
        {laid.length === 0 && <span style={{ color: INK.faint, fontSize: 13, fontStyle: "italic" }}>Put the tokens here, left to right…</span>}
        {laid.map((idx, pos) => (
          <button key={idx} className="rune mono" onClick={() => lift(idx)} title="lift" style={{ fontSize: 13, padding: "6px 10px", borderRadius: 8, background: `${color}22`, border: `1px solid ${color}`, color: INK.text }}>
            <span style={{ color, fontSize: 10, marginRight: 4 }}>{pos + 1}</span>{thisHand.runes[idx]}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {trayLeft.map((idx) => (
          <button key={idx} className="rune mono" onClick={() => place(idx)} style={{ fontSize: 13, padding: "7px 11px", borderRadius: 8, background: INK.page, border: `1px solid ${INK.lineHi}`, color: INK.dim }}>{thisHand.runes[idx]}</button>
        ))}
        {trayLeft.length === 0 && <span style={{ color: INK.faint, fontSize: 13, fontStyle: "italic", padding: "6px 0" }}>All runes laid. Cast it.</span>}
      </div>
      {fizzle && <div style={{ color: "#8f3a2a", fontSize: 13, marginTop: 10 }}>Not in order. Read the line once, then lay the runes again.</div>}
      <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn" disabled={!full} onClick={cast} style={{ padding: "9px 18px", borderRadius: 2, fontWeight: 700, fontFamily: "'Vollkorn', Georgia, serif", fontSize: 14, background: full ? color : INK.ink, color: full ? INK.ink : INK.faint, cursor: full ? "pointer" : "default" }}>{handIdx + 1 < hands.length ? "Cast" : "Cast (final)"}</button>
        <button className="btn" onClick={() => { setLaid([]); setFizzle(false); }} style={{ fontSize: 12.5, color: INK.dim, display: "flex", alignItems: "center", gap: 5 }}>clear</button>
        <button className="btn" onClick={() => setReveal((r) => !r)} style={{ marginLeft: "auto", fontSize: 12.5, color: INK.dim, display: "flex", alignItems: "center", gap: 5 }}>{reveal ? "hide" : "study"}</button>
      </div>
      {reveal && <pre className="mono codeleaf" style={{ marginTop: 10, background: INK.ink, border: `1px solid ${INK.line}`, borderRadius: 8, padding: 12, fontSize: 12.5, color, overflowX: "auto", lineHeight: 1.6, whiteSpace: "pre" }}>{thisHand.code}</pre>}
    </div>
  );
}

function WorkingWorld({ inscribed, setInscribed, setMisdraws }) {
  const [openSpell, setOpenSpell] = useState(null);
  const [justDone, setJustDone] = useState(false);
  const inked = new Set(Object.keys(inscribed).filter((k) => inscribed[k]));
  const open = (id) => { setOpenSpell(id); setJustDone(false); };
  return (
    <div style={{ color: INK.text, minHeight: "100vh", fontFamily: "'Vollkorn', Georgia, serif", padding: "clamp(14px, 3.5vw, 34px)" }}>
      <div style={{ maxWidth: 1060, margin: "0 auto" }}>
        <div className="arc" style={{ fontSize: "clamp(26px,4.5vw,42px)", fontWeight: 700, display: "flex", alignItems: "center", gap: 12 }}>The Working World</div>
        <div style={{ color: INK.dim, fontSize: 15, marginTop: 8, maxWidth: 700, lineHeight: 1.5 }}>The scripts someone is paying for. Same tracing, harder material, nothing explained twice.</div>
        {Object.keys(WORK_SCHOOL).map((key) => {
          const sc = WORK_SCHOOL[key];
          const spells = WORK.filter((s) => s.school === key);
          return (
            <div key={key} style={{ marginTop: 30 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: sc.color }} />
                <span className="arc" style={{ fontSize: 21, fontWeight: 700, color: sc.color }}>{sc.name}</span>
                <span className="mono" style={{ fontSize: 12, color: INK.faint }}>{spells.filter((s) => inked.has(s.id)).length}/{spells.length}</span>
              </div>
              <div style={{ color: INK.dim, fontSize: 13.5, marginBottom: 14, lineHeight: 1.45, maxWidth: 640 }}>{sc.blurb}</div>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                {spells.map((s) => {
                  const on = inked.has(s.id);
                  const locked = s.from && !inked.has(s.from);
                  return (
                    <button key={s.id} className={locked ? "" : "page-card"} onClick={() => { if (!locked) open(s.id); }} style={{ textAlign: "left", cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.62 : 1, background: on ? `${sc.color}16` : INK.page, border: `1.5px solid ${on ? sc.color : INK.line}`, borderRadius: 3, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span className="arc" style={{ fontSize: 11, letterSpacing: 1, color: on ? sc.color : INK.faint }}>RANK {s.rank}</span>
                        <span className="arc" style={{ fontSize: 10, letterSpacing: 1, color: on ? sc.color : INK.faint }}>{on ? "INKED" : locked ? "SHUT" : ""}</span>
                      </div>
                      <div>
                        <div className="arc" style={{ fontSize: 18, fontWeight: 700, color: on ? sc.color : locked ? INK.faint : INK.text, lineHeight: 1.1 }}>{s.name}</div>
                        <div style={{ fontSize: 12.5, color: INK.dim, marginTop: 2 }}>{locked ? `Inscribe ${spellById[s.from].name} first` : s.real}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {openSpell && (() => {
        const s = workById[openSpell];
        const sc = WORK_SCHOOL[s.school];
        const on = inked.has(s.id);
        return (
          <div onClick={() => setOpenSpell(null)} style={{ position: "fixed", inset: 0, background: "rgba(38,29,18,0.52)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50, backdropFilter: "blur(3px)" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: INK.pageHi, border: `1.5px solid ${sc.color}`, borderRadius: "2px 18px 2px 2px", maxWidth: 560, width: "100%", maxHeight: "92vh", overflowY: "auto", padding: 22, position: "relative" }}>
              <button className="btn arc" onClick={() => setOpenSpell(null)} aria-label="Close" style={{ position: "absolute", top: 14, right: 14, color: INK.faint, fontSize: 12, letterSpacing: 1 }}>CLOSE</button>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <div className="arc mono" style={{ fontSize: 12, color: INK.faint }}>{sc.name.toUpperCase()} · RANK {s.rank}</div>
                  <div className="arc" style={{ fontSize: 26, fontWeight: 700, color: sc.color, lineHeight: 1.05 }}>{s.name}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: INK.text, marginTop: 3 }}>{s.real}</div>
                </div>
              </div>
              <p style={{ color: INK.dim, fontSize: 15, lineHeight: 1.55, marginTop: 12 }}>{s.desc}</p>
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                <MemoryRow color={sc.color} label="SAY IT">{s.say}</MemoryRow>
                <MemoryRow color={INK.candle} label="REACH FOR IT WHEN">{s.when}</MemoryRow>
                <MemoryRow color="#8a5220" label="WATCH FOR">{s.gotcha}</MemoryRow>
              </div>
              <div style={{ marginTop: 16, padding: 14, borderRadius: 3, background: INK.ink, border: `1px solid ${INK.line}` }}>
                {on && !justDone ? (
                  <div style={{ textAlign: "center", padding: "6px 0" }}>
                    <div style={{ fontSize: 15, color: sc.color, fontWeight: 600 }}>Inscribed.</div>
                    <button className="btn" onClick={() => setInscribed((m) => ({ ...m, [s.id]: false }))} style={{ marginTop: 10, fontSize: 12.5, color: INK.faint, border: `1px solid ${INK.line}`, borderRadius: 99, padding: "5px 14px" }}>trace again</button>
                  </div>
                ) : justDone ? (
                  <div className="ignite" style={{ textAlign: "center", padding: "6px 0" }}>
                    <div style={{ fontSize: 15, color: INK.candle, fontWeight: 600 }}>Inscribed. Three passes, three shapes.</div>
                    <div style={{ fontSize: 13, color: INK.dim, marginTop: 8 }}>Now use it in a real file.</div>
                  </div>
                ) : (
                  <WorkTrace key={openSpell} hands={TRADE_HANDS[s.id]} color={sc.color}
                    onDone={() => { setInscribed((m) => ({ ...m, [s.id]: true })); setJustDone(true); }}
                    onMiss={() => setMisdraws((m) => ({ ...m, [s.id]: (m[s.id] || 0) + 1 }))} />
                )}
              </div>
              <div style={{ marginTop: 12, padding: 12, borderRadius: 2, background: `${sc.color}12`, border: `1px solid ${sc.color}44`, fontSize: 14, color: INK.text, display: "flex", gap: 8 }}>
                <span><b className="arc" style={{ color: sc.color }}>ON THE JOB.</b> {s.mission}</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: INK.page, border: `1.5px solid ${INK.line}`, borderTop: `3px solid ${color || INK.candle}`, borderRadius: 3, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
      <div className="arc" style={{ fontSize: 12, letterSpacing: 1, color: INK.faint }}>{label}</div>
      <div className="arc" style={{ fontSize: 25, fontWeight: 700, color: INK.text, lineHeight: 1.05 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: INK.dim }}>{sub}</div>}
    </div>
  );
}

function SchoolWheel({ perSchool }) {
  const N = perSchool.length, R = 86, cx = 195, cy = 132;
  const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / N;
  const pt = (i, r) => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];
  const ringPts = (f) => perSchool.map((_, i) => pt(i, R * f).map((n) => n.toFixed(1)).join(",")).join(" ");
  const dataPts = perSchool.map((s, i) => pt(i, R * s.frac).map((n) => n.toFixed(1)).join(",")).join(" ");
  return (
    <svg viewBox="0 0 390 270" style={{ width: "100%", height: "auto", display: "block" }}>
      {[0.25, 0.5, 0.75, 1].map((f) => <polygon key={f} points={ringPts(f)} fill="none" stroke={INK.line} strokeWidth="1" opacity={f === 1 ? 0.9 : 0.45} />)}
      {perSchool.map((s, i) => {
        const e = pt(i, R); const l = pt(i, R + 18);
        const anchor = Math.abs(l[0] - cx) < 6 ? "middle" : l[0] > cx ? "start" : "end";
        return (<g key={s.key}>
          <line x1={cx} y1={cy} x2={e[0]} y2={e[1]} stroke={INK.line} strokeWidth="1" opacity="0.55" />
          <text x={l[0]} y={l[1]} textAnchor={anchor} className="arc" fontSize="12" fill={s.color} fontWeight="700">{s.name}</text>
          <text x={l[0]} y={l[1] + 14} textAnchor={anchor} className="mono" fontSize="10.5" fill={INK.faint}>{s.inscr}/{s.total}</text>
        </g>);
      })}
      <polygon points={dataPts} fill={`${INK.candle}30`} stroke={INK.candle} strokeWidth="2" strokeLinejoin="round" />
      {perSchool.map((s, i) => { const v = pt(i, R * s.frac); return <circle key={s.key} cx={v[0]} cy={v[1]} r="4" fill={s.color} stroke={INK.ink} strokeWidth="1.5" />; })}
    </svg>
  );
}

function schoolStanding(spells, schoolMap, inked, misdraws) {
  return Object.keys(schoolMap).map((key) => {
    const sp = spells.filter((s) => s.school === key);
    const inscr = sp.filter((s) => inked.has(s.id)).length;
    const stumbles = sp.reduce((a, s) => a + (misdraws[s.id] || 0), 0);
    return { key, name: schoolMap[key].name, color: schoolMap[key].color, inscr, total: sp.length, frac: sp.length ? inscr / sp.length : 0, stumbles };
  });
}

function reading(spell, inked, misdraws) {
  const slips = misdraws[spell.id] || 0;
  const known = inked.has(spell.id);
  if (!known && !slips) {
    return { label: "No reading", ink: INK.faint,
      why: "You haven't opened this one, so there's nothing to go on." };
  }
  if (!known) {
    return { label: "Forming", ink: FORMING_INK,
      why: `Opened, not finished. ${slips} wrong ${slips === 1 ? "ordering" : "orderings"} so far.` };
  }
  if (slips === 0) {
    return { label: "Solid", ink: INSCRIBED_INK,
      why: "Laid correctly in all three contexts, first try each time." };
  }
  if (slips <= 3) {
    return { label: "Solid", ink: INSCRIBED_INK,
      why: `Held in all three contexts after ${slips} wrong ${slips === 1 ? "ordering" : "orderings"}.` };
  }
  return { label: "Known, with friction", ink: FORMING_INK,
    why: `It held, but it took ${slips} wrong orderings to get there. Worth another pass.` };
}

function Gauge({ filled, ink }) {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="6" cy="6" r="5" fill="none" stroke={ink} strokeWidth="1.5" />
      {filled && <path d="M6 1 A5 5 0 0 1 6 11 Z" fill={ink} />}
    </svg>
  );
}

function ModelReadout({ spells, inked, misdraws, track }) {
  const rows = spells
    .map((s) => ({ spell: s, r: reading(s, inked, misdraws) }))
    .filter((x) => x.r.label !== "No reading" || false);
  const seen = rows.length;
  const friction = rows.filter((x) => x.r.label === "Known, with friction");
  const forming = rows.filter((x) => x.r.label === "Forming");

  return (
    <div>
      <p style={{ color: INK.dim, fontSize: 14, lineHeight: 1.55, margin: "0 0 14px", maxWidth: 620 }}>
        This is what the app can actually see, which is less than it sounds like. It watches the order
        you put tokens in and nothing else. It can't see whether you did the Apprentice Task in a real
        file, and that's the part that decides whether you know this.
      </p>

      {seen === 0 ? (
        <div style={{ background: INK.page, border: `1.5px dashed ${INK.line}`, padding: "14px 16px" }}>
          <div className="arc" style={{ fontSize: 15, color: INK.dim }}>Nothing measured yet.</div>
          <div style={{ fontSize: 13.5, color: INK.faint, marginTop: 4 }}>
            Open a spell and put its tokens in order. One reading isn't much, but it's a start.
          </div>
        </div>
      ) : (
        <>
          <div className="mono" style={{ fontSize: 12.5, color: INK.faint, marginBottom: 10, letterSpacing: .3 }}>
            {seen} of {spells.length} {track} spells have a reading
            {seen < 5 ? ". Too few to say much yet." : "."}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[...forming, ...friction].slice(0, 8).map(({ spell, r }) => (
              <div key={spell.id} style={{ display: "flex", gap: 14, alignItems: "baseline",
                padding: "11px 2px", borderTop: `1px solid ${INK.line}` }}>
                <span style={{ minWidth: 22, paddingTop: 5 }}>
                  <Gauge filled={r.label !== "Forming"} ink={r.ink} />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="arc" style={{ fontWeight: 600, fontSize: 15.5, color: INK.text }}>{spell.name}</div>
                  <div style={{ fontSize: 13, color: INK.dim, marginTop: 2 }}>{r.why}</div>
                </div>
                <span className="arc" style={{ fontSize: 12, color: r.ink, letterSpacing: .5, whiteSpace: "nowrap" }}>
                  {r.label}
                </span>
              </div>
            ))}
          </div>
          {forming.length + friction.length === 0 && (
            <div style={{ fontSize: 13.5, color: INK.dim, paddingTop: 10, borderTop: `1px solid ${INK.line}` }}>
              Everything with a reading came out solid. That's either good work or not enough evidence.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SchoolBars({ per }) {
  return (
    <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
      {per.map((s) => (
        <div key={s.key} style={{ background: INK.page, border: `1.5px solid ${INK.line}`, borderRadius: 3, padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: s.color, flex: "0 0 auto" }} />
            <span className="arc" style={{ fontWeight: 700, fontSize: 15.5, color: s.color }}>{s.name}</span>
            <span className="mono" style={{ fontSize: 12, color: INK.faint }}>{s.inscr}/{s.total}</span>
            {s.stumbles > 0 && <span style={{ marginLeft: "auto", fontSize: 12, color: INK.candle }}>{s.stumbles}</span>}
          </div>
          <div style={{ height: 8, borderRadius: 99, background: INK.ink, overflow: "hidden" }}>
            <div style={{ width: `${Math.round(s.frac * 100)}%`, height: "100%", background: s.color, borderRadius: 99 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Profile({ inscribed, cleared, misdraws }) {
  const inked = new Set(Object.keys(inscribed).filter((k) => inscribed[k]));
  const storyDone = SPELL.filter((s) => inked.has(s.id)).length;
  const workDone = WORK.filter((s) => inked.has(s.id)).length;
  const rank = RANKS.find(([n]) => storyDone >= n)[1];
  const labsCleared = Object.keys(cleared).filter((k) => cleared[k]).length;
  const storyRetraces = SPELL.reduce((a, s) => a + (misdraws[s.id] || 0), 0);
  const workRough = WORK.reduce((a, s) => a + (misdraws[s.id] || 0), 0);
  const storyPer = schoolStanding(SPELL, SCHOOL, inked, misdraws);
  const workPer = schoolStanding(WORK, WORK_SCHOOL, inked, misdraws);
  return (
    <div style={{ color: INK.text, minHeight: "100vh", fontFamily: "'Vollkorn', Georgia, serif", padding: "clamp(14px, 3.5vw, 34px)" }}>
      <div style={{ maxWidth: 1060, margin: "0 auto" }}>
        <div className="arc" style={{ fontSize: "clamp(26px,4.5vw,40px)", fontWeight: 700, display: "flex", alignItems: "center", gap: 12 }}>Your Standing</div>
        <div style={{ color: INK.dim, fontSize: 15, marginTop: 8, maxWidth: 700, lineHeight: 1.45 }}>Two ledgers, kept apart.</div>

        <div style={{ background: INK.page, border: `1px solid ${INK.line}`, borderRadius: "2px 2px 2px 18px", padding: "18px 18px 24px", marginTop: 22 }}>
          <div className="arc" style={{ fontSize: 22, fontWeight: 700, color: SCHOOL.inscription.color, display: "flex", alignItems: "center", gap: 10 }}>Story Mode</div>
          <div style={{ color: INK.dim, fontSize: 13.5, marginTop: 4, marginBottom: 14 }}>Basics through advanced.</div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: "1 1 340px", minWidth: 300 }}><div className="arc" style={{ fontSize: 12.5, color: INK.faint, letterSpacing: 1, marginBottom: 2 }}>STANDING BY SCHOOL</div><SchoolWheel perSchool={storyPer} /></div>
            <div style={{ flex: "1 1 300px", minWidth: 280, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <StatCard label="RANK" value={rank} color={INK.candle} />
              <StatCard label="SPELLS INSCRIBED" value={`${storyDone}/${SPELL.length}`} color={INK.verdigris} />
              <StatCard label="LABYRINTHS" value={`${labsCleared}/${LABYRINTH.length}`} color="#4a6238" />
              <StatCard label="RETRIES" value={storyRetraces} sub="wrong orderings" color={INK.brass} />
            </div>
          </div>
          <SchoolBars per={storyPer} />
          <div className="arc" style={{ fontSize: 17, fontWeight: 700, marginTop: 24, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>What this can tell</div>
          <ModelReadout spells={SPELL} inked={inked} misdraws={misdraws} track="story" />
        </div>

        <div style={{ background: INK.page, border: `1px solid ${INK.line}`, borderRadius: "2px 18px 2px 2px", padding: "18px 18px 24px", marginTop: 22 }}>
          <div className="arc" style={{ fontSize: 22, fontWeight: 700, color: INK.text, display: "flex", alignItems: "center", gap: 10 }}>The Working World</div>
          <div style={{ color: INK.dim, fontSize: 13.5, marginTop: 4, marginBottom: 14 }}>Harder, nicher, less forgiving.</div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: "1 1 340px", minWidth: 300 }}><div className="arc" style={{ fontSize: 12.5, color: INK.faint, letterSpacing: 1, marginBottom: 2 }}>STANDING BY SCHOOL</div><SchoolWheel perSchool={workPer} /></div>
            <div style={{ flex: "1 1 300px", minWidth: 280, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <StatCard label="TRADE SPELLS" value={`${workDone}/${WORK.length}`} color="#8a4f26" />
              <StatCard label="RETRIES" value={workRough} sub="wrong orderings" color={INK.brass} />
            </div>
          </div>
          <SchoolBars per={workPer} />
          <div className="arc" style={{ fontSize: 17, fontWeight: 700, marginTop: 24, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>What this can tell</div>
          <ModelReadout spells={WORK} inked={inked} misdraws={misdraws} track="trade" />
        </div>
      </div>
    </div>
  );
}

function Spellbook() {
  const [mode, setMode] = useState("story");
  const [inscribed, setInscribed] = useState(() => readGrimoire().inscribed || {});
  const [cleared, setCleared] = useState(() => readGrimoire().cleared || {});
  const [misdraws, setMisdraws] = useState(() => readGrimoire().misdraws || {});
  return (
    <div className="ground" style={{ minHeight: "100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Vollkorn:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=IBM+Plex+Mono:wght@400;500&display=swap');
${GRAIN_CSS}
${SCROLL_CSS}`}</style>
      <div style={{ display: "flex", justifyContent: "center", gap: 10, padding: "18px 16px 4px" }}>
        <DeskTab active={mode === "story"} onClick={() => setMode("story")} label="Story Mode" />
        <DeskTab active={mode === "work"} onClick={() => setMode("work")} label="Working World" />
        <DeskTab active={mode === "duel"} onClick={() => setMode("duel")} label="Spell Duel" />
        <DeskTab active={mode === "profile"} onClick={() => setMode("profile")} label="Your Standing" />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "8px 16px 0", maxWidth: 360, margin: "0 auto", color: INK.candle }}>
        <span style={{ flex: 1, height: 1, background: `${INK.candle}44` }} />
      </div>
      <div style={{ display: mode === "story" ? "block" : "none" }}>
        <ErrorBoundary label="Story Mode"><Grimoire inscribed={inscribed} setInscribed={setInscribed} cleared={cleared} setCleared={setCleared} misdraws={misdraws} setMisdraws={setMisdraws} /></ErrorBoundary>
      </div>
      {mode === "work" && <ErrorBoundary label="the Working World"><WorkingWorld inscribed={inscribed} setInscribed={setInscribed} setMisdraws={setMisdraws} /></ErrorBoundary>}
      {mode === "duel" && <ErrorBoundary label="the Spell Duel"><SpellDuel inscribed={inscribed} /></ErrorBoundary>}
      {mode === "profile" && <ErrorBoundary label="Your Standing"><Profile inscribed={inscribed} cleared={cleared} misdraws={misdraws} /></ErrorBoundary>}
    </div>
  );
}

export default function App() {
  return <ErrorBoundary label="the spellbook"><Spellbook /></ErrorBoundary>;
}
