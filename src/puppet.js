import { CANVAS, HEAD, PIVOT, PARALLAX, GAZE_PX, LAYERS } from './config.js';
import { PLACEHOLDERS } from './placeholders.js';

// Loads every sprite PNG; a missing file falls back to its procedural placeholder
// (rendered once into an offscreen canvas so drawing stays cheap).
export async function loadSprites() {
  const sprites = new Map();
  const missing = [];
  await Promise.all(LAYERS.map(async ({ id }) => {
    const img = await new Promise(resolve => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = `assets/sprites/${id}.png`;
    });
    if (img) { sprites.set(id, img); return; }
    missing.push(id);
    const c = document.createElement('canvas');
    c.width = CANVAS.w; c.height = CANVAS.h;
    PLACEHOLDERS[id]?.(c.getContext('2d'));
    sprites.set(id, c);
  }));
  return { sprites, missing };
}

export function createPuppet(canvas, sprites) {
  const ctx = canvas.getContext('2d');

  function resize(w, h) {
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }

  // state: { visible, headOnly, blinkL, blinkR, mouth, brows, gaze:{x,y}, yaw, pitch, roll, dx, dy }
  // opts:  { video, mirror, place, guide }
  //   video  - element drawn as the background (mirrored if opts.mirror)
  //   place  - { cx, cy, scale, roll } puts the head on the face (mask mode); null = centred avatar
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
        ctx.scale(place.scale, place.scale);
        ctx.translate(-HEAD.cx, -HEAD.cy);
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
