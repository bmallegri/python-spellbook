# Python Spellbook: design history

Notes to myself. What I tried, what I threw out, what's still wrong. Not the README.

---

## Where this came from

I kept watching people finish a course and then sit in front of a blank file with nothing coming. They could read code and they could follow along in a video, but the second the file was empty there was nothing.

Here's what I think happens. A tutorial only ever asks you to recognize something, and recognizing is
not producing. So the rule I built everything else around is that you never see the answer while you
are making it. The tokens show up scrambled and you put them in order from memory. If you want the real
line you open the study panel, read it, close it again, and then draw it. That one constraint decided
most of the rest of the design.

Second thing I believe about this: one worked example is worth almost nothing. If the only `for` loop
you ever see runs over a list of prices, you have learned that example, not the loop. So a page will not
fill in until you have laid the same spell correctly in three different situations. This is the part
people push back on hardest and the part I won't move on.

Third: the app isn't where the learning happens. Every spell carries a `mission`, shown as the
Apprentice Task, and it tells you to go write the thing in a real file on your own machine. The exercise in the app is practice and the file is proof, which is why twelve spells with twelve real files
beats all seventy of them with none.

Everything in the data model comes out of those three. `misdraws` counts every wrong ordering and the
profile puts the worst ones in front of you instead of hiding them, because forgetting is expected and
pretending otherwise is how you lose somebody. `from` locks a spell until its parent is inscribed, so
prerequisites actually hold. And failing is free everywhere: a wrong order just fizzles, a failed Run in
the duel costs nothing at all. Only the real file has stakes.

Still owe this section the actual moment that set the whole thing off. I know what it was; I've just not typed it out yet.

## Why a witch's atelier

Witch Hat Atelier, mostly, where the drawing is the spell instead of decoration sitting on top of it.
That maps onto code almost too cleanly. Little Witch Academia for the shape of an apprentice and a teacher,
and Madoka for labyrinths as bounded set-pieces. Omori for smudged monochrome opening into color,
which is where the locked pages came from; an unlearnable spell isn't greyed out and disabled, it is
smudged ink you can't read yet.

The theme carries weight I couldn't get any other way. Learning to code is demoralizing for reasons
that have nothing to do with how hard the material is, and Mirabelle is there to absorb that. She is not
a mascot and she doesn't cheer. Eleven apprentices, all eleven gone, so she has something riding on
whether you stay. You're the twelfth, which is where the title comes from.

## What the spells actually teach

Three hooks on every spell. `say` is the line read aloud in plain English and it's the one I care most
about, because if you can say what a line does you can write it without having memorized its shape.
`image` is a scene to hang the mechanism on. `when` is the real-world trigger, which is the thing
tutorials skip and the reason people know what a dictionary is and never once reach for one.

I write the images strange on purpose, because odd pictures stick and tidy ones slide right off. The variables hook is not
a labelled jar, it's Mirabelle writing on the lid before she fills it, because a jar you fill first and
name later is one you open in six months without recognizing. Stranger, and it teaches a habit instead
of a category.

Some images I rewrote because they were comforting and wrong, which is worse than being dull. Exceptions
used to be a bridge that might crack with a safety net underneath. A net catches you and you're fine, so
that picture teaches the opposite of what `except` does. It ends on "You still have no number. You have a
plan for having no number" now. Others went for being too general to hold: the cookie cutter for classes,
the turtle shell for virtualenvs, the stack of plates for stacks, the courtroom for hypothesis testing.
Every image comes out of the atelier or the tea house now, so the world and the explanation hold each
other up instead of sitting next to each other.

Every spell also names the specific way it goes wrong, and I always pick the quiet failure over the loud
one. Mutable default arguments, `.sort()` returning None, shallow copies quietly sharing their inner objects.
These are the ones that eat an afternoon, and no tutorial mentions them because tutorial code works.

The duel is the piece I'm proudest of. Cards carry a tier from 1 (Import) to 6 (Prove) and a working
only compiles if the tiers climb. Get it wrong and you get a real `NameError` naming the actual undefined
value, with the offending line highlighted. Weave stays locked until the working runs clean, so you can
never cast code that wouldn't execute. It teaches the one thing you can't pick up from reading: a
program is an ordered sequence, and that order isn't a style preference.

