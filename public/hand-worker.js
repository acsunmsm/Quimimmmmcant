/* Inference in a worker keeps the cursor and 3D scene responsive. */
let detector;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      self.exports = {};
      importScripts(new URL('mediapipe/vision_bundle.js', self.location.href).href);
      const files = await exports.FilesetResolver.forVisionTasks(new URL('mediapipe/wasm', self.location.href).href);
      detector = await exports.HandLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: new URL('mediapipe/hand_landmarker.task', self.location.href).href, delegate: 'CPU' },
        runningMode: 'VIDEO', numHands: 1,
        minHandDetectionConfidence: 0.65, minHandPresenceConfidence: 0.65, minTrackingConfidence: 0.65,
      });
      self.postMessage({ type: 'ready' });
    } else if (data.type === 'frame' && detector) {
      try {
        const result = detector.detectForVideo(data.frame, data.timestamp);
        self.postMessage({ type: 'result', landmarks: result.landmarks[0] || null, timestamp: data.timestamp });
      } finally { data.frame.close(); }
    }
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
