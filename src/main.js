import { loadSprites, createPuppet } from './puppet.js';
import { createTracker } from './tracker.js';
import { CANVAS, HEAD } from './config.js';
let headBox = HEAD;   // measured from head.png at boot

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);

// ---- settings ----
// Precedence: URL params > localStorage > defaults. OBS's browser source has its own storage,
// so "Copy OBS URL" bakes every setting (including the calibrated neutral pose) into the URL.
const DEFAULTS = {
  mask: true, headOnly: false, bg: 'video',          // output
  maskW: 1.3, maskH: 1.3, offX: 0, offY: 0,          // mask size (x face) and centering
  mirror: true, swapEyes: false, mouthGain: 1, headGain: 1, showCam: false, // tracking
  base: [0, 0, 0, 0, 0],                             // neutral pose: yaw, pitch, roll, x, y
};
const BOOLS = ['mask', 'headOnly', 'mirror', 'swapEyes', 'showCam'];
const NUMS = ['maskW', 'maskH', 'offX', 'offY', 'mouthGain', 'headGain'];

let settings = { ...DEFAULTS };
try { settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('puppet-settings') || '{}') }; } catch {}
for (const k of BOOLS) if (params.has(k)) settings[k] = params.get(k) === '1';
for (const k of NUMS) if (params.has(k)) settings[k] = parseFloat(params.get(k));
if (params.has('bg')) settings.bg = params.get('bg');
if (params.has('base')) settings.base = params.get('base').split(',').map(Number);

const save = () => { try { localStorage.setItem('puppet-settings', JSON.stringify(settings)); } catch {} };

// ---- modes: calibrate (UI + guides) vs present (canvas only) ----
function setPresenting(on) {
  document.body.classList.toggle('clean', on);
  window.getSelection?.().removeAllRanges();
}
const urlPresent = params.has('present') || params.has('clean');
setPresenting(urlPresent);
$('present').onclick = () => setPresenting(true);
window.addEventListener('keydown', e => { if (e.key === 'Escape') setPresenting(false); });
$('puppet').ondblclick = () => setPresenting(!document.body.classList.contains('clean'));

// ---- controls ----
function applyDom() {
  document.body.dataset.bg = settings.bg === 'video' ? 'transparent' : settings.bg;
  $('preview').style.display = settings.showCam ? 'block' : 'none';
  $('headOnly').disabled = settings.mask;     // mask mode is always head-only
  $('obsUrl').value = obsUrl();
}
for (const k of BOOLS) {
  const el = $(k); el.checked = settings[k];
  el.onchange = () => { settings[k] = el.checked; save(); applyDom(); };
}
for (const k of NUMS) {
  const el = $(k); el.value = settings[k];
  el.oninput = () => { settings[k] = parseFloat(el.value); save(); $('obsUrl').value = obsUrl(); };
}
$('bg').value = settings.bg;
$('bg').onchange = () => { settings.bg = $('bg').value; save(); applyDom(); };

function obsUrl() {
  const q = new URLSearchParams({ present: '1', bg: settings.bg });
  for (const k of BOOLS) q.set(k, settings[k] ? '1' : '0');
  for (const k of NUMS) q.set(k, String(settings[k]));
  q.set('base', settings.base.map(v => +v.toFixed(4)).join(','));
  return `${location.origin}${location.pathname}?${q}`;
}
$('copyUrl').onclick = async () => {
  try { await navigator.clipboard.writeText($('obsUrl').value); $('copyUrl').textContent = 'Copied!'; }
  catch { $('obsUrl').select(); }
  setTimeout(() => ($('copyUrl').textContent = 'Copy'), 1500);
};
applyDom();

// ---- helpers ----
const lerp = (a, b, t) => a + (b - a) * t;
// Hysteresis: threshold moves down when the state is already active so edges don't flicker.
const above = (v, t, active, h = 0.04) => v > (active ? t - h : t + h);

// ---- state ----
const smooth = { jaw: 0, funnel: 0, pucker: 0, smile: 0, blinkL: 0, blinkR: 0, browUp: 0, browDown: 0,
                 lookX: 0, lookY: 0, yaw: 0, pitch: 0, roll: 0, x: 0, y: 0,
                 pcx: 0, pcy: 0, pw: 1, ph: 1, proll: 0 };
const puppetState = { visible: true, headOnly: false, blinkL: false, blinkR: false, mouth: 'closed',
                      brows: 'neutral', gaze: { x: 0, y: 0 }, yaw: 0, pitch: 0, roll: 0, dx: 0, dy: 0 };
let lastRaw = null;
let lastSeen = 0;
let placeInit = false;

function ema(key, target, a) { smooth[key] = lerp(smooth[key], target, a); return smooth[key]; }