One duel detail took me far too long. Three cards are guaranteed in every draw so a hand always has a
spine that runs clean, and an output card gets forced in if none turns up. Before that, a bad draw
produced a turn where nothing you did printed anything, and every single tester read that as the game
being broken rather than their code being wrong.

## The palette took four goes

This moved more than anything else, and the order is the useful part.

It started warm ink and gold, but not consolidated. A mint green, a candy pink, a bright buttercup, and a
variable named `amethyst` holding a teal value, which tells you exactly how much attention that file had
been getting. Every modal and the code panel sat on a cold blue-black that fought the warm browns
underneath it.

Second go pulled everything onto one ground: gall ink and vellum, with accents off the tea shelf that
already runs through every code sample in the game. Chai, matcha, cocoa, honey, with verdigris kept as the only cool note in the whole set. Twelve schools need twelve accents you can tell apart, so anything near monochrome was out.

Third go fixed the ground. Near-black, with two soft colored washes bleeding in from the top corners, and
the washes were the problem rather than the darkness. They made the ground read as atmosphere behind the
book instead of a surface the book sits on. Flat tobacco `#221a13` with a fine grain over it, so it reads
as paper.

Still wrong. Two dark browns had failed by then, which should have told me the whole dark end was the
mistake and did not. Fourth go flipped to light parchment: ground `#e6dcc4`, panels `#f1ead8`, ink
`#2b2118`.

That flip broke something I didn't see coming. A set of buttons and badges were using `INK.ink` as a
foreground color, for text sitting on gold and verdigris fills. The second `ink` went from near-black to
near-white, every one of them would have been white on white. The fix was a separate `INK.onAccent`
token, and eight call sites use it now. The lesson I want to keep: never let a token name say where a
color sits instead of what it does. All twelve school colors had to come down in value to stay legible
too, so the palette doesn't invert cleanly any more.

The flip cost me something real. The code panel used to be a light vellum sheet on a dark ground and it
read hard as a page tipped into a book. On a light ground that contrast is just gone. It uses a tanner
`#ded0aa` against the lighter page now, which still reads as an inserted sheet but with much less force.
It's the one thing that was better before.

## The sigils, which I built twice and then deleted

Longest thread in the project and there's nothing left of it in the code.

Every spell used to have a drawn SVG mark inside a frame; a circle at r=46, a dashed circle at r=37, eight
evenly spaced radial ticks. Inside sat what was basically an icon set. A rounded rectangle for a jar, a
shield for the ward, three stacked lines for a list, a magnifying glass for the debugger.

The frame was the real problem. Identical on all of them, so at card size every spell read as the same
object with a different center, and the rings ate the space the mark needed to be legible in the first
place.

So the frame went and I cut 31 new marks as merchant's house marks, the kind carved into a beam to claim
it. One alphabet across all of them: a stem, arms, sometimes a ring or a dot. Square ends, mitred corners,
two stroke weights, uneven arms, nothing centered.

Eleven of the 31 needed doing twice. The magnifier, speech bubble, eye, browser window, download arrow and
transfer arrows still read as interface icons even after being redrawn in the new style. Restyling does
not fix an icon if the referent is still a UI metaphor. A magnifying glass is a magnifying glass at any stroke weight.

Then I cut all of it and went text-only anyway. `shapeEls`, `Glyph`, `Sigil`, `Mark`, the `SIG_OF` lookup, and the
`glyph` and `sig` fields on all 70 spells, gone; the icon library and all 29 of its icons went with them,
along with every arrow, `№`, `≈`, `×` and `▍`. There isn't one non-punctuation glyph left in the file.

Text and layout carry it now, and honestly most of it's better. Spell cards traded the sigil block for a
hairline rule under the page number with the name at 20px doing the identifying, and card height dropped
from 182 to 126. Rank badges went from `✦✦✦` to `RANK 3`. The enemy intent tag went from a sword icon and
a number to `strikes for 5`. Labyrinth kits used to be rows of tiny sigils and are named chips now, which
is a straight win; you can read what's in a kit without hovering over every single item.

