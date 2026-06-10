# Mosaic Participant Partner — Chibi Character Art Pack

Generate these in **Midjourney / Grok Imagine / ChatGPT image / Gemini** and drop the
finished PNGs into this folder (`assets/characters/`) using the **exact filenames**
in the table below. The app picks them up automatically — no code changes. Until a
file exists, the app shows a soft branded placeholder card, so nothing looks broken
while you work through the list.

## Art direction (the whole point)

A **diverse cast** of warm, inclusive **chibi** people — *not* a single mascot.
Chibi = oversized round head, small simple body (South-Park-ish *size/proportions*),
but rendered **warm, friendly and respectful**, never crude or satirical. This is a
disability-support (NDIS) audience: include mobility aids, wheelchairs, walking
frames, glasses, hearing aids, and a real range of skin tones, ages and body types —
naturally, never as the "joke" of the image.

- **Palette:** Mosaic flame `#FF6B00`, deep red `#E83000`, crimson `#C41010`,
  amber `#FFB347`, cream `#FFF3E8`, peach `#FFE8D0`. Soft **cream background**.
- **Render:** flat 2D vector, soft cel shading, thick clean outlines, rounded shapes.
- **Format:** square **1:1**, plain cream (or transparent) background, centred subject,
  generous negative space, **no text in the image**. Export PNG, target **≤150 KB**
  (resize to ~512×512 and run through tinypng.com if needed).

## ⭐ THE ANCHOR IMAGE (locked)

The cover image Jeffo found **is the style anchor** — save it as **`hero-welcome.png`**
in this folder. Every other image must be generated to match it. Its visual fingerprint:

- Chibi proportions: big round heads, small bodies, **tiny black dot eyes**, **soft
  pink oval blush cheeks**, tiny nose dot, gentle little smile.
- **Soft hand-painted children's-book digital illustration** — gentle cel shading with
  a subtle **paper-grain texture** (NOT flat vector), **soft dark-brown ink outlines**
  (not hard black).
- Cozy, warm, slightly **muted** palette (soft autumn/winter tones) on a **plain cream
  textured background** with a soft ground shadow. The app's orange UI frames the art,
  so keep the art warm-but-muted — don't force bright flame-orange into it.
- Centered, lots of negative space above, a few sketchy confetti dabs optional.

## Master style suffix — paste at the end of EVERY prompt

> warm inclusive chibi characters, big round heads with small simple bodies, tiny
> black dot eyes, soft pink blush cheeks, gentle smiles; soft hand-painted
> children's-book digital illustration with gentle cel shading, a subtle paper-grain
> texture, and soft dark-brown ink outlines; cozy warm slightly muted palette on a
> plain cream textured background with a soft ground shadow; centered with generous
> negative space; diverse and inclusive (varied skin tones, ages, body types; mobility
> aids / wheelchairs / glasses included naturally); wholesome, gentle, storybook; no
> text; square 1:1 — not crude, satirical, scary, photoreal, or flat-vector

## Keeping the set consistent — use the anchor in each tool

**Midjourney (most reliable for style-match):**
1. Upload `hero-welcome.png`, copy its image URL.
2. Every other prompt: `<scene>, <master suffix> --sref <hero-welcome-url> --sw 200 --ar 1:1`
3. `--sref` = *style* reference (locks line/shading/grain/palette). `--sw` 100–400 dials
   the strength. Keep `--ar 1:1`. **Don't** use `--cref` — you want *different* people,
   not the same face.

**ChatGPT (gpt-image) / Gemini / Grok (reference + instruction):**
1. Start one chat and **upload `hero-welcome.png`**.
2. For each slot: *"Make a new illustration in the EXACT same art style, line work,
   shading, grain, proportions and colour palette as the image I gave you. Scene:
   `<scene>`. Square 1:1, plain cream background, no text."*
3. Generate all 8 **in that one session** so the reference stays pinned and the style
   doesn't drift. If one drifts, re-paste `hero-welcome.png` and say "match this exactly."

**For all tools:**
- Always a plain cream background → the images cut cleanly into the app's cards.
- Keep the dot-eyes + blush-cheeks treatment identical across every image.
- Generate 2–3 of each, keep the closest match to the anchor.
- Optional: lift one of the five faces from the cover and reuse it as a recurring
  character in the single-person slots, for a familiar "buddy" feel.

---

## The shot list (filename → scene)

