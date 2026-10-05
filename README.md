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

## Modes

- **Calibration** (default): control panel on the left, live preview with a green guide showing the face the tracker found.
  1. Sit in your normal pose and click **Set neutral pose** (or press **C**).
  2. Adjust **Size** and **Shift** so the head covers your face the way you want.
  3. Check mouth sensitivity by talking.
- **Presenting**: click **Start presenting** (or open the URL with `?present`). Only the picture is shown. **Esc** or double-click returns to calibration.

## Output options

- **Mask mode**: the head follows your face's position, size and tilt, like a mask, and is always head-only.
- **Head only**: in avatar mode (mask off), hides `neck.png` and `body.png`.
- **Background**: your webcam video, transparent, green screen or dark. With video or mask the canvas matches your camera's resolution.

## Use in OBS

1. In calibration, click **Copy** next to the OBS URL. It contains all your settings and your calibrated neutral pose, because OBS has its own storage and can't read this browser's.
2. In OBS add a **Browser** source with that URL, sized to your camera resolution (e.g. 1280 x 720).
3. If OBS's browser source can't get camera access, open the same URL in Chrome and capture that window with **Window Capture** (use `bg=green` plus a Chroma Key filter if you want no video behind the head).
4. For Zoom/Meet/Discord, click **Start Virtual Camera** in OBS.

## Art

Drop PNGs into `assets/sprites/`. See [assets/sprites/README.md](assets/sprites/README.md) for the full list.
Missing sprites render as placeholders.

## Tuning

- `src/config.js`: canvas size, rotation pivot, parallax and gaze range, layer order.
- `src/main.js` `update()`: thresholds that turn blendshapes into mouth/brow/blink states.
- If a wink is on the wrong eye, tick **Swap left/right eyes**. If the head turns the wrong way, untick **Mirror movement**.
