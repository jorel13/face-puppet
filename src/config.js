// Shared constants. Every sprite PNG must be exactly CANVAS.w x CANVAS.h with a transparent
// background, with the part already positioned where it belongs. No per-part offsets needed.
export const CANVAS = { w: 1024, h: 1024 };

// Where the head sits in sprite space. Mask mode scales/rotates the sprite about this point so it
// lands on your detected face. cx/cy = centre of the head, w/h = its width/height.
export const HEAD = { cx: 512, cy: 490, w: 600, h: 680 };

// Point the head rotates (rolls) around: roughly the base of the neck.
export const PIVOT = { x: 512, y: 780 };

// How far (px) a layer shifts for a full yaw/pitch turn, multiplied by the layer's depth.
export const PARALLAX = { x: 120, y: 80 };

// How far (px) the pupils can travel when looking fully to one side.
export const GAZE_PX = { x: 14, y: 10 };

// Draw order, back to front. `rig: true` means the layer follows head rotation/parallax.
// `depth` is the parallax multiplier (bigger = moves more = looks closer to the camera).
// `show` decides whether the layer is drawn given the current puppet state.
export const LAYERS = [
  { id: 'body',          rig: false, depth: 0,   show: s => !s.headOnly },
  { id: 'hair_back',     rig: true,  depth: 0.2, show: () => true },
  { id: 'neck',          rig: true,  depth: 0.3, show: s => !s.headOnly },
  { id: 'head',          rig: true,  depth: 0.5, show: () => true },
  { id: 'cheeks',        rig: true,  depth: 0.7, show: () => true },
  { id: 'eye_l_open',    rig: true,  depth: 0.8, show: s => !s.blinkL },
  { id: 'eye_l_closed',  rig: true,  depth: 0.8, show: s => s.blinkL },
  { id: 'eye_r_open',    rig: true,  depth: 0.8, show: s => !s.blinkR },
  { id: 'eye_r_closed',  rig: true,  depth: 0.8, show: s => s.blinkR },
  { id: 'pupil_l',       rig: true,  depth: 0.8, show: s => !s.blinkL, gaze: true },
  { id: 'pupil_r',       rig: true,  depth: 0.8, show: s => !s.blinkR, gaze: true },
  // Per-side brows (screen left/right) let one brow rise alone. The combined brows_* files are the
  // fallback used when you have no per-side art (see splitBrows in main.js).
  { id: 'brow_l_neutral',  rig: true, depth: 0.9, show: s => s.splitBrows && s.browL === 'neutral' },
  { id: 'brow_l_raised',   rig: true, depth: 0.9, show: s => s.splitBrows && s.browL === 'raised' },
  { id: 'brow_l_furrowed', rig: true, depth: 0.9, show: s => s.splitBrows && s.browL === 'furrowed' },
  { id: 'brow_r_neutral',  rig: true, depth: 0.9, show: s => s.splitBrows && s.browR === 'neutral' },
  { id: 'brow_r_raised',   rig: true, depth: 0.9, show: s => s.splitBrows && s.browR === 'raised' },
  { id: 'brow_r_furrowed', rig: true, depth: 0.9, show: s => s.splitBrows && s.browR === 'furrowed' },
  { id: 'brows_neutral',   rig: true, depth: 0.9, show: s => !s.splitBrows && s.brows === 'neutral' },
  { id: 'brows_raised',    rig: true, depth: 0.9, show: s => !s.splitBrows && s.brows === 'raised' },
  { id: 'brows_furrowed',  rig: true, depth: 0.9, show: s => !s.splitBrows && s.brows === 'furrowed' },
  { id: 'nose',          rig: true,  depth: 1.0, show: () => true },
  { id: 'mouth_closed',  rig: true,  depth: 1.0, show: s => s.mouth === 'closed' },
  { id: 'mouth_small',   rig: true,  depth: 1.0, show: s => s.mouth === 'small' },
  { id: 'mouth_mid',     rig: true,  depth: 1.0, show: s => s.mouth === 'mid' },
  { id: 'mouth_wide',    rig: true,  depth: 1.0, show: s => s.mouth === 'wide' },
  { id: 'mouth_o',       rig: true,  depth: 1.0, show: s => s.mouth === 'o' },
  { id: 'mouth_frown',   rig: true,  depth: 1.0, show: s => s.mouth === 'frown' },
  { id: 'mouth_smile',   rig: true,  depth: 1.0, show: s => s.mouth === 'smile' },
  { id: 'hair_front',    rig: true,  depth: 0.9, show: () => true },
];

export const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
export const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
export const TASKS_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm';