One mechanic changed shape as a side effect. Sealing a weave used to show the keystone's name and ask you
to pick its shape out of three. No shapes, no puzzle, so it shows the description and asks for the name instead.
The check survives, but what it tests moved from visual recall to verbal recall, and that happened because
I deleted the art, not because I sat down and decided it. Still not sure it's right.

## Type

Was Cormorant Garamond over Lora with JetBrains Mono. Serif on serif on serif, and not enough contrast
between display and body to build any hierarchy out of.

Vollkorn for display now, Alegreya Sans for body, IBM Plex Mono for code. Vollkorn has more weight in the
stems and slightly rustic proportions, which suits a working book more than an elegant one. Taking the
body out of serif did the most work of the three changes, because it gives the display face something to
be different from.

I haven't read it at length yet. If Vollkorn turns out too heavy at display sizes, Faustina or Petrona
keep the character with lighter color on the page.

## Names

Every spell is named after the Python it teaches now, and getting there took three passes.

They started as fantasy nouns. Vessel for variables, Reliquary for lists and dicts, The Kept Hand for
functions, Warding Circle for exceptions. The first pass fixed the obvious generator patterns, because
there were four spells shaped `[Adjective] Sigil`, five ending in `Rite`, four with `Ward` and three with
`Branching`, and once four names share a suffix the suffix stops carrying meaning. The second pass went
for names that sounded like they had a past; Thornwood Tea House became Bettany's, because somewhere named
after whoever runs it implies a person and two scenery nouns bolted together imply nobody.

Both passes were solving the wrong problem. A name like The Second Answer is a nice name and it tells a
stranger nothing, and a stranger scrolling a repo is exactly who has to understand this in two seconds.
So all 97 of them are plain now. Variables. Control Flow. Exceptions. Comprehensions. venv and pip.
Magic Methods. Walrus Operator. Average length went from about 2.3 words to 1.4, and every name is the
thing it teaches.

The theme did not die with them. It moved entirely into the `image` hooks, where it belongs, because
that's the part doing actual teaching work; the jar with the label written before it's filled, the kettle
handing you a wet leaf instead of a number, the spike of receipts by the till. A spell called Exceptions
with a strange image attached is more use than a spell called The Second Answer with the same image.

Renaming the duel cards left ten of them printing their own name twice, since the card shows a name and a
short description and Import sat above import. Those ten descriptions say something useful now.

Some interface words went the same way. THE WORKING was the duel's term for the assembled program and it's
THE SCRIPT now, which is what it is. TRACE THE SIGIL became PUT IT IN ORDER. The scrambled pieces were
runes and they're tokens, which is the real word for them and one you'll meet again outside this game.

## Cutting the story, which was the right call

Mirabelle used to have an arc. Four acts with an intro and a closing beat each, a finale when the book
filled, a Tale So Far panel with five chapters that unlocked as you finished schools, and a modal that
interrupted you every single time a school completed. I trimmed all of that down to about 40 percent of
its original length and it still felt like too much, so I went and looked at what comparable games
actually do.

Flexbox Froggy is frogs on lilypads and that's the entire fiction; the README doesn't even mention it.
SQL Murder Mystery is one premise sentence and then you're querying. Oh My Git hands you cards and a
terminal. Not one of the successful learn-by-playing games has a plot. They've got a premise you take in
inside four seconds, and after that every bit of design attention goes into the mechanic.

So the plot is gone. `ACTS` keeps its numerals and titles because those label the four schools and give
the spellbook some structure, but the intro and beat dialogue, the finale, the beat modal and the whole
story log are deleted, and `toldBeats` came out of the save with them. The file went from 2,692 lines to
2,582.

What's left is premise instead of plot. One line under the title says Mirabelle has taught eleven
apprentices and all eleven of them left, which is enough to make the game's name mean something. She
still talks on a spell page and when you clear a labyrinth, a line at a time. The atelier vocabulary
stays, because that's the aesthetic rather than the story and the aesthetic is doing real work; the
smudged locked pages, the ink, the tea-house data sitting in every code sample.

