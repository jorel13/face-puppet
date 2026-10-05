import { MODEL_URL, WASM_URL, TASKS_URL } from './config.js';

// Wraps MediaPipe Face Landmarker. detect() returns raw, unsmoothed values or null if no face.
export async function createTracker(video) {
  const { FaceLandmarker, FilesetResolver } = await import(TASKS_URL);
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
  const landmarker = await FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
  });

  let lastTime = -1;
  let last = null;

  function detect() {
    if (video.readyState < 2 || video.currentTime === lastTime) return last;
    lastTime = video.currentTime;
    const res = landmarker.detectForVideo(video, performance.now());
    if (!res.faceBlendshapes?.length) { last = null; return null; }

    const blend = {};
    for (const c of res.faceBlendshapes[0].categories) blend[c.categoryName] = c.score;

    // Column-major 4x4. Pull Euler angles + translation out of it.
    const m = res.facialTransformationMatrixes[0].data;
    last = {
      blend,
      pitch: Math.asin(Math.max(-1, Math.min(1, -m[9]))),
      yaw: Math.atan2(m[8], m[10]),
      roll: Math.atan2(m[1], m[5]),
      x: m[12], y: m[13], z: m[14], // cm, camera space
    };
    return last;
  }
  return { detect };
}
