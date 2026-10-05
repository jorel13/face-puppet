// Procedural stand-in art, used for any sprite whose PNG is missing from assets/sprites/.
// Lets the whole pipeline work before real art exists. Each fn draws in 1024x1024 space.
const SKIN = '#ffd9b8';
const INK = '#3a2a2a';

function stroke(ctx, w = 8) { ctx.lineWidth = w; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); }
function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
}
const EYE_L = { x: 400, y: 440 };
const EYE_R = { x: 624, y: 440 };

function eyeOpen(ctx, p) { ellipse(ctx, p.x, p.y, 44, 52, '#fff'); stroke(ctx, 6); }
function eyeClosed(ctx, p) { ctx.beginPath(); ctx.moveTo(p.x - 44, p.y); ctx.quadraticCurveTo(p.x, p.y + 22, p.x + 44, p.y); stroke(ctx, 8); }
function pupil(ctx, p) { ellipse(ctx, p.x, p.y + 4, 22, 26, INK); }

export const PLACEHOLDERS = {
  body(ctx) { ctx.beginPath(); ctx.ellipse(512, 1010, 330, 230, 0, Math.PI, 0); ctx.fillStyle = '#6aa8e6'; ctx.fill(); stroke(ctx); },
  hair_back(ctx) { ellipse(ctx, 512, 440, 335, 370, '#7a4a2b'); },
  head(ctx) {
    ellipse(ctx, 512, 880, 60, 110, SKIN); stroke(ctx); // neck
    ellipse(ctx, 512, 490, 300, 340, SKIN); stroke(ctx);
  },
  cheeks(ctx) { ellipse(ctx, 330, 560, 50, 28, 'rgba(255,110,110,0.35)'); ellipse(ctx, 694, 560, 50, 28, 'rgba(255,110,110,0.35)'); },
  eye_l_open: ctx => eyeOpen(ctx, EYE_L),
  eye_r_open: ctx => eyeOpen(ctx, EYE_R),
  eye_l_closed: ctx => eyeClosed(ctx, EYE_L),
  eye_r_closed: ctx => eyeClosed(ctx, EYE_R),
  pupil_l: ctx => pupil(ctx, EYE_L),
  pupil_r: ctx => pupil(ctx, EYE_R),
  brows_neutral(ctx) {
    for (const [x, d] of [[400, 1], [624, -1]]) { ctx.beginPath(); ctx.moveTo(x - 50, 365 + 0 * d); ctx.lineTo(x + 50, 365); stroke(ctx, 12); }
  },
  brows_raised(ctx) {
    for (const x of [400, 624]) { ctx.beginPath(); ctx.moveTo(x - 50, 340); ctx.quadraticCurveTo(x, 310, x + 50, 340); stroke(ctx, 12); }
  },
  brows_furrowed(ctx) {
    ctx.beginPath(); ctx.moveTo(350, 355); ctx.lineTo(450, 385); stroke(ctx, 12);
    ctx.beginPath(); ctx.moveTo(674, 355); ctx.lineTo(574, 385); stroke(ctx, 12);
  },
  nose(ctx) { ctx.beginPath(); ctx.moveTo(512, 480); ctx.quadraticCurveTo(535, 540, 512, 552); stroke(ctx, 6); },
  mouth_closed(ctx) { ctx.beginPath(); ctx.moveTo(450, 650); ctx.lineTo(574, 650); stroke(ctx, 8); },
  mouth_small(ctx) { ellipse(ctx, 512, 652, 40, 14, '#7a2a2a'); stroke(ctx, 6); },
  mouth_mid(ctx) { ellipse(ctx, 512, 658, 56, 32, '#7a2a2a'); stroke(ctx, 6); },
  mouth_wide(ctx) { ellipse(ctx, 512, 668, 70, 58, '#7a2a2a'); stroke(ctx, 6); ellipse(ctx, 512, 690, 40, 20, '#d9667a'); },
  mouth_o(ctx) { ellipse(ctx, 512, 660, 28, 36, '#7a2a2a'); stroke(ctx, 6); },
  mouth_smile(ctx) { ctx.beginPath(); ctx.moveTo(430, 635); ctx.quadraticCurveTo(512, 705, 594, 635); stroke(ctx, 8); },
  hair_front(ctx) {
    ctx.beginPath(); ctx.moveTo(212, 430); ctx.quadraticCurveTo(512, 120, 812, 430);
    ctx.quadraticCurveTo(700, 290, 512, 300); ctx.quadraticCurveTo(320, 290, 212, 430);
    ctx.fillStyle = '#7a4a2b'; ctx.fill(); stroke(ctx, 6);
  },
};
