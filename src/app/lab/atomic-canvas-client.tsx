"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import data from "@/lib/elementos.json";

const ELEMENTOS_DATA = data.elementos.reduce((acc, el) => {
  acc[el.simbolo] = el;
  return acc;
}, {} as any);


const CARD_POSITIONS: { [key: string]: { x: number, y: number, z: number } } = {
  H: { x: -6, y: -1, z: 0 },
  He: { x: 6, y: -1, z: 0 },
  Li: { x: -6, y: -2.5, z: 0 },
  Be: { x: -4, y: -2.5, z: 0 },
  B: { x: -2, y: -2.5, z: 0 },
  C: { x: 0, y: -2.5, z: 0 },
  N: { x: 2, y: -2.5, z: 0 },
  O: { x: 4, y: -2.5, z: 0 },
  F: { x: 6, y: -2.5, z: 0 },
  Na: { x: -6, y: -4, z: 0 },
  Mg: { x: -4, y: -4, z: 0 },
  Al: { x: -2, y: -4, z: 0 },
  Si: { x: 0, y: -4, z: 0 },
  P: { x: 2, y: -4, z: 0 },
  S: { x: 4, y: -4, z: 0 },
  Cl: { x: 6, y: -4, z: 0 },
};

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

  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const previousLeftFist = useRef<{ x: number, y: number } | null>(null);

  const cardMeshesRef = useRef<THREE.Group[]>([]);
  const draggedCardRef = useRef<THREE.Group | null>(null);
  const pinchState = useRef({
    isPinching: false,
    lastScreenPos: { x: 0, y: 0 },
  }).current;

  useEffect(() => {
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
    };

    const isFist = (landmarks: any[]) => {
      const fingerTipIndices = [4, 8, 12, 16, 20];
      return fingerTipIndices.every(i => landmarks[i].y > landmarks[i - 2].y);
    };

    const createCard = (symbol: string, elementData: any, position: { x: number, y: number, z: number }) => {
      const group = new THREE.Group();
      const cardGeometry = new THREE.BoxGeometry(1.8, 1.2, 0.15);
      const cardMaterial = new THREE.MeshLambertMaterial({
        color: parseInt(elementData.color.replace(/^0x/, ''), 16),
        transparent: true,
        opacity: 0.9
      });
      const cardMesh = new THREE.Mesh(cardGeometry, cardMaterial);
      const edgeGeometry = new THREE.EdgesGeometry(cardGeometry);
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: 0x333333,
        linewidth: 2
      });
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      group.position.set(position.x, position.y, position.z);

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = 512;
      canvas.height = 256;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#000000';
      context.font = 'bold 120px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.shadowColor = 'rgba(255, 255, 255, 0.8)';
      context.shadowBlur = 4;
      context.shadowOffsetX = 2;
      context.shadowOffsetY = 2;
      context.fillText(symbol, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      const textMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 1.0
      });

      const textGeometry = new THREE.PlaneGeometry(1.85, 1.25);
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.z = 0.08;

      group.add(cardMesh, edges, textMesh);
      group.userData = {
        ...elementData,
        title: symbol,
        originalPosition: { ...position },
        isDragging: false
      };
      return group;
    }

    const createCards = (scene: THREE.Scene) => {
      Object.keys(ELEMENTOS_DATA).forEach(symbol => {
        const elementData = ELEMENTOS_DATA[symbol];
        const position = CARD_POSITIONS[symbol];
        if (elementData && position) {
          const card = createCard(symbol, elementData, position);
          scene.add(card);
          cardMeshesRef.current.push(card);
        }
      });
    }
    
    const detectCardInteraction = (handLandmarks: any, camera: THREE.Camera) => {
        const indexTip = handLandmarks[8];
        const thumbTip = handLandmarks[4];
        const distance = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
        const isPinchingNow = distance < 0.05;

        const pinchScreenX = (1 - (indexTip.x + thumbTip.x) / 2) * window.innerWidth;
        const pinchScreenY = ((indexTip.y + thumbTip.y) / 2) * window.innerHeight;

        const isStartingPinch = isPinchingNow && !pinchState.isPinching;
        const isEndingPinch = !isPinchingNow && pinchState.isPinching;

        pinchState.isPinching = isPinchingNow;

        // --- Handle Dragging ---
        if (draggedCardRef.current && isPinchingNow) {
            const dragDeltaX = pinchScreenX - pinchState.lastScreenPos.x;
            const dragDeltaY = pinchScreenY - pinchState.lastScreenPos.y;

            const vector = new THREE.Vector3();
            vector.copy(draggedCardRef.current.position);
            vector.project(camera); // screen-space position of the object (-1 to +1)

            // Convert delta from screen pixels to NDC
            vector.x += (dragDeltaX / window.innerWidth) * 2;
            vector.y -= (dragDeltaY / window.innerHeight) * 2;
            
            vector.unproject(camera); // convert back to world space
            
            // Maintain original Z-distance from camera
            const dir = vector.sub(camera.position).normalize();
            const distance = -camera.position.z / dir.z; 
            const newPos = camera.position.clone().add(dir.multiplyScalar(distance));
            
            draggedCardRef.current.position.x = newPos.x;
            draggedCardRef.current.position.y = newPos.y;
            
            pinchState.lastScreenPos = { x: pinchScreenX, y: pinchScreenY };
            return;
        }

        // --- Handle End of Drag (Drop) ---
        if (isEndingPinch && draggedCardRef.current) {
            draggedCardRef.current.userData.isDragging = false;
            draggedCardRef.current = null;
        }

        // --- Detect Hover and Start of Drag (Grab) ---
        let hoveredCard: THREE.Group | null = null;
        let minDistance = Infinity;

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        mouse.x = (pinchScreenX / window.innerWidth) * 2 - 1;
        mouse.y = -(pinchScreenY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(cardMeshesRef.current, true);

        if (intersects.length > 0) {
            let parentGroup = intersects[0].object;
            while(parentGroup.parent && parentGroup.parent.type !== 'Scene') {
                parentGroup = parentGroup.parent;
            }
            if (parentGroup.type === 'Group') {
                 hoveredCard = parentGroup as THREE.Group;
            }
        }
        
        // Reset scale for all non-hovered cards
        cardMeshesRef.current.forEach(card => {
             if (card !== hoveredCard && !card.userData.isDragging) {
                 card.scale.set(1, 1, 1);
             }
        });

        if (hoveredCard) {
             if (isStartingPinch && !draggedCardRef.current) {
                // Start dragging
                draggedCardRef.current = hoveredCard;
                hoveredCard.userData.isDragging = true;
                pinchState.lastScreenPos = { x: pinchScreenX, y: pinchScreenY };
             } else if (!draggedCardRef.current) {
                // Hover effect only if not dragging anything
                hoveredCard.scale.set(1.15, 1.15, 1.15);
             }
        }
    }


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

        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        videoEl.srcObject = stream;
        await new Promise((resolve) => { videoEl.onloadedmetadata = resolve; });

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

        const renderer = new THREE.WebGLRenderer({ canvas: threeCanvasEl, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        rendererRef.current = renderer;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7.5);
        scene.add(directionalLight);
        
        createCards(scene);

        hands = new window.Hands({ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
        hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.5 });

        hands.onResults((results: any) => {
          handsCtx.save();
          handsCtx.clearRect(0, 0, handsCanvasEl.width, handsCanvasEl.height);

          if (results.multiHandLandmarks && camera) {
             let leftHand = null, rightHand = null;
            if(results.multiHandedness){
              results.multiHandedness.forEach((handedness: any, i: number) => {
                if (handedness.label === 'Right') leftHand = results.multiHandLandmarks[i];
                else rightHand = results.multiHandLandmarks[i];
              });
            }

            if(rightHand) {
                 detectCardInteraction(rightHand, camera);
                 window.drawConnectors(handsCtx, rightHand, window.HAND_CONNECTIONS, { color: '#FF7B00', lineWidth: 5 });
                 window.drawLandmarks(handsCtx, rightHand, { color: '#07C1FF', lineWidth: 2, radius: 5 });
            } else {
                 // If no right hand, ensure we stop dragging
                 if (draggedCardRef.current) {
                    draggedCardRef.current.userData.isDragging = false;
                    draggedCardRef.current = null;
                 }
                 pinchState.isPinching = false;
            }

            if (leftHand) {
                window.drawConnectors(handsCtx, leftHand, window.HAND_CONNECTIONS, { color: '#007BFF', lineWidth: 5 });
                window.drawLandmarks(handsCtx, leftHand, { color: '#FFC107', lineWidth: 2, radius: 5 });
              if (isFist(leftHand)) {
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
          } else {
            previousLeftFist.current = null;
          }

          handsCtx.restore();
        });

        mpCamera = new window.Camera(videoEl, {
          onFrame: async () => { await hands.send({ image: videoEl }); },
          width: width,
          height: height,
        });
        mpCamera.start();

        const animate = () => {
          animationFrameId = requestAnimationFrame(animate);
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