| Save as | Where it appears | Scene to generate |
|---|---|---|
| `hero-welcome.png` | Intro splash (first screen) | A cheerful group of **five diverse chibi friends** standing together **waving hello** — one using a wheelchair, different ages and skin tones, small confetti, joyful welcome. |
| `onboarding-hello.png` | "Welcome!" name screen | **One** friendly chibi person waving warmly, open and welcoming, a little sparkle. |
| `q-likes.png` | About Me · *Likes & Dislikes* | One chibi person looking **delighted**, surrounded by floating hobby icons — frying pan, fishing rod, paintbrush, musical notes, a book. |
| `q-strengths.png` | About Me · *Personal Strengths* | One chibi person standing **proud and confident**, gently **helping a friend up**, kind and capable, a small sparkle. |
| `q-skills.png` | About Me · *I'm Good At* | One chibi person **focused and capable**, watering a garden plant with a little watering can, content half-smile. |
| `q-wellbeing.png` | About Me · *Personal Wellbeing* | One chibi person sitting **calmly**, hand on heart, eyes gently closed, peaceful, cozy blanket, soft warm glow. |
| `plan-week.png` | Scheduler header | One chibi person cheerfully **pointing at a big friendly weekly calendar** full of fun activity icons, excited to plan the week. |
| `week-done.png` | Week summary | One chibi person **celebrating** a finished, full week — arms up, confetti, a happy "all set!" energy. |
| `help-support.png` *(optional)* | Help / service request | **Two** chibi people side by side, one reassuring the other — warm, supportive, "we've got you." |

---

## Copy-paste prompts (suffix already appended)

**hero-welcome.png**
> A cheerful group of five diverse chibi friends standing together waving hello, one using a wheelchair, different ages and skin tones, small confetti in the air, joyful welcome — warm inclusive chibi character, oversized round head with a small simple body (South-Park-style proportions), soft rounded shapes, gentle friendly smile, flat 2D vector illustration with soft cel shading and thick clean outlines, Mosaic warm palette (flame orange #FF6B00, deep red #E83000, cream #FFF3E8, peach #FFE8D0), soft cream background, centered with generous negative space, diverse and inclusive, wholesome, respectful, gentle children's-book friendliness, no text, square 1:1 — not crude, satirical, scary, or photoreal --style raw --ar 1:1

**onboarding-hello.png**
> One friendly chibi person waving warmly with both an open, welcoming pose and a little sparkle, [master style suffix] --style raw --ar 1:1 --sref <anchor>

**q-likes.png**
> One chibi person looking delighted, surrounded by floating hobby icons — frying pan, fishing rod, paintbrush, musical notes, a book, [master style suffix] --style raw --ar 1:1 --sref <anchor>

**q-strengths.png**
> One chibi person standing proud and confident, gently helping a friend up, kind and capable, a small sparkle, [master style suffix] --style raw --ar 1:1 --sref <anchor>

**q-skills.png**
> One chibi person focused and capable, watering a garden plant with a little watering can, content half-smile, [master style suffix] --style raw --ar 1:1 --sref <anchor>

**q-wellbeing.png**
> One chibi person sitting calmly with a hand on their heart, eyes gently closed, peaceful, cozy blanket, soft warm glow, [master style suffix] --style raw --ar 1:1 --sref <anchor>

**plan-week.png**
> One chibi person cheerfully pointing at a big friendly weekly calendar full of fun activity icons, excited to plan the week, [master style suffix] --style raw --ar 1:1 --sref <anchor>

**week-done.png**
> One chibi person celebrating a full, finished week, arms up, confetti, happy "all set" energy, [master style suffix] --style raw --ar 1:1 --sref <anchor>

**help-support.png** *(optional)*
> Two chibi people side by side, one gently reassuring the other, warm and supportive "we've got you" feeling, [master style suffix] --style raw --ar 1:1 --sref <anchor>

---

### File format & optimization (important)

The app loads **`<slot>.jpg`** (the generated art has a cream background, no
transparency, so JPEG is ~30× smaller than the raw PNG). Full-res 2048px originals
live in **`_originals/`** (gitignored) for marketing / re-export.

**To add or replace a slot:** save your full-res export into `_originals/`, then run:

```bash
cd assets/characters
sips -s format jpeg -s formatOptions 82 -Z 640 _originals/<slot>.png --out <slot>.jpg
```

That yields ~100–160 KB at 640px — plenty for the on-screen sizes. Refresh and it
appears (a missing file falls back to the branded placeholder automatically).

If you want them cached for **offline** use, bump `CACHE` in `sw.js` to `mosaic-v2`
and add the `.jpg` filenames to the `SHELL` array (only after the files exist — the
service-worker precache fails the whole install on any missing file).
