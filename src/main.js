import { loadSprites, createPuppet } from './puppet.js';
import { createTracker } from './tracker.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const clean = params.has('clean');
if (clean) document.body.classList.add('clean');
document.body.dataset.bg = params.get('bg') || 'transparent'; // transparent | green | dark

// ---- settings (persisted, per-viewer convenience only) ----
const DEFAULTS = { mirror: true, swapEyes: false, mouthGain: 1, headGain: 1, showCam: true };
let settings = { ...DEFAULTS };
try { settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('puppet-settings') || '{}') }; } catch {}
const save = () => { try { localStorage.setItem('puppet-settings', JSON.stringify(settings)); } catch {} };

for (const key of ['mirror', 'swapEyes', 'showCam']) {
  const el = $(key); el.checked = settings[key];
  el.onchange = () => { settings[key] = el.checked; save(); applyCamVisibility(); };
}
for (const key of ['mouthGain', 'headGain']) {
  const el = $(key); el.value = settings[key];
  el.oninput = () => { settings[key] = parseFloat(el.value); save(); };
}
function applyCamVisibility() { $('preview').style.display = settings.showCam ? 'block' : 'none'; }
applyCamVisibility();

// ---- helpers ----
const lerp = (a, b, t) => a + (b - a) * t;
// Hysteresis: threshold moves down when the state is already active so edges don't flicker.
const above = (v, t, active, h = 0.04) => v > (active ? t - h : t + h);

// ---- state ----
const smooth = { jaw: 0, funnel: 0, pucker: 0, smile: 0, blinkL: 0, blinkR: 0, browUp: 0, browDown: 0,
                 lookX: 0, lookY: 0, yaw: 0, pitch: 0, roll: 0, x: 0, y: 0 };
const base = { yaw: 0, pitch: 0, roll: 0, x: 0, y: 0 };
const puppetState = { blinkL: false, blinkR: false, mouth: 'closed', brows: 'neutral',
                      gaze: { x: 0, y: 0 }, yaw: 0, pitch: 0, roll: 0, dx: 0, dy: 0 };
let lastRaw = null;

function ema(key, target, a) { smooth[key] = lerp(smooth[key], target, a); return smooth[key]; }

function update(raw) {
  // Face lost: ease everything back to neutral.
  const f = raw ?? { blend: {}, yaw: base.yaw, pitch: base.pitch, roll: base.roll, x: base.x, y: base.y };
  const b = f.blend;
  const m = settings.mirror ? 1 : -1;     // mirror: puppet moves like a mirror image of you
  const swap = settings.swapEyes;

  // Mouth/blink respond fast; pose a bit slower to hide tracker jitter.
  const jaw = ema('jaw', Math.min(1, (b.jawOpen ?? 0) * settings.mouthGain), 0.6);
  const funnel = ema('funnel', b.mouthFunnel ?? 0, 0.5);
  const pucker = ema('pucker', b.mouthPucker ?? 0, 0.5);
  const smile = ema('smile', ((b.mouthSmileLeft ?? 0) + (b.mouthSmileRight ?? 0)) / 2, 0.5);
  const bl = ema('blinkL', b[swap ? 'eyeBlinkRight' : 'eyeBlinkLeft'] ?? 0, 0.7);
  const br = ema('blinkR', b[swap ? 'eyeBlinkLeft' : 'eyeBlinkRight'] ?? 0, 0.7);
  const browUp = ema('browUp', Math.max(b.browInnerUp ?? 0, ((b.browOuterUpLeft ?? 0) + (b.browOuterUpRight ?? 0)) / 2), 0.5);
  const browDown = ema('browDown', ((b.browDownLeft ?? 0) + (b.browDownRight ?? 0)) / 2, 0.5);
  const lookX = ema('lookX', ((b.eyeLookOutLeft ?? 0) + (b.eyeLookInRight ?? 0) - (b.eyeLookInLeft ?? 0) - (b.eyeLookOutRight ?? 0)) / 2, 0.4);
  const lookY = ema('lookY', ((b.eyeLookDownLeft ?? 0) + (b.eyeLookDownRight ?? 0) - (b.eyeLookUpLeft ?? 0) - (b.eyeLookUpRight ?? 0)) / 2, 0.4);

  const s = puppetState;
  s.blinkL = above(bl, 0.5, s.blinkL);
  s.blinkR = above(br, 0.5, s.blinkR);

  const was = s.mouth;
  if (above(funnel + pucker, 0.5, was === 'o') && jaw > 0.08) s.mouth = 'o';
  else if (above(jaw, 0.55, was === 'wide')) s.mouth = 'wide';
  else if (above(jaw, 0.25, was === 'mid' || was === 'wide')) s.mouth = 'mid';
  else if (above(jaw, 0.08, was !== 'closed' && was !== 'smile', 0.02)) s.mouth = 'small';
  else if (above(smile, 0.45, was === 'smile')) s.mouth = 'smile';
  else s.mouth = 'closed';

  s.brows = above(browDown, 0.45, s.brows === 'furrowed') ? 'furrowed'
          : above(browUp, 0.4, s.brows === 'raised') ? 'raised' : 'neutral';

  s.gaze.x = lookX * m; s.gaze.y = lookY;

  const g = settings.headGain;
  s.yaw = ema('yaw', (f.yaw - base.yaw) * m * g, 0.35);
  s.pitch = ema('pitch', (f.pitch - base.pitch) * g, 0.35);
  s.roll = ema('roll', (f.roll - base.roll) * -m * g, 0.35);
  s.dx = ema('x', (f.x - base.x) * m * 6 * g, 0.3);   // cm -> px
  s.dy = ema('y', -(f.y - base.y) * 6 * g, 0.3);
}

// ---- boot ----
const status = $('status');
async function boot() {
  status.textContent = 'Loading sprites…';
  const { sprites, missing } = await loadSprites();
  const puppet = createPuppet($('puppet'), sprites);
  puppet.draw(puppetState);
  if (missing.length) status.textContent = `Using placeholder art for ${missing.length} sprite(s): ${missing.join(', ')}`;
  else status.textContent = 'All sprites loaded.';

  const video = $('preview');
  try {
    video.srcObject = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
    await video.play();
  } catch (e) {
    status.textContent = `Camera unavailable: ${e.message}`;
    return;
  }

  const tracker = await createTracker(video);
  status.textContent += ' · tracking';

  $('calibrate').onclick = () => {
    if (!lastRaw) return;
    Object.assign(base, { yaw: lastRaw.yaw, pitch: lastRaw.pitch, roll: lastRaw.roll, x: lastRaw.x, y: lastRaw.y });
  };
  window.addEventListener('keydown', e => { if (e.key.toLowerCase() === 'c') $('calibrate').click(); });

  (function frame() {
    lastRaw = tracker.detect();
    update(lastRaw);
    puppet.draw(puppetState);
    requestAnimationFrame(frame);
  })();
}
boot().catch(e => { status.textContent = `Error: ${e.message}`; console.error(e); });
