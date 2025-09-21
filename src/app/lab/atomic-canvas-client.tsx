"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

declare global {
  interface Window {
    Hands: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    HAND_CONNECTIONS: any;
  }
}

type Status = "loading" | "ready" | "error";

export default function AtomicCanvasClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const threeCanvasRef = useRef<HTMLCanvasElement>(null);
  const handsCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cubeRef = useRef<THREE.Mesh | null>(null);

  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const previousLeftFist = useRef<{ x: number, y: number } | null>(null);


  useEffect(() => {
    // Ensure this runs only on the client
    if (typeof window === "undefined") return;

    let animationFrameId: number;
    let hands: any;
    let mpCamera: any;


    const cleanup = () => {
      cancelAnimationFrame(animationFrameId);
      
      mpCamera?.stop();
      hands?.close();

      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach((track) => track.stop());

      rendererRef.current?.dispose();
      cubeRef.current?.geometry.dispose();
      (cubeRef.current?.material as THREE.Material)?.dispose();
    };

    const isFist = (landmarks: any[]) => {
      const fingerTipIndices = [4, 8, 12, 16, 20];
      return fingerTipIndices.every(i => {
        return landmarks[i].y > landmarks[i-2].y;
      });
    };

    const init = async () => {
      try {
        if (!videoRef.current || !threeCanvasRef.current || !handsCanvasRef.current) {
          throw new Error("Canvas or video element not found.");
        }
        
        while (!window.Hands || !window.Camera || !window.drawConnectors) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const videoEl = videoRef.current;
        const threeCanvasEl = threeCanvasRef.current;
        const handsCanvasEl = handsCanvasRef.current;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
        });
        videoEl.srcObject = stream;
        await new Promise((resolve) => {
          videoEl.onloadedmetadata = resolve;
        });

        const width = videoEl.videoWidth;
        const height = videoEl.videoHeight;
        threeCanvasEl.width = width;
        threeCanvasEl.height = height;
        handsCanvasEl.width = width;
        handsCanvasEl.height = height;
        const handsCtx = handsCanvasEl.getContext("2d")!;

        const scene = new THREE.Scene();
        sceneRef.current = scene;
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.z = 5;
        cameraRef.current = camera;
        
        const renderer = new THREE.WebGLRenderer({
          canvas: threeCanvasEl,
          alpha: true,
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        rendererRef.current = renderer;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7.5);
        scene.add(directionalLight);

        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x007bff, roughness: 0.5 });
        const cube = new THREE.Mesh(geometry, material);
        cubeRef.current = cube;
        scene.add(cube);

        hands = new window.Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });
        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((results: any) => {
          handsCtx.save();
          handsCtx.clearRect(0, 0, handsCanvasEl.width, handsCanvasEl.height);
          
          if (results.multiHandLandmarks) {
            results.multiHandLandmarks.forEach((landmarks: any, i: number) => {
                window.drawConnectors(handsCtx, landmarks, window.HAND_CONNECTIONS, { color: '#007BFF', lineWidth: 5 });
                window.drawLandmarks(handsCtx, landmarks, { color: '#FFC107', lineWidth: 2, radius: 5 });
            });
            
            let leftHand = null;
            if(results.multiHandedness){
              results.multiHandedness.forEach((handedness: any, i: number) => {
                if (handedness.label === 'Right') leftHand = results.multiHandLandmarks[i];
              });
            }

            if (leftHand && isFist(leftHand)) {
              const x = (1 - leftHand[9].x) * window.innerWidth;
              const y = leftHand[9].y * window.innerHeight;
    
              if (previousLeftFist.current && camera) {
                const deltaX = x - previousLeftFist.current.x;
                const deltaY = y - previousLeftFist.current.y;
                
                const radius = camera.position.length();
                const theta = Math.atan2(camera.position.x, camera.position.z) + deltaX * -0.005;
                const phi = Math.atan2(camera.position.y, Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2)) - deltaY * -0.005;
                const clampedPhi = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, phi));
    
                camera.position.x = radius * Math.sin(theta) * Math.cos(clampedPhi);
                camera.position.z = radius * Math.cos(theta) * Math.cos(clampedPhi);
                camera.position.y = radius * Math.sin(clampedPhi);
                camera.lookAt(new THREE.Vector3(0, 0, 0));
              }
              previousLeftFist.current = { x, y };
            } else {
              previousLeftFist.current = null;
            }
          } else {
             previousLeftFist.current = null;
          }

          handsCtx.restore();
        });
        
        mpCamera = new window.Camera(videoEl, {
          onFrame: async () => {
            await hands.send({ image: videoEl });
          },
          width: width,
          height: height,
        });
        mpCamera.start();
        
        const animate = () => {
          animationFrameId = requestAnimationFrame(animate);
          cube.rotation.x += 0.005;
          cube.rotation.y += 0.01;
          renderer.render(scene, camera);
        };
        animate();

        setStatus("ready");
      } catch (err) {
        let message = "An unknown error occurred.";
        if (err instanceof Error) {
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                message = "Camera access was denied. Please allow camera access in your browser settings to use this application.";
            } else {
                message = err.message;
            }
        }
        setErrorMessage(message);
        setStatus("error");
      }
    };

    init();

    return cleanup;
  }, []);

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center">
      {status === "error" && (
        <Alert variant="destructive" className="max-w-md">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Initialization Failed</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="absolute inset-0">
         <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className="w-full h-full object-cover transform -scale-x-100"
            style={{ display: status !== 'loading' ? 'block' : 'none' }}
          />
          <canvas
            ref={threeCanvasRef}
            className="absolute top-0 left-0 w-full h-full"
          />
          <canvas
            ref={handsCanvasRef}
            className="absolute top-0 left-0 w-full h-full transform -scale-x-100 pointer-events-none"
          />
      </div>
    </div>
  );
}
