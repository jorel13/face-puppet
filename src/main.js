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
  mirror: true, swapEyes: false, mouthGain: 1.6, exprGain: 1.5, headGain: 1, showCam: false, // tracking
  cam: '',                                           // camera label to use ('' = browser default)
  base: [0, 0, 0, 0, 0, 0],                          // neutral pose: yaw, pitch, roll, x, y, resting mouth openness
};
const BOOLS = ['mask', 'headOnly', 'mirror', 'swapEyes', 'showCam'];
const NUMS = ['maskW', 'maskH', 'offX', 'offY', 'mouthGain', 'exprGain', 'headGain'];

let settings = { ...DEFAULTS };
try { settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('puppet-settings-v2') || '{}') }; } catch {}
for (const k of BOOLS) if (params.has(k)) settings[k] = params.get(k) === '1';
for (const k of NUMS) if (params.has(k)) settings[k] = parseFloat(params.get(k));
if (params.has('bg')) settings.bg = params.get('bg');
if (params.has('cam')) settings.cam = params.get('cam');
if (params.has('base')) settings.base = params.get('base').split(',').map(Number);

const save = () => { try { localStorage.setItem('puppet-settings-v2', JSON.stringify(settings)); } catch {} };

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
  if (settings.cam) q.set('cam', settings.cam);
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
const smooth = { jaw: 0, funnel: 0, pucker: 0, smile: 0, frown: 0, browRaiseL: 0, browRaiseR: 0, browDownL: 0, browDownR: 0, blinkL: 0, blinkR: 0,
                 lookX: 0, lookY: 0, yaw: 0, pitch: 0, roll: 0, x: 0, y: 0,
                 pcx: 0, pcy: 0, pw: 1, ph: 1, proll: 0 };
const puppetState = { visible: true, headOnly: false, blinkL: false, blinkR: false, mouth: 'closed',
                      brows: 'neutral', browL: 'neutral', browR: 'neutral', splitBrows: true, gaze: { x: 0, y: 0 }, yaw: 0, pitch: 0, roll: 0, dx: 0, dy: 0 };
let lastRaw = null;
let lastSeen = 0;
let placeInit = false;
let splitBrows = true;   // set at boot from which brow sprites exist
let mouthSince = 0;
const MOUTH_HOLD_MS = 90;

function ema(key, target, a) { smooth[key] = lerp(smooth[key], target, a); return smooth[key]; }

