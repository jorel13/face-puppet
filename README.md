# Face Puppet

A webcam-driven 2D cartoon head. Your face drives a layered sprite character (blinks, gaze, brows,
mouth shapes, head tilt/turn), rendered on one page, ready to drop into OBS.

Tracking uses MediaPipe Face Landmarker (blendshapes + head pose), loaded from CDN. No build step.

## Run

```bash
python -m http.server 8000
```

Open <http://localhost:8000/>, allow the camera, sit in a neutral pose and press **C** to calibrate.
It needs `localhost` (not `file://`) for the camera and ES modules.

## Use in OBS

1. **Sources, +, Browser**: URL `http://localhost:8000/?clean&bg=transparent` (width/height 1024 x 1024).
2. `bg` can be `transparent` (default), `green` (use a Chroma Key filter) or `dark`.
3. If OBS's browser source can't get camera access, open the same URL in Chrome and capture that
   window with **Window Capture**, using `bg=green` plus a Chroma Key filter.
4. For Zoom/Meet/Discord, click **Start Virtual Camera** in OBS.

## Art

Drop PNGs into `assets/sprites/`. See [assets/sprites/README.md](assets/sprites/README.md) for the full list.
Missing sprites render as placeholders.

## Tuning

- `src/config.js`: canvas size, rotation pivot, parallax and gaze range, layer order.
- `src/main.js` `update()`: thresholds that turn blendshapes into mouth/brow/blink states.
- If a wink is on the wrong eye, tick **Swap left/right eyes**. If the head turns the wrong way, untick **Mirror movement**.
