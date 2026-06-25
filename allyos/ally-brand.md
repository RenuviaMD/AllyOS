# Ally — avatar & brand assets

Reference notes for the **Ally** clinical-AI mascot used across AllyOS (the
"Ask Ally" chat). Keep this file so the avatar can be regenerated or reused
without re-deriving the decisions.

## The avatar

A friendly **white robot** with glowing **cyan-teal eyes** and a soft smile,
wearing a **shield emblem with a teal-and-gold leaf** on its chest, inside a
dark-navy circular badge with a neon-teal rim glow.

- **Leaf, not a medical cross.** AllyOS is wellness-only and advisory — a leaf
  says *wellness*; a clinical cross can imply disease treatment (regulatory
  line we stay behind).
- **No halo.** A haloed "angel" subtly implies infallibility — wrong signal for
  an assistant whose job is to say *"VERIFY — not in the locked library."*
- **Symbol on the chest, not the word "Ally."** The name is already shown as
  crisp UI text beside the avatar everywhere; baking "Ally" into the art is
  redundant and illegible at 24px / favicon size (and DALL·E mangles text).
- **Robot, not a human face.** Honest about being an AI — it doesn't pretend to
  be a nurse.

## DALL·E 3 prompt (primary — dark badge version)

```
A friendly modern mascot robot for a clinical AI assistant named "Ally". A cute
rounded white robot with a smooth matte finish, a large dark visor-face showing
two glowing cyan-teal eyes and a gentle warm smile, small rounded ears/antenna.
On its chest it wears a sleek rounded shield emblem bearing a single minimalist
teal-and-gold leaf symbol — a wellness leaf, NOT a medical cross, NOT a halo.
The mood is professional, trustworthy, calm and approachable. Centered icon
composition inside a circular badge on a deep navy near-black background
(#060a12), with a soft neon teal rim-glow around the circle. Clean soft-3D
app-icon style, crisp edges, subtle reflections, high detail, perfectly
symmetrical, 1:1 square, suitable as a small avatar and favicon. No text, no
letters, no watermark.
```

## DALL·E 3 prompt (transparent / cut-out variant)

Same as above, but replace the last two sentences with:

```
...the robot only, no badge, on a plain flat white background, generous
padding. No text, no letters, no watermark.
```

Then knock out the white background for a transparent PNG when needed.

## Palette (AllyOS tokens)

- Background navy: `#060a12`
- Teal (eyes / glow): `--teal` `#2ee6d6`
- Gold (shield rim): `--gold` `#e7b84e`

## Where it's wired (allyos/chairside.html)

The file must live at **`allyos/ally-avatar.png`** (square PNG). Referenced in:

- `<link rel="icon" ... href="ally-avatar.png">` — browser favicon
- `#allyBtn` — the floating "Ask Ally" button (`.allyface`, 24px round)
- `.allyhead` — the chat drawer header (28px)

Graceful fallback: if the PNG is missing, an `onerror` handler swaps each slot
to the 💬 emoji, so nothing renders broken.

## TODO / future

- [ ] Add a **downsized** copy (the source is ~1.6 MB; a 24px icon needs far
      less). Consider `ally-avatar-64.png` for the button/favicon and keep the
      full-res for any large display.
- [ ] **Cascade the favicon** to `index.html`, `login.html`, `pricing.html`,
      etc. for a site-wide tab icon.
- [ ] Optionally show the avatar on each of **Ally's chat reply bubbles**.
- [ ] Consider an **SVG** version for crisp scaling if a vector redraw is made.

## Runner-up concepts (if a redesign is ever wanted)

- **Infinity Ally** — same dark/teal palette, "continuity of care"; good favicon
  fallback.
- **Pulse Ally** — abstract ECG-line face; very on-theme, ties to chairside
  vitals/monitoring.