function update(raw) {
  const [byaw, bpitch, broll, bx, by] = settings.base;
  // Face lost: ease everything back to neutral.
  const f = raw ?? { blend: {}, yaw: byaw, pitch: bpitch, roll: broll, x: bx, y: by };
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
  s.headOnly = settings.headOnly || settings.mask;
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
  s.yaw = ema('yaw', (f.yaw - byaw) * m * g, 0.35);
  s.pitch = ema('pitch', (f.pitch - bpitch) * g, 0.35);
  s.roll = ema('roll', (f.roll - broll) * -m * g, 0.35);
  s.dx = ema('x', (f.x - bx) * m * 6 * g, 0.3);   // cm -> px (avatar mode only)
  s.dy = ema('y', -(f.y - by) * 6 * g, 0.3);
  if (settings.mask) { s.roll = 0; s.dx = 0; s.dy = 0; }  // mask mode takes position/roll from the face itself
}

// Mask mode: where, how big and how tilted the head sprite should be in canvas pixels.
function computePlace(raw, W, H) {
  if (raw) {
    const px = p => ({ x: (settings.mirror ? 1 - p.x : p.x) * W, y: p.y * H });
    const a = px(raw.face.l), b = px(raw.face.r), t = px(raw.face.top), c = px(raw.face.chin);
    const fw = Math.hypot(a.x - b.x, a.y - b.y);
    const fh = Math.hypot(t.x - c.x, t.y - c.y);
    const [p, q] = a.x < b.x ? [a, b] : [b, a];
    const cx = (a.x + b.x + t.x + c.x) / 4, cy = (a.y + b.y + t.y + c.y) / 4;
    const roll = Math.atan2(q.y - p.y, q.x - p.x);
    const k = placeInit ? 0.5 : 1;                 // snap on first sighting, then smooth
    ema('pcx', cx, k); ema('pcy', cy, k); ema('pw', fw / headBox.w, k); ema('ph', fh / headBox.h, k); ema('proll', roll, k);
    placeInit = true;
    smooth.fw = fw; smooth.fh = fh;
  }
  if (!placeInit) return null;
  // User offset is in face widths/heights, rotated with the head so "up" stays up along the face.
  const ox = settings.offX * (smooth.fw ?? 0), oy = settings.offY * (smooth.fh ?? 0);
  const cos = Math.cos(smooth.proll), sin = Math.sin(smooth.proll);
  return {
    cx: smooth.pcx + ox * cos - oy * sin,
    cy: smooth.pcy + ox * sin + oy * cos,
    sx: smooth.pw * settings.maskW,
    sy: smooth.ph * settings.maskH,
    roll: smooth.proll,
    guide: { cx: smooth.pcx, cy: smooth.pcy, w: smooth.fw ?? 0, h: smooth.fh ?? 0, roll: smooth.proll },
  };
}

// ---- boot ----
const status = $('status');
async function boot() {
  status.textContent = 'Loading sprites…';
  const { sprites, missing, headBox: hb } = await loadSprites();
  headBox = hb;
  const puppet = createPuppet($('puppet'), sprites, headBox);
  puppet.resize(CANVAS.w, CANVAS.h);
  puppet.draw(puppetState);
  status.textContent = missing.length
    ? `Placeholder art for ${missing.length} sprite(s): ${missing.join(', ')}`
    : 'All sprites loaded.';

  const video = $('preview');
  try {
    video.srcObject = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
    await video.play();
  } catch (e) {
    status.textContent = `Camera unavailable: ${e.message}`;
    return;
  }

  const tracker = await createTracker(video);
  status.textContent += ' · tracking';

  $('calibrate').onclick = () => {
    if (!lastRaw) return;
    settings.base = [lastRaw.yaw, lastRaw.pitch, lastRaw.roll, lastRaw.x, lastRaw.y];
    save(); applyDom();
  };
  window.addEventListener('keydown', e => { if (e.key.toLowerCase() === 'c' && !e.target.matches?.('input')) $('calibrate').click(); });

  (function frame() {
    lastRaw = tracker.detect();
    if (lastRaw) lastSeen = performance.now();
    update(lastRaw);

    const videoBg = settings.bg === 'video';
    const matchVideo = (settings.mask || videoBg) && video.videoWidth;
    const W = matchVideo ? video.videoWidth : CANVAS.w;
    const H = matchVideo ? video.videoHeight : CANVAS.h;
    puppet.resize(W, H);

    const place = settings.mask ? computePlace(lastRaw, W, H) : null;
    // In mask mode, hide the head when no face has been seen for a moment instead of leaving it floating.
    puppetState.visible = !settings.mask || (place && performance.now() - lastSeen < 600);
    const calibrating = !document.body.classList.contains('clean');
    puppet.draw(puppetState, {
      video: videoBg ? video : null,
      mirror: settings.mirror,
      place,
      guide: settings.mask && calibrating && lastRaw ? place?.guide : null,
    });
    requestAnimationFrame(frame);
  })();
}
boot().catch(e => { status.textContent = `Error: ${e.message}`; console.error(e); });