The lines she has left are still written to a rule. Could a generic mentor in any game say this? If yes,
rewrite it until only she could. She doesn't land aphorisms, her warm moments get undercut and usually by
her, and she never once reaches for the balanced three-part list.

## Code conventions

Identifiers use the game's own words instead of generic ones: `INK` for the palette, `openSpell`, `hand`
and `hands`, `laid`, `inked`, `misdraws`, `runWorking`, `dealHand`, `pickAny`, `cleared`.

Warning to future me about renaming anything in this file. It's mostly prose and Python samples, so
word-boundary regex isn't safe. `\bdone\b` matches inside `Path("out.txt").write_text("done")`. `\border\b`
matches "in order", "out of order" and "run order" across a dozen strings and JSX text nodes. Mask the string literals first, or do it by hand.

Comments explain decisions only, and nothing else. Five line comments survive, plus a three-line header and a one-line legend
for the say/image/when fields, and every one of them answers why something is there. The note about three
guaranteed cards per hand is the good example.

Storage is `spellbook.save.v1`, renamed with the game after `toldBeats` came out of the shape. Old keys get abandoned rather than migrated, which is
fine right now and won't be fine later. Access goes through `readGrimoire`, `writeGrimoire` and
`burnGrimoire`, and they keep their try/catch because localStorage really does throw in private mode.

## The prologue, and what cutting it cost

The opening overlay is gone. The modal, the `showIntro` state, the header button, the Escape handler, the
story log's prologue chapter, the link back into it. All of it.

Cutting it did fix a live bug, at least. The chapter counter read `1 + completedSchools + finale`, which maxes out at
six, while the label underneath said "of 5". Without the prologue chapter the count is four acts plus the
finale and the label is finally honest.

It also cost me the only onboarding in the whole thing. The prologue carried the four-school breakdown, how
tracing works, what the Apprentice Task is for, and the first lesson, which was Mirabelle telling you to
read every spell out loud instead of memorizing its shape. That last one is probably the most load-bearing
teaching content in the project, because it's the technique that makes the `say` field on all 70 spells do
anything at all.

What's left is a one-line loop summary in the header. A new player starts cold with no way to know the
`say` line is meant to be spoken out loud. Biggest open problem here. It can go in the Tale So Far panel or
a first-run strip under the header without bringing the modal back.

## Things that broke while I was pulling the art out

Writing these down because this pattern will show up again the next time I strip visuals out of a layout.

`SHUT` was drawing directly on top of `RANK n`. The locked badge was absolutely positioned at `top: 12,
right: 14`, which is exactly where the rank sits in the header row, so both of them rendered in the same
spot. Fixed by pulling the locked and inscribed badges out of absolute positioning and into the card's
bottom line, which was already sitting empty on locked cards.

Five buttons ended up with a duplicate `className`, reading `className="btn" ... className="arc"` on the
modal close and cancel controls. React keeps the last one and says nothing, so those five lost `.btn`,
which means no `cursor: pointer` and the browser's default border and grey background coming back. It parses fine and it runs fine, so the only way you catch it is by looking at the thing.

Five JSX conditionals ended up empty, `{locked && }` and things like it, wherever an icon had been the
entire contents of a condition. Useful signal on its own: those five states had no text in them at all.

And kept duel cards had an empty circle sitting on them, a 22px gold badge whose only child had been a pin
icon.

The worst one hid for ages. Renaming `refill(h)` to `dealHand(held)` back at the start of the cleanup left
a single `h` behind, inside the branch that forces an output card into a hand that hasn't got one. That
branch only fires when the random draw comes up without a print or a loop card, so the duel crashed on
maybe one start in ten and ran fine the rest of the time. My checker missed it because it collected every
binding in the file into one set and asked whether the name existed anywhere, which it did; `h` is a
perfectly ordinary parameter name elsewhere. A scope-aware check catches it in a second. Lesson for the
next rename: ask whether a name resolves *in its own scope*, not whether it exists somewhere in the file,
and run anything random enough times to actually hit the rare branch.

## Making it legible to other people

