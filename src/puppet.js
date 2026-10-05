import { CANVAS, HEAD, PIVOT, PARALLAX, GAZE_PX, LAYERS } from './config.js';
import { PLACEHOLDERS } from './placeholders.js';

// Loads every sprite PNG; a missing file falls back to its procedural placeholder
// (rendered once into an offscreen canvas so drawing stays cheap).
export async function loadSprites() {
  const sprites = new Map();
  const missing = [];
  const real = new Set();
  await Promise.all(LAYERS.map(async ({ id }) => {
    const img = await new Promise(resolve => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = `assets/sprites/${id}.png`;
    });
    if (img) { sprites.set(id, img); real.add(id); return; }
    missing.push(id);
    const c = document.createElement('canvas');
    c.width = CANVAS.w; c.height = CANVAS.h;
    PLACEHOLDERS[id]?.(c.getContext('2d'));
    sprites.set(id, c);
  }));
  return { sprites, missing, real, headBox: measureHead(sprites.get('head')) };
}

// Bounding box of the opaque pixels in head.png, so mask mode fits whatever head you drew.
// Falls back to the HEAD default in config.js if the pixels can't be read.
function measureHead(img) {
  try {
    const c = document.createElement('canvas');
    c.width = CANVAS.w; c.height = CANVAS.h;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, CANVAS.w, CANVAS.h);
    const d = g.getImageData(0, 0, CANVAS.w, CANVAS.h).data;
    let x0 = CANVAS.w, y0 = CANVAS.h, x1 = -1, y1 = -1;
    for (let y = 0; y < CANVAS.h; y++) {
      for (let x = 0; x < CANVAS.w; x++) {
        if (d[(y * CANVAS.w + x) * 4 + 3] > 16) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return HEAD;
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  } catch { return HEAD; }
}

export function createPuppet(canvas, sprites, headBox = HEAD) {
  const ctx = canvas.getContext('2d');

  function resize(w, h) {
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }

  // state: { visible, headOnly, blinkL, blinkR, mouth, brows, gaze:{x,y}, yaw, pitch, roll, dx, dy }
  // opts:  { video, mirror, place, guide }
  //   video  - element drawn as the background (mirrored if opts.mirror)
  //   place  - { cx, cy, sx, sy, roll } puts the head on the face (mask mode); null = centred avatar
  //   guide  - same shape, plus w/h; draws a calibration outline
  function draw(s, { video = null, mirror = false, place = null, guide = null } = {}) {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (video && video.readyState >= 2) {
      ctx.save();
      if (mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
      ctx.drawImage(video, 0, 0, W, H);
      ctx.restore();
    }

    if (s.visible) {
      ctx.save();
      if (place) {
        ctx.translate(place.cx, place.cy);
        ctx.rotate(place.roll);
        ctx.scale(place.sx, place.sy);   // width and height scale independently
        ctx.translate(-headBox.cx, -headBox.cy);
      } else {
        const sc = H / CANVAS.h;
        ctx.translate((W - CANVAS.w * sc) / 2, 0);
        ctx.scale(sc, sc);
      }
      for (const layer of LAYERS) {
        if (!layer.show(s)) continue;
        const img = sprites.get(layer.id);
        if (!img) continue;
        ctx.save();
        if (layer.rig) {
          if (!place) {                       // avatar mode: roll about the neck, follow head position
            ctx.translate(PIVOT.x + s.dx, PIVOT.y + s.dy);
            ctx.rotate(s.roll);
            ctx.translate(-PIVOT.x, -PIVOT.y);
          }
          ctx.translate(s.yaw * PARALLAX.x * layer.depth, s.pitch * PARALLAX.y * layer.depth);
        }
        if (layer.gaze) ctx.translate(s.gaze.x * GAZE_PX.x, s.gaze.y * GAZE_PX.y);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
      }
      ctx.restore();
    }

    if (guide) {                              // calibration aid: the face box the tracker found
      ctx.save();
      ctx.translate(guide.cx, guide.cy);
      ctx.rotate(guide.roll);
      ctx.strokeStyle = '#38ff7a';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.ellipse(0, 0, guide.w / 2, guide.h / 2, 0, 0, Math.PI * 2);
      ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.moveTo(0, -10); ctx.lineTo(0, 10);
      ctx.stroke();
      ctx.restore();
    }
  }
  return { draw, resize };
}