function update(raw) {
  const [byaw, bpitch, broll, bx, by, bjaw = 0] = settings.base;
  // Face lost: ease everything back to neutral.
  const f = raw ?? { blend: {}, yaw: byaw, pitch: bpitch, roll: broll, x: bx, y: by };
  const b = f.blend;
  const m = settings.mirror ? 1 : -1;     // mirror: puppet moves like a mirror image of you
  const swap = settings.swapEyes;

  // Mouth/blink respond fast; pose a bit slower to hide tracker jitter.
  // Openness = the larger of jaw drop and lower-lip drop (lips move on "ee"/"mm" even when the jaw barely does),
  // minus the resting value captured at calibration, times the sensitivity slider.
  const rawOpen = Math.max(b.jawOpen ?? 0, ((b.mouthLowerDownLeft ?? 0) + (b.mouthLowerDownRight ?? 0)) / 2 * 0.8);
  const openness = Math.min(1, Math.max(0, rawOpen - bjaw) * settings.mouthGain);
  // Instant attack so a 1-2 frame syllable still registers; slower release so it doesn't flutter.
  const jaw = smooth.jaw = openness > smooth.jaw ? openness : lerp(smooth.jaw, openness, 0.45);
  const funnel = ema('funnel', b.mouthFunnel ?? 0, 0.5);
  const pucker = ema('pucker', b.mouthPucker ?? 0, 0.5);
  const eg = settings.exprGain;
  const smile = ema('smile', Math.min(1, eg * ((b.mouthSmileLeft ?? 0) + (b.mouthSmileRight ?? 0)) / 2), 0.5);
  const frown = ema('frown', Math.min(1, eg * ((b.mouthFrownLeft ?? 0) + (b.mouthFrownRight ?? 0)) / 2), 0.5);
  const bl = ema('blinkL', b[swap ? 'eyeBlinkRight' : 'eyeBlinkLeft'] ?? 0, 0.7);
  const br = ema('blinkR', b[swap ? 'eyeBlinkLeft' : 'eyeBlinkRight'] ?? 0, 0.7);
  // Brows per side so one can cock alone. Inner-up is shared by both brows, so it only counts half.
  const sideL = swap ? 'Right' : 'Left', sideR = swap ? 'Left' : 'Right';
  const raise = side => Math.min(1, eg * ((b['browOuterUp' + side] ?? 0) + (b.browInnerUp ?? 0) * 0.5));
  const down = side => Math.min(1, eg * (b['browDown' + side] ?? 0));
  const raiseL = ema('browRaiseL', raise(sideL), 0.5), raiseR = ema('browRaiseR', raise(sideR), 0.5);
  const downL = ema('browDownL', down(sideL), 0.5), downR = ema('browDownR', down(sideR), 0.5);
  const lookX = ema('lookX', ((b.eyeLookOutLeft ?? 0) + (b.eyeLookInRight ?? 0) - (b.eyeLookInLeft ?? 0) - (b.eyeLookOutRight ?? 0)) / 2, 0.4);
  const lookY = ema('lookY', ((b.eyeLookDownLeft ?? 0) + (b.eyeLookDownRight ?? 0) - (b.eyeLookUpLeft ?? 0) - (b.eyeLookUpRight ?? 0)) / 2, 0.4);

  const s = puppetState;
  s.headOnly = settings.headOnly || settings.mask;
  s.blinkL = above(bl, 0.5, s.blinkL);
  s.blinkR = above(br, 0.5, s.blinkR);

  // Thresholds are deliberately low: ordinary speech only opens jawOpen to ~0.1-0.4.
  const was = s.mouth;
  const calm = jaw < 0.1;   // closed-ish mouth, so smile/frown shapes apply
  if (above(funnel + pucker, 0.35, was === 'o') && jaw > 0.04) s.mouth = 'o';
  else if (above(jaw, 0.32, was === 'wide')) s.mouth = 'wide';
  else if (above(jaw, 0.14, was === 'mid' || was === 'wide', 0.02)) s.mouth = 'mid';
  else if (calm && above(smile, 0.3, was === 'smile')) s.mouth = 'smile';
  else if (calm && above(frown, 0.2, was === 'frown')) s.mouth = 'frown';
  else if (above(jaw, 0.045, was === 'small', 0.015)) s.mouth = 'small';
  else s.mouth = 'closed';

  // A shape that opened keeps showing for a minimum time, so quick syllables are visible on screen even
  // when the camera only caught them for a frame or two. Opening more is always immediate.
  const openRank = { closed: 0, small: 1, mid: 2, o: 2, wide: 3, smile: 0, frown: 0 };
  const now = performance.now();
  if (s.mouth !== was) {
    if (openRank[was] > 0 && openRank[s.mouth] < openRank[was] && now - mouthSince < MOUTH_HOLD_MS) s.mouth = was;
    else mouthSince = now;
  }

  const browState = (rz, dn, cur) => above(dn, 0.3, cur === 'furrowed') ? 'furrowed'
                                   : above(rz, 0.25, cur === 'raised') ? 'raised' : 'neutral';
  s.browL = browState(raiseL, downL, s.browL);
  s.browR = browState(raiseR, downR, s.browR);
  const rank = { neutral: 0, raised: 1, furrowed: 2 };
  s.brows = rank[s.browL] >= rank[s.browR] ? s.browL : s.browR;   // combined-sprite fallback
  s.splitBrows = splitBrows;

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

// ---- camera ----
function showError(msg) {
  $('status').textContent = msg;
  $('errorBanner').textContent = msg;
  $('errorBanner').hidden = false;
}

// Opens the default camera, fills the Camera dropdown (labels need permission first), then switches to
// the camera chosen by label if there is one. Matching by label because device ids differ between browsers.
async function openCamera() {
  const constraints = id => ({ video: { width: 1280, height: 720, frameRate: { ideal: 60 }, ...(id ? { deviceId: { exact: id } } : {}) }, audio: false });
  let stream = await navigator.mediaDevices.getUserMedia(constraints());
  const cams = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
  const sel = $('cam');
  sel.innerHTML = '<option value="">Default</option>' + cams.map(d => `<option value="${d.label}">${d.label}</option>`).join('');
  sel.value = settings.cam;
  sel.onchange = () => { settings.cam = sel.value; save(); location.reload(); };
  if (settings.cam) {
    const want = cams.find(d => d.label.toLowerCase().includes(settings.cam.toLowerCase()));
    if (want && want.label !== stream.getVideoTracks()[0].label) {
      stream.getTracks().forEach(t => t.stop());
      stream = await navigator.mediaDevices.getUserMedia(constraints(want.deviceId));
    }
  }
  return stream;
}

// ---- boot ----
const status = $('status');
async function boot() {
  status.textContent = 'Loading sprites…';
  const { sprites, missing, headBox: hb, real } = await loadSprites();
  splitBrows = !real.has('brows_neutral') || real.has('brow_l_neutral');
  headBox = hb;
  const puppet = createPuppet($('puppet'), sprites, headBox);
  puppet.resize(CANVAS.w, CANVAS.h);
  puppet.draw(puppetState);
  status.textContent = missing.length
    ? `Placeholder art for ${missing.length} sprite(s): ${missing.join(', ')}`
    : 'All sprites loaded.';

  const video = $('preview');
  try {
    video.srcObject = await openCamera();
    await video.play();
  } catch (e) {
    const hint = e.name === 'NotAllowedError' ? 'Permission denied. If this is OBS, its browser source may be blocking camera access: use the Window Capture method in USER_GUIDE.md.'
      : e.name === 'NotReadableError' ? 'The camera is busy. Close the Chrome calibration tab and any other app using the webcam, then refresh the source.'
      : e.name === 'NotFoundError' ? 'No camera found.' : '';
    showError(`Camera unavailable (${e.name}: ${e.message}). ${hint}`);
    return;
  }

  const tracker = await createTracker(video);
  status.textContent += ' · tracking';

  $('calibrate').onclick = () => {
    if (!lastRaw) return;
    // Last value is your resting mouth openness (capped, in case you calibrate mid-word).
    const restOpen = Math.min(0.05, Math.max(lastRaw.blend.jawOpen ?? 0, ((lastRaw.blend.mouthLowerDownLeft ?? 0) + (lastRaw.blend.mouthLowerDownRight ?? 0)) / 2 * 0.8));
    settings.base = [lastRaw.yaw, lastRaw.pitch, lastRaw.roll, lastRaw.x, lastRaw.y, restOpen];
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
    if (calibrating) $('mouthBar').style.width = `${Math.min(1, smooth.jaw) * 100}%`;
    requestAnimationFrame(frame);
  })();
}
boot().catch(e => { showError(`Error: ${e.message}`); console.error(e); });