The last pass was about the repo rather than the game. A peer skimming GitHub reads the furniture
before they read a word of the code, and this had almost none of it: no licence, no CI, no lint
config, no tests, no demo.

Tests were the most useful thing I added, and not for the reason I expected. They check the content,
not just the code; every spell has all four hooks, exactly three worked examples, a prerequisite that
resolves, a name short enough for the card layout, and no card whose name duplicates its own
description. Writing them found two real problems immediately. The Property card was printing
"Property" above "@property", which I'd missed when I shortened all the names. And I learned that
every trade spell is gated on a story spell, which matters because the locked card looks that name up
in `spellById`, and `spellById` only holds story spells; a trade-to-trade prerequisite would crash the
Working World. That invariant is now a test with the reason written next to it.

ESLint found four things worth fixing rather than suppressing. `SchoolBars` was defined inside
`Profile`, which means React saw a brand new component type on every render and threw away the DOM
underneath it. That's now hoisted to module scope. Two effects that call setState really do need to,
so they carry a suppression with the reason next to it instead of a silent one. The two empty catch
blocks around localStorage are deliberate, and now say so in the block.

CI runs lint, tests and build on every push and pull request. There's a second workflow for Pages,
because a game nobody can play is just a folder.

## Making it match the rest of my work

The last pass was against my own style bible, which I'd been carrying in my head and finally wrote
down. The short version is warm telemetry: a warm analog surface over precise instrumentation, and
the tension between those is the point. I don't gamify things, I instrument them. Every element has
to survive one question, which is whether it informs the player or manipulates them.

Measuring the project against that found more than I expected.

Colour was the biggest miss. I had eleven school accents, and they were pure decoration; the colour
told you which chapter a spell lived in, which you could already read off the heading. Meanwhile the
thing colour should have been reporting, what the app believes about your grasp of a spell, had no
colour at all. So the school hues are gone. There are two accents now and each one means exactly one
thing: tide, a coastal water blue, for solid and known and interactive, and brass for still forming.
A single `stateInk()` decides every accent in the interface. The bases went from tea-stained
parchment to fog paper and graphite, because "sea fog, coastal water, graphite, paper, brass" is the
test and parchment yellow wasn't passing it. Everything is checked against WCAG AA now rather than
eyeballed; `faint` was sitting at 3.06 against the ground and is 4.57 now.

The duel had a slot machine in it and I hadn't noticed. Every cast rolled a random event: ×1.3 here,
a ×1.6 critical there, +6 damage, +4 focus. None of that was connected to anything the player did.
It's the exact thing the bible bans, a reward with no information in it, and it was teaching that
good outcomes come from luck rather than from writing the script in the right order. The roller is
gone. Damage now comes only from the script itself, and the line under the cast reads back the
reasons: how many tiers ran in order, how many cards hit the weakness, how long the script was.
Same drama, and every number is traceable to a decision.

Then the part I'd been avoiding. The bible says show the model, not the streak, and the profile was
a scoreboard: spells inscribed, retraces, rough spots, bars. Counts, not beliefs. It's replaced with
a readout that says what the app thinks and why it thinks it, one spell at a time, in words. Solid,
laid correctly in all three contexts, first try each time. Forming, opened but not finished, two
wrong orderings so far. Known with friction, it held but it took six goes.

The honest part matters more than the readings. It opens by saying the app can only see the order
you put tokens in, that it can't see whether you did the Apprentice Task in a real file, and that
the file is the part that decides whether you know something. When fewer than five spells have a
reading it says so instead of drawing a confident chart over three data points. A tool that claims
more than it can see won't be believed when it says something true.

Smaller things from the same pass. Three typefaces became two, because the work has two voices, one
that explains and one that reports, so Vollkorn does the explaining and IBM Plex Mono does the
measuring and the sans went. The last exclamation points went with the combo names. A dead `ember`
keyframe had been sitting there since the sigils came out. And the status dots in the new readout
were briefly `○` and `◑`, which my own no-glyph test caught within a minute; they're a drawn
gauge now, an empty ring while forming and a half-filled dial once it holds.

## Cutting the character

