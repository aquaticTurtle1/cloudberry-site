# Fingerprints

Every site you build with **scroll-craft** gets one row here, appended after it
ships. The registry exists so your next build can prove it is a different page
rather than a re-skin of one you already made.

This file is **yours**. It starts empty on purpose: the gate is about not
repeating *yourself*, so it has nothing to say until you have built something.

The rules and the gate live in the skill's
`references/uniqueness.md`. Short version:

**A new build must differ from EVERY row below on at least 4 of the 6
dimensions.** Four against each row individually, not four on average across the
table. If a planned build fails, change the plan. Never edit a row to make room
for it.

The six dimensions are: **grammar**, **nav treatment**, **hero device**,
**act-sequence shape**, **close pattern**, **signature move**.

Dimension 6 is free, because a signature move is unique by definition. So the
gate really asks for three more out of the remaining five, and a build that
changes only grammar and world will fail it.

---

## The registry

| Build | Grammar | Nav treatment | Hero device | Act-sequence shape | Close pattern | Signature move | World | Port |
|---|---|---|---|---|---|---|---|---|
| cloudberry (2026-09-11) | Narrative handoff (new): third-person story scenes, then the product handed to the visitor, close in the product's own idiom | Minimal bar (berry mark + one CTA) plus a fixed floor-plan HUD the story fills; HUD links to the demo | Layered pin: plate + ambient loop video, giant headline between plate and cut-out subject, desk foreground, dust canvas, call-log panel ticking refusals | pin > scrub > pin(reveal) > pan > scrub(iris peak) > pin(route draw) > flow(live demo) > flow(close); 8 acts, 15.2vh desktop | Reservation-ticket form beside a static plan with one table left "for your venue"; footer inside the close | A floor plan that books itself table by table as the story scrolls, then becomes clickable and confirms your booking in a Telegram chat | Nocturne bar photography, ink blue-black + cloudberry orange | 4500 |

---

## What is taken

Add a bullet here whenever a build claims something a later build should avoid
reusing: a grammar, a nav treatment, a close pattern, a signature move, an
act-count-and-length band. The shared columns are what the next build inherits
as a constraint, so writing them down is the whole point.

- **Narrative handoff grammar** (story watched, then product operated). Taken by cloudberry.
- **Story-driven fixed HUD** that accumulates state across acts (floor plan). Taken by cloudberry.
- **Layered pin hero with headline between plate and cut-out subject** plus a ticking call log. Taken by cloudberry.
- **Iris reveal from an empty-room still into a full-room scrub** as the peak. Taken by cloudberry.
- **Reservation-ticket close** (the lead form typeset as a booking). Taken by cloudberry.
- Act band: 8 acts at ~15vh.

---

## Appending a row

After shipping, add one line to the table and one bullet to **What is taken** if
the build claimed something new. Fill every column. Say what the build shares
with existing rows.

Rows are append-only. A build that has been superseded stays in the table,
because the space it occupies is still occupied.

---

## Worked example

The skill's author kept a registry of twelve builds across eight page grammars.
If you want to see what a filled-in table looks like, and which shapes tend to
collide, read `EXAMPLES.md` in the scroll-craft repository. Treat it as
illustration only: those rows are somebody else's builds and they do **not**
constrain yours.
