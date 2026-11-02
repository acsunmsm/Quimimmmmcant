import { cp, mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = path.resolve('public/mediapipe');
await mkdir(root, { recursive: true });
const source = path.dirname(require.resolve('@mediapipe/tasks-vision'));
await cp(path.join(source, 'vision_bundle.cjs'), path.join(root, 'vision_bundle.js'));
await cp(path.join(source, 'wasm'), path.join(root, 'wasm'), { recursive: true });
const model = path.join(root, 'hand_landmarker.task');
if (!(await stat(model).catch(() => null))?.size) {
  const response = await fetch('https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Model download failed: ${response.status}`);
  await writeFile(model, Buffer.from(await response.arrayBuffer()));
}
console.log('MediaPipe assets ready (local runtime, model v1).');
