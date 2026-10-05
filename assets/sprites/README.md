# Sprite spec

**Every file: PNG, exactly 1024 x 1024 px, transparent background.**
Each part is drawn already in its final position on the full canvas (like Photoshop layers exported at
full canvas size). The code never offsets parts, it just stacks them. Any missing file falls back to a
placeholder drawing, so you can add sprites one at a time.

Left/right means **screen left/right** (the character's right eye is on screen-left).

Reference layout used by the placeholders (adjust freely, but keep every part aligned to the same canvas):
eyes at about y=440 (x=400 and x=624), nose ~y=520, mouth ~y=650, neck base ~y=780.
The head's centre and size (`HEAD` in `src/config.js`, currently centre 512,490, 600 wide, 680 tall) is how mask mode fits the sprite onto your face. If your head is drawn elsewhere or at a different size, tell me and I'll update it (or edit it yourself).

## Tier 1: minimum (talks and blinks)
| File | What it is |
|---|---|
| `head.png` | Head/face with **no** eyes, brows, nose or mouth drawn on it (skin, ears, outline). **No neck.** This is the part that covers your face in mask mode, so the shape should be a bit bigger than a real face. |
| `eye_l_open.png`, `eye_r_open.png` | Open eye (white + iris/pupil if you are skipping separate pupils). |
| `eye_l_closed.png`, `eye_r_closed.png` | Closed eye (lash line / lid). |
| `mouth_closed.png` | Mouth at rest. |
| `mouth_small.png` | Slightly open ("m/b" to "uh"). |
| `mouth_mid.png` | Half open ("eh"). |
| `mouth_wide.png` | Fully open ("ah"), teeth/tongue if you like. |

## Tier 2: recommended (expression)
| File | What it is |
|---|---|
| `pupil_l.png`, `pupil_r.png` | Pupil/iris **only**, centred in the eye. They slide around to follow your gaze, so draw the eye whites in `eye_*_open` **without** the pupil. Keep the sliding range (about 14 px) inside the eye shape. |
| `brows_neutral.png`, `brows_raised.png`, `brows_furrowed.png` | Both eyebrows in one image per state. |
| `mouth_o.png` | Rounded "oo/oh" mouth (shows when you pucker). |
| `mouth_smile.png` | Closed-lip smile. |
| `nose.png` | Nose (separate so it can shift more than the head when turning). |

## Tier 3: polish (optional)
Hair and ears that stick out past the head are what make the mask hide your real face edges, so they're worth doing.

| File | What it is |
|---|---|
| `hair_back.png` | Hair/hat/ears that sit **behind** the head. |
| `hair_front.png` | Fringe/bangs/hat brim drawn **over** the face. |
| `neck.png` | Neck, drawn behind the head. Hidden in head-only and mask mode. |
| `body.png` | Shoulders/torso, stays put while the head moves. Hidden in head-only and mask mode. |
| `cheeks.png` | Blush or freckles. |

## Tips
- Draw the **head with no features** first. Features baked into the head can't move with your expression.
- Eyes and mouths should be drawn as if the head were facing straight at the camera.
- Mouth shapes should progressively open: closed, small, mid, wide. Same width, increasing height reads best.
- Painting the eyes closed state a little *lower* than open lids looks natural.
- Anything extending past the head (hair, ears) belongs on `hair_back` or `hair_front`, not `head`.
- Open the app with all files present: the status line should read "All sprites loaded."
