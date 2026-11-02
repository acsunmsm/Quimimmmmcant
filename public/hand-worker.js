/* Inference in a worker keeps the cursor and 3D scene responsive. */
let detector;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      self.exports = {};
      importScripts('/mediapipe/vision_bundle.js');
      const files = await exports.FilesetResolver.forVisionTasks('/mediapipe/wasm');
      detector = await exports.HandLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: '/mediapipe/hand_landmarker.task', delegate: 'CPU' },
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
