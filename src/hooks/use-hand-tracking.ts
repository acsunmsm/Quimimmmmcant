'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PinchTracker, type Gesture, type Point } from '@/lib/gestures';
export type CameraStatus = 'off' | 'loading' | 'ready' | 'error';
const connections = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
export function useHandTracking(onGesture: (g: Gesture) => void, sensitivity: number) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const callback = useRef(onGesture); callback.current = onGesture;
  const sensitivityRef = useRef(sensitivity); sensitivityRef.current = sensitivity;
  const [status, setStatus] = useState<CameraStatus>('off');
  const [error, setError] = useState('');
  const [detected, setDetected] = useState(false);
  const [holding, setHolding] = useState(false);
  const generation = useRef(0);
  const resources = useRef<{stream?: MediaStream; worker?: Worker; raf?: number; timer?: ReturnType<typeof setTimeout>}>({});
  const tracker = useRef(new PinchTracker());
  const dispose = useCallback(() => {
    generation.current++;
    const r = resources.current;
    r.stream?.getTracks().forEach(t => t.stop()); r.worker?.terminate();
    if (r.raf) cancelAnimationFrame(r.raf);
    clearTimeout(r.timer); resources.current = {};
    if (videoRef.current) videoRef.current.srcObject = null;
    const canvas = overlayRef.current;
    canvas?.getContext('2d')?.clearRect(0,0,canvas.width,canvas.height);
    tracker.current.reset();
  }, []);
  const stop = useCallback(() => {
    dispose(); setStatus('off'); setDetected(false); setHolding(false);
    callback.current({ point: null, phase: 'lost', pinching: false });
  }, [dispose]);
  const start = useCallback(async () => {
    dispose(); const current = generation.current;
    setError(''); setStatus('loading'); setDetected(false);
    const active = () => current === generation.current;
    const fail = (message: string) => {
      if (!active()) return;
      dispose(); setStatus('error'); setError(message); setDetected(false); setHolding(false);
      callback.current({point:null,phase:'lost',pinching:false});
    };
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('La cámara necesita HTTPS o localhost y un navegador compatible.');
      const worker = new Worker('/Quimimmmmcant/hand-worker.js');
      resources.current.worker = worker;
      let busy = false, ready = false, lastFrame = -1, lastSent = 0;
      const video = videoRef.current!;
      resources.current.timer = setTimeout(() => fail('La cámara o el detector tardaron demasiado. Comprueba los permisos y vuelve a intentar.'), 45000);
      worker.onerror = () => fail('No se pudo cargar el detector. Recarga la página y vuelve a activar la cámara.');
      worker.onmessage = ({data}: MessageEvent<{type:string;landmarks?:Point[];timestamp:number}>) => {
        if (!active()) return;
        if (data.type === 'error') { fail('El detector no pudo iniciarse. Puedes continuar con el ratón o volver a intentar.'); return; }
        if (data.type === 'ready') { ready = true; return; }
        if (data.type !== 'result') return;
        clearTimeout(resources.current.timer);
        busy = false;
        const landmarks = data.landmarks || undefined;
        setDetected(Boolean(landmarks));
        const gesture = tracker.current.update(landmarks, data.timestamp, video.videoWidth / video.videoHeight, sensitivityRef.current);
        setHolding(gesture.pinching); callback.current(gesture);
        const canvas = overlayRef.current, ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
          if (canvas.width !== video.videoWidth) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; }
          ctx.clearRect(0,0,canvas.width,canvas.height);
          if (landmarks) {
            ctx.strokeStyle = gesture.pinching ? '#6fedee' : '#ffffff'; ctx.lineWidth = 3;
            for (const [a,b] of connections) {
              ctx.beginPath(); ctx.moveTo(landmarks[a].x*canvas.width,landmarks[a].y*canvas.height);
              ctx.lineTo(landmarks[b].x*canvas.width,landmarks[b].y*canvas.height); ctx.stroke();
            }
            ctx.fillStyle = '#6fedee';
            for (const p of landmarks) { ctx.beginPath(); ctx.arc(p.x*canvas.width,p.y*canvas.height,4,0,Math.PI*2); ctx.fill(); }
          }
        }
      };
      worker.postMessage({type:'init'});
      const stream = await navigator.mediaDevices.getUserMedia({audio:false, video:{facingMode:'user', width:{ideal:640},height:{ideal:480},frameRate:{ideal:30,max:30}}});
      if (!active()) { stream.getTracks().forEach(t=>t.stop()); return; }
      resources.current.stream = stream; video.srcObject = stream;
      stream.getVideoTracks()[0].onended = () => fail('La cámara se desconectó. Conéctala y vuelve a intentar.');
      await video.play();
      if (!active()) return;
      let announced = false;
      const frame = (time: number) => {
        if (!active()) return;
        resources.current.raf = requestAnimationFrame(frame);
        if (!ready || busy || video.readyState < 2 || document.hidden || video.currentTime === lastFrame || time-lastSent < 32) return;
        if (!announced) { announced = true; clearTimeout(resources.current.timer); setStatus('ready'); }
        busy = true; lastFrame = video.currentTime; lastSent = time;
        resources.current.timer = setTimeout(() => fail('El detector dejó de responder. Vuelve a activar la cámara para reiniciarlo.'), 8000);
        createImageBitmap(video).then(bitmap => {
          if (!active()) { bitmap.close(); return; }
          worker.postMessage({type:'frame',frame:bitmap,timestamp:time},[bitmap]);
        }).catch(() => fail('No se pudo leer el vídeo. Desactiva la cámara y vuelve a intentarlo.'));
      };
      resources.current.raf = requestAnimationFrame(frame);
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      fail(name === 'NotAllowedError' ? 'Permiso de cámara denegado. Habilítalo en el navegador y pulsa «Reintentar».' : name === 'NotFoundError' ? 'No encontramos una cámara. Conecta una o continúa con el ratón.' : name === 'NotReadableError' ? 'La cámara está ocupada. Cierra la otra aplicación y vuelve a intentar.' : err instanceof Error ? err.message : 'No se pudo activar la cámara.');
    }
  }, [dispose]);
  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); dispose(); };
  }, [dispose, stop]);
  return { videoRef, overlayRef, status, error, detected, holding, start, stop };
}