The story went in stages and this was the last of it. First the acts and the finale went, then the
beat modal and the story log, and what was left was a premise line under the title saying eleven
apprentices had come and gone and you were the twelfth, plus a mentor who spoke a line at a time on
spell pages and after labyrinths.

That last layer is gone too, and the reason is the same one that killed the plot. Every time the
interface stopped to be a character, it stopped being an instrument. A line like "I'd tell you how
long it took me, but you'd only feel smug" is charming and it tells you nothing about what you just
did. The version underneath it, "you can read and write basic Python without looking anything up",
is the thing worth knowing, and it was hiding behind the personality.

So the premise line is now the mechanic instead: a page fills in once you've put it in order three
times in three different contexts. The labyrinth closers say what clearing one actually got you. The
rank ladder dropped Bench Witch and Keeper of the Line for Day one through Fluent, because a rank
should tell you where you are rather than which guild you'd joined.

The images kept their pictures and lost their owner. The jar hook still says write on the lid before
you fill it, because that's the teaching and it works with or without somebody holding the jar. Same
for the paring knife with the working cut into the handle.

What stays is the vocabulary. Spells, inks, labyrinths, the spellbook itself. It's a naming scheme
now rather than a fiction, and it earns its place by making the structure legible: a spell is one
idea, a school is a chapter, a labyrinth is a project you build out of pages you already filled.

## Getting it ready to publish

Splitting the file was the structural call. It was one 2,682 line module, and the README invites
people to add spells, which meant a contributor had to open all of it to change one array. The data
was interleaved with the components in three clusters rather than sitting in one block at the top, so
the split needed a brace matcher rather than a line range. It's `src/content.js` at 1,074 lines and
`src/App.jsx` at 1,614 now, and nothing in the content file knows React exists. Full
componentisation is still not worth it; that's churn with regression risk and no reader benefit.

Two things fell out of the split that I wouldn't have found otherwise. `GRAIN_CSS` still hardcoded
`#e6dcc4`, the parchment ground from two palettes ago, so the paper grain was being drawn in a colour
that no longer existed anywhere else. And `jsdom` wasn't a declared dependency at all; the render
tests ask for it by name in a vitest pragma and it only resolved because vitest happens to pull it in
transitively. That works until a patch release changes the tree, at which point CI breaks for reasons
nobody can see in the manifest.

The file rename mattered more than it looks. The entry point was still `Grimoire.jsx` while the
project, the package and the root component were all called some form of Spellbook, which is the kind
of leftover that makes a reader wonder what else didn't get finished. It's `App.jsx` now, which is
also just what a Vite entry component is called.

Vite went from 5 to 8 to clear an esbuild advisory. It only affects the dev server, so it would never
have touched anyone playing the built site, but a public repo shows the alert and a peer reading the
repo can't tell a dev-only advisory from a real one at a glance.

## Still open

1. Onboarding has nowhere to live since the prologue came out. Top of the list.
2. The Working World never renders the `image` hook. All 33 trade spells have one written, but that panel
   only shows SAY IT, REACH FOR IT WHEN and WATCH FOR; Story Mode shows all four. So 33 memory images I
   wrote by hand have never been displayed to anybody. One line to fix, and probably the best value on this
   list after onboarding.
3. The keystone check is verbal recall now instead of visual. Decide whether that's what I actually want.
4. Vollkorn is unread at length.
5. The code panel lost contrast in the light flip and no longer reads as an inserted sheet.
6. Several spells shared a sigil under the old mapping. With the art gone, check the spell line groupings
   still hold up on their own.
7. `Grimoire.jsx` is 2,582 lines and two components hold most of it; `Grimoire` and `SpellDuel` sit around
   500 each, with everything else under 100. One file was right while content and interface were changing
   together. Those two are past it.
8. There's no live link yet. Every comparable game leads with one, and a repo you can't play in a browser
   loses most of its audience right there at the README. The Pages workflow is written and sitting in
   `.github/workflows/deploy.yml`, so this is one settings toggle away.
9. No screenshot in the README either. Flexbox Froggy's README is essentially a link and an animated GIF,
   and that's the right instinct for something you're meant to look at.
