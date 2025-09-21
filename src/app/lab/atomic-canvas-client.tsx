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

  useEffect(() => {
    // Ensure this runs only on the client
    if (typeof window === "undefined") return;

    let animationFrameId: number;

    const cleanup = () => {
      cancelAnimationFrame(animationFrameId);
      
      // Stop video stream
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach((track) => track.stop());

      // Dispose Three.js objects
      rendererRef.current?.dispose();
      cubeRef.current?.geometry.dispose();
      (cubeRef.current?.material as THREE.Material)?.dispose();
    };

    const init = async () => {
      try {
        if (!videoRef.current || !threeCanvasRef.current || !handsCanvasRef.current) {
          throw new Error("Canvas or video element not found.");
        }
        
        // Wait for MediaPipe scripts to load
        while (!window.Hands || !window.Camera || !window.drawConnectors) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const videoEl = videoRef.current;
        const threeCanvasEl = threeCanvasRef.current;
        const handsCanvasEl = handsCanvasRef.current;

        // --- Setup Camera ---
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


        // --- Setup Three.js Scene ---
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.z = 5;
        cameraRef.current = camera;
        
        const renderer = new THREE.WebGLRenderer({
          canvas: threeCanvasEl,
          alpha: true, // Transparent background
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

        // --- Setup MediaPipe Hands ---
        const hands = new window.Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });
        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((results: any) => {
          handsCtx.save();
          handsCtx.clearRect(0, 0, handsCanvasEl.width, handsCanvasEl.height);
          if (results.multiHandLandmarks) {
            for (const landmarks of results.multiHandLandmarks) {
              window.drawConnectors(handsCtx, landmarks, window.HAND_CONNECTIONS, { color: '#007BFF', lineWidth: 5 });
              window.drawLandmarks(handsCtx, landmarks, { color: '#FFC107', lineWidth: 2, radius: 5 });
            }
          }
          handsCtx.restore();
        });
        
        const mpCamera = new window.Camera(videoEl, {
          onFrame: async () => {
            await hands.send({ image: videoEl });
          },
          width: width,
          height: height,
        });
        mpCamera.start();
        
        // --- Animation Loop ---
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
            style={{ display: status === 'ready' ? 'block' : 'none' }}
          />
          <canvas
            ref={threeCanvasRef}
            className="absolute top-0 left-0 w-full h-full"
          />
          <canvas
            ref={handsCanvasRef}
            className="absolute top-0 left-0 w-full h-full transform -scale-x-100"
          />
      </div>
    </div>
  );
}
