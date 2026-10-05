# Face Puppet user guide

How to set up Face Puppet and use it as a webcam replacement through OBS. No coding needed.

## What you need

- A webcam, and Chrome or Edge (recommended; the page needs camera access).
- Python 3 installed (only used to serve the page locally).
- OBS Studio.
- Your sprite PNGs in `assets/sprites/` (see [assets/sprites/README.md](assets/sprites/README.md)). Anything missing is drawn as a placeholder, so you can start without any art.

## 1. Start the app

Double-click **`start.bat`**. A window opens (keep it open while you stream) and your browser opens `http://localhost:8000/`.
Allow camera access when asked. The status line at the bottom of the panel should read `... · tracking`.

Prefer the terminal? From inside the `face-puppet` folder run `python -m http.server 8000`, then open <http://localhost:8000/>.

## 2. Calibrate

The page opens in **calibration mode**: control panel on the left, picture on the right.

1. **Sit the way you normally do when streaming**, face the camera, relaxed expression.
2. Click **Set neutral pose** (or press **C**). This tells the app what "looking straight ahead" means for you.
3. In **Output**, keep **Mask mode** on for the head to cover your face. Choose a **Background**:
   - *My webcam video*: you, with the cartoon head over your face (most common).
   - *Transparent*: only the head, so OBS can layer it over its own camera or scene.
   - *Green screen* / *Dark*: solid colour behind the head.
4. In **Mask size & centering**, use **Head width**, **Head height** and **Center left/right/up/down** until the head covers your face. The dashed green oval shows the face the tracker found.
5. Test your expressions and adjust:
   - **Mouth open sensitivity**: raise it if the mouth barely opens when you talk.
   - **Expression sensitivity**: raise it for easier smiles, frowns and eyebrow raises.
   - **Head motion**: how much the features slide when you turn or tilt your head.
6. If movements look backwards, toggle **Mirror movement**. If a wink happens on the wrong eye, toggle **Swap left/right eyes**.

Your settings are saved in this browser automatically.

## 3. Add it to OBS

1. In the calibration panel, find **OBS** at the bottom and click **Copy**. This URL contains **all** your settings and your neutral pose. (OBS keeps its own storage and can't see the settings saved in Chrome, so always copy the URL fresh after changing settings.)
2. In OBS, under **Sources**, click **+** and choose **Browser**. Name it, e.g. "Face Puppet".
3. Paste the URL into **URL**.
4. Set **Width** and **Height** to match your camera, usually **1280 x 720** (or 1920 x 1080). In mask or video mode the picture is the camera's shape, so a mismatch will letterbox it.
5. Click OK. The puppet should appear in the preview.

**Camera access in OBS:** the Browser source needs to open your webcam itself, and most webcams can only be used by one app at a time.
- **Close the Chrome calibration tab** (and any other app using the webcam, like Zoom or the Windows Camera app) before OBS starts the source. Then right-click the source and choose **Refresh cache of current page**.
- If it still fails, a **red message at the bottom of the picture** says why. `NotReadableError` means the camera is busy. `NotAllowedError` means OBS's browser is blocking camera access; use the fallback below.
- If you have several cameras, pick the right one in the **Camera** dropdown during calibration, then copy the OBS URL again (the URL then includes the camera name).

### Fallback: capture the Chrome window instead

1. In Chrome, open the OBS URL (the one you copied) and make the window fullscreen with **F11**. It opens straight into presenting mode, showing only the picture.
2. In OBS add a **Window Capture** source and pick that Chrome window. Turn off **Capture Cursor**.
3. If you used a transparent, green or dark background, add a **Chroma Key** filter (for green) so the background disappears.

Keep the Chrome window open and un-minimised while streaming.

## 4. Use it in Zoom, Meet, Discord or Teams

1. In OBS click **Start Virtual Camera**.
2. In your call app, choose **OBS Virtual Camera** as the camera.

## Presenting mode and calibration mode

- **Start presenting** hides the panel and shows only the picture. This is what the OBS URL opens straight into.
- Press **Esc** or double-click the picture to go back to calibration. (Not available inside OBS; change settings in Chrome and re-copy the URL.)

## Changing something later

1. Open `http://localhost:8000/` in Chrome (run `start.bat` first).
2. Adjust settings, then click **Copy** on the OBS URL.
3. In OBS, double-click the Browser source and paste the new URL.

## Troubleshooting

| Problem | Try this |
|---|---|
| The page shows a file list instead of the app | The server was started in the wrong folder. Use `start.bat`, or `cd` into the `face-puppet` folder first. |
| "Camera unavailable" | Another app is using the webcam, or camera permission was blocked. Close other apps and allow the camera in the browser's address-bar icon. |
| Blank in OBS but works in Chrome | OBS may be blocking the camera: use the Window Capture fallback above. Also check the server window from `start.bat` is still open. |
| Head floats off or is the wrong size | Re-run **Set neutral pose**, then adjust width, height and centering. |
| The head tilts or turns the wrong way | Toggle **Mirror movement**. |
| Wink on the wrong eye | Toggle **Swap left/right eyes**. |
| Mouth barely moves | Raise **Mouth open sensitivity**. |
| Smile/frown/eyebrows won't trigger | Raise **Expression sensitivity**. Good, even lighting on your face helps a lot. |
| Head disappears when you look away | It hides when no face has been seen for about half a second. Face the camera again. |
| Changes made in Chrome don't show in OBS | Copy the OBS URL again and paste it into the OBS source. |
| Choppy or laggy | Close other heavy apps and browser tabs. Use a lower camera resolution if needed. |

## Sprite art summary

Every sprite is a 1024 x 1024 transparent PNG, with each part already positioned on the full canvas. See the full list in [assets/sprites/README.md](assets/sprites/README.md).
