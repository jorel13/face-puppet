import { CANVAS, PIVOT, PARALLAX, GAZE_PX, LAYERS } from './config.js';
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
  canvas.width = CANVAS.w;
  canvas.height = CANVAS.h;
  const ctx = canvas.getContext('2d');

  // state: { blinkL, blinkR, mouth, brows, gaze:{x,y}, yaw, pitch, roll (radians), dx, dy (px) }
  function draw(s) {
    ctx.clearRect(0, 0, CANVAS.w, CANVAS.h);
    for (const layer of LAYERS) {
      if (!layer.show(s)) continue;
      const img = sprites.get(layer.id);
      if (!img) continue;
      ctx.save();
      if (layer.rig) {
        ctx.translate(PIVOT.x + s.dx, PIVOT.y + s.dy);
        ctx.rotate(s.roll);
        ctx.translate(-PIVOT.x, -PIVOT.y);
        ctx.translate(s.yaw * PARALLAX.x * layer.depth, s.pitch * PARALLAX.y * layer.depth);
      }
      if (layer.gaze) ctx.translate(s.gaze.x * GAZE_PX.x, s.gaze.y * GAZE_PX.y);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    }
  }
  return { draw };
}
