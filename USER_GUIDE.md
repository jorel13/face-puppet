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

## 3. Add it to OBS (Window Capture)

OBS's built-in Browser source blocks webcam access (it shows `NotAllowedError`), so the reliable method is to show the page in Chrome and have OBS capture that window.

1. Run `start.bat` and open `http://localhost:8000/` in **Chrome**. Calibrate (step 2).
2. Click **Start presenting**. The panel disappears and only the picture remains.
3. Make the window show only the picture: press **F11** for fullscreen, or resize the window so the picture fills it.
4. In OBS, under **Sources**, click **+** and choose **Window Capture**.
   - **Window**: pick the Chrome window (`[chrome.exe]: Face Puppet`).
   - **Capture Method**: *Windows 10 (1903 and up)* if offered.
   - Turn **off** *Capture Cursor*.
5. Size and position the source on your OBS canvas. The capture is the camera's shape (16:9 for most webcams), so it should fit a 16:9 canvas with no cropping.
6. Choose your background in calibration beforehand:
   - **My webcam video**: nothing more to do. You with the head over your face.
   - **Green screen**: right-click the source, **Filters**, **+**, **Chroma Key**, then pick green. Put other sources behind it.

**Tips**
- Keep the Chrome window open and **not minimised** (a minimised window captures as black). It can sit behind other windows or on a second monitor.
- Fullscreen on a second monitor is ideal, so you can keep working on your main screen.
- To change settings later: press **Esc** in the Chrome window to return to calibration, adjust, then click **Start presenting** again. OBS keeps capturing the same window.

### Optional: Browser source (only if your OBS allows camera access)

You can try adding a **Browser** source with the OBS URL from the panel's **OBS** section. The page shows a red message at the bottom if the camera is blocked. `NotAllowedError` means OBS is blocking it, so use Window Capture. `NotReadableError` means another app is using the camera (close the Chrome tab and other apps, then right-click the source and choose **Refresh cache of current page**).
If you have several cameras, pick the right one in the **Camera** dropdown and copy the OBS URL again.

## 4. Use it in Zoom, Meet, Discord or Teams

1. In OBS click **Start Virtual Camera**.
2. In your call app, choose **OBS Virtual Camera** as the camera.

## Presenting mode and calibration mode

- **Start presenting** hides the panel and shows only the picture. This is what the OBS URL opens straight into.
- Press **Esc** or double-click the picture to go back to calibration. (Not available inside OBS; change settings in Chrome and re-copy the URL.)

## Changing something later

With Window Capture: press **Esc** in the Chrome window, adjust, then click **Start presenting**. Nothing to redo in OBS.
(With a Browser source you'd need to copy the OBS URL again and paste it into the source.)

## Troubleshooting

| Problem | Try this |
|---|---|
| The page shows a file list instead of the app | The server was started in the wrong folder. Use `start.bat`, or `cd` into the `face-puppet` folder first. |
| "Camera unavailable" | Another app is using the webcam, or camera permission was blocked. Close other apps and allow the camera in the browser's address-bar icon. |
| Browser source shows `NotAllowedError` | OBS blocks webcam access in Browser sources. Use Window Capture (step 3). |
| Window Capture is black | The Chrome window is minimised, or try another *Capture Method* in the source's properties. |
| Head floats off or is the wrong size | Re-run **Set neutral pose**, then adjust width, height and centering. |
| The head tilts or turns the wrong way | Toggle **Mirror movement**. |
| Wink on the wrong eye | Toggle **Swap left/right eyes**. |
| Mouth misses some words | Click **Set neutral pose** with your mouth relaxed (this sets the resting level), then raise **Mouth open sensitivity**. The blue meter under the slider shows what the tracker sees: it should cross the first tick on every syllable. Good, even lighting helps the camera run at a full frame rate. |
| Smile/frown/eyebrows won't trigger | Raise **Expression sensitivity**. Good, even lighting on your face helps a lot. |
| Head disappears when you look away | It hides when no face has been seen for about half a second. Face the camera again. |
| Changes made in Chrome don't show in OBS | With a Browser source, copy the OBS URL again. With Window Capture, make sure the window is in presenting mode. |
| Choppy or laggy | Close other heavy apps and browser tabs. Use a lower camera resolution if needed. |

## Sprite art summary

Every sprite is a 1024 x 1024 transparent PNG, with each part already positioned on the full canvas. See the full list in [assets/sprites/README.md](assets/sprites/README.md).
