
"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, FlaskConical, Terminal } from "lucide-react";
import data from "@/lib/elementos.json";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import combinationRules from "@/lib/reglas.json";

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
type CombinationHint = {
    producto: string;
    faltantes: { simbolo: string; cantidad: number }[];
};


const BOHR_MODEL_CONFIG = {
    nucleusSize: 0.5,
    nucleusColor: 0xff5555,
    electronSize: 0.15,
    electronColor: 0x00aaff,
    orbitWidth: 0.02,
    orbitColor: 0x888888,
    baseOrbitRadius: 1.2,
    orbitSpacing: 0.8
};

function BohrModelCanvas({ element }: { element: any | null }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const modelRef = useRef<THREE.Group | null>(null);

    useEffect(() => {
        if (!canvasRef.current || !element || !element.electrons || !Array.isArray(element.electrons)) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, canvasRef.current.width / canvasRef.current.height, 0.1, 100);
        camera.position.z = 10;
        
        const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true });
        renderer.setSize(canvasRef.current.width, canvasRef.current.height);

        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7.5);
        scene.add(directionalLight);

        // Clear previous model
        if (modelRef.current) {
            scene.remove(modelRef.current);
        }

        const modelGroup = new THREE.Group();
        modelRef.current = modelGroup;

        const nucleusGeometry = new THREE.SphereGeometry(BOHR_MODEL_CONFIG.nucleusSize, 32, 32);
        const nucleusMaterial = new THREE.MeshLambertMaterial({ color: BOHR_MODEL_CONFIG.nucleusColor });
        const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
        modelGroup.add(nucleus);

        
        let currentRadius = BOHR_MODEL_CONFIG.baseOrbitRadius;
        element.electrons.forEach((numElectrons: number, shellIndex: number) => {
            const orbitGeometry = new THREE.TorusGeometry(currentRadius, BOHR_MODEL_CONFIG.orbitWidth, 16, 100);
            const orbitMaterial = new THREE.MeshBasicMaterial({ color: BOHR_MODEL_CONFIG.orbitColor });
            const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
            orbit.rotation.x = Math.PI / 2;
            modelGroup.add(orbit);

            for (let i = 0; i < numElectrons; i++) {
                const electronGeometry = new THREE.SphereGeometry(BOHR_MODEL_CONFIG.electronSize, 16, 16);
                const electronMaterial = new THREE.MeshBasicMaterial({ color: BOHR_MODEL_CONFIG.electronColor });
                const electron = new THREE.Mesh(electronGeometry, electronMaterial);

                const angle = (i / numElectrons) * Math.PI * 2;
                electron.position.set(Math.cos(angle) * currentRadius, 0, Math.sin(angle) * currentRadius);
                electron.userData = {
                    orbitRadius: currentRadius,
                    initialAngle: angle,
                    orbitSpeed: 0.5 + (shellIndex * 0.2),
                };
                modelGroup.add(electron);
            }
            currentRadius += BOHR_MODEL_CONFIG.orbitSpacing;
        });
        
        modelGroup.rotation.x = -Math.PI / 8;
        modelGroup.rotation.y = -Math.PI / 8;
        scene.add(modelGroup);

        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const time = Date.now() * 0.0005;
            modelGroup.children.forEach((child: any) => {
                if (child.userData.orbitRadius) {
                    const speed = child.userData.orbitSpeed;
                    const angle = child.userData.initialAngle + time * speed;
                    const radius = child.userData.orbitRadius;
                    child.position.x = Math.cos(angle) * radius;
                    child.position.z = Math.sin(angle) * radius;
                }
            });
            renderer.render(scene, camera);
        };

        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
            renderer.dispose();
             modelGroup.traverse((child: any) => {
                if (child.isMesh) {
                    child.geometry?.dispose();
                    if (child.material) {
                         const materials = Array.isArray(child.material) ? child.material : [child.material];
                         materials.forEach((mat: any) => {
                             if (mat.map) mat.map.dispose();
                             mat.dispose();
                         });
                    }
                }
            });
            if(modelRef.current) scene.remove(modelRef.current);
        };
    }, [element]);

    if (!element) return null;

    return <canvas ref={canvasRef} className="w-full h-48" width="256" height="192" />;
}

function StatsCard({ element }: { element: any | null }) {
    if (!element) return null;

    return (
        <Card className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm border-gray-200/80 shadow-lg w-64 z-20">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">{element.simbolo}</span>
                    <span className="text-2xl font-semibold">{element.nombre}</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <BohrModelCanvas element={element} />
                <div className="grid grid-cols-2 gap-2 text-sm mt-4">
                    <div>
                        <p className="font-semibold">N. Atómico</p>
                        <p>{element.numeroAtomico}</p>
                    </div>
                    <div>
                        <p className="font-semibold">Protones</p>
                        <p>{element.protones}</p>
                    </div>
                    <div>
                        <p className="font-semibold">Neutrones</p>
                        <p>{element.neutrones}</p>
                    </div>
                    <div>
                        <p className="font-semibold">Electrones</p>
                        <p>{element.electrons && Array.isArray(element.electrons) ? element.electrons.reduce((a: number, b: number) => a + b, 0) : 'N/A'}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function CombinationGuide({ hints, mixedElements }: { hints: CombinationHint[], mixedElements: any[] }) {
    if (mixedElements.length === 0) return null;
    return (
        <Card className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm border-gray-200/80 shadow-lg w-full max-w-sm z-20">
            <CardHeader>
                <CardTitle className="text-xl">Guía de Combinación</CardTitle>
            </CardHeader>
            <CardContent>
                {hints.length > 0 ? (
                    <ul className="space-y-2">
                        {hints.map(hint => (
                            <li key={hint.producto} className="text-sm">
                                Para formar <span className="font-bold">{hint.producto.replace(/_/g, ' ')}</span>, necesitas: {hint.faltantes.map(f => `${f.cantidad}x ${f.simbolo}`).join(', ')}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">No hay combinaciones conocidas para los elementos actuales.</p>
                )}
            </CardContent>
        </Card>
    )
}

export default function AtomicCanvasClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const threeCanvasRef = useRef<HTMLCanvasElement>(null);
  const handsCanvasRef = useRef<HTMLCanvasElement>(null);

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const combinationAreaRef = useRef<THREE.Mesh | null>(null);

  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [selectedElement, setSelectedElement] = useState<any | null>(null);
  const [mixedElements, setMixedElements] = useState<any[]>([]);
  const [combinationHints, setCombinationHints] = useState<CombinationHint[]>([]);
  const { toast } = useToast();

  const cardMeshesRef = useRef<THREE.Group[]>([]);
  const draggedCardRef = useRef<THREE.Group | null>(null);
  const pinchState = useRef({
    isPinching: false,
    lastScreenPos: { x: 0, y: 0 },
  }).current;

    const checkCombinations = (currentElements: any[]) => {
        const counts: { [key: string]: number } = currentElements.reduce((acc, el) => {
            acc[el.simbolo] = (acc[el.simbolo] || 0) + 1;
            return acc;
        }, {});

        for (const rule of combinationRules.reglas) {
            const requiredCounts: { [key: string]: number } = rule.reactivos.reduce((acc, r) => {
                acc[r.simbolo] = r.cantidad;
                return acc;
            }, {} as { [key: string]: number });

            const isMatch = Object.keys(requiredCounts).length === Object.keys(counts).length &&
                Object.keys(requiredCounts).every(simbolo => counts[simbolo] === requiredCounts[simbolo]);

            if (isMatch) {
                toast({
                    title: "¡Molécula Formada!",
                    description: `Has creado ${rule.producto.replace(/_/g, ' ')}.`,
                    action: <div className="p-2 rounded-full bg-green-500"><CheckCircle className="text-white" /></div>
                });
                setMixedElements([]);
                setCombinationHints([]);
                break;
            }
        }
    }


    const updateCombinationHints = (currentElements: any[]) => {
        if (currentElements.length === 0) {
            setCombinationHints([]);
            return;
        }

        const counts: { [key: string]: number } = currentElements.reduce((acc, el) => {
            acc[el.simbolo] = (acc[el.simbolo] || 0) + 1;
            return acc;
        }, {});

        const hints: CombinationHint[] = [];
        combinationRules.reglas.forEach(rule => {
            const ruleCounts: { [key: string]: number } = rule.reactivos.reduce((acc, r) => {
                acc[r.simbolo] = r.cantidad;
                return acc;
            }, {} as { [key: string]: number });

            const isPartialMatch = Object.keys(counts).every(simbolo => ruleCounts[simbolo] >= counts[simbolo]);

            if (isPartialMatch) {
                const faltantes = rule.reactivos.map(r => ({
                    simbolo: r.simbolo,
                    cantidad: r.cantidad - (counts[r.simbolo] || 0)
                })).filter(f => f.cantidad > 0);

                if (faltantes.length > 0 && faltantes.length < rule.reactivos.length + Object.keys(counts).length) {
                    hints.push({ producto: rule.producto, faltantes });
                }
            }
        });
        setCombinationHints(hints);
    }


  useEffect(() => {
    if (typeof window === "undefined") return;

    let animationFrameId: number;
    let hands: any;
    let mpCamera: any;
    
    const mixedElementsRef = React.createRef<any[]>();
    mixedElementsRef.current = mixedElements;

    const cleanup = () => {
      cancelAnimationFrame(animationFrameId);
      mpCamera?.stop();
      hands?.close();
      if(videoRef.current?.srcObject){
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach((track) => track.stop());
      }
      rendererRef.current?.dispose();
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
        const currentMixedElements = mixedElementsRef.current || [];
        const indexTip = handLandmarks[8];
        const thumbTip = handLandmarks[4];
        const distance = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
        const isPinchingNow = distance < 0.05;

        const pinchXNormalized = (indexTip.x + thumbTip.x) / 2;
        const pinchYNormalized = (indexTip.y + thumbTip.y) / 2;
        
        const screenX = (1 - pinchXNormalized) * window.innerWidth;
        const screenY = pinchYNormalized * window.innerHeight;

        const isStartingPinch = isPinchingNow && !pinchState.isPinching;
        const isEndingPinch = !isPinchingNow && pinchState.isPinching;

        pinchState.isPinching = isPinchingNow;

        // Handle Dragging
        if (draggedCardRef.current && isPinchingNow) {
            const dragDeltaX = screenX - pinchState.lastScreenPos.x;
            const dragDeltaY = screenY - pinchState.lastScreenPos.y;

            const vector = new THREE.Vector3();
            vector.copy(draggedCardRef.current.position);
            vector.project(camera); 

            vector.x += (dragDeltaX / window.innerWidth) * 2;
            vector.y -= (dragDeltaY / window.innerHeight) * 2;
            
            vector.unproject(camera); 
            
            const dir = vector.sub(camera.position).normalize();
            const distanceToCamera = draggedCardRef.current.position.distanceTo(camera.position);
            const newPos = camera.position.clone().add(dir.multiplyScalar(distanceToCamera));
            
            draggedCardRef.current.position.x = newPos.x;
            draggedCardRef.current.position.y = newPos.y;
            
            pinchState.lastScreenPos = { x: screenX, y: screenY };
            return;
        }
        
        // Handle Pinch End
        if (isEndingPinch && draggedCardRef.current) {
            const combinationArea = combinationAreaRef.current;
            if (combinationArea) {
                const cardBox = new THREE.Box3().setFromObject(draggedCardRef.current);
                const areaBox = new THREE.Box3().setFromObject(combinationArea);
                if (cardBox.intersectsBox(areaBox)) {
                    const newMixedElements = [...currentMixedElements, draggedCardRef.current.userData];
                    setMixedElements(newMixedElements);
                    updateCombinationHints(newMixedElements);
                    checkCombinations(newMixedElements);
                }
            }

            draggedCardRef.current.userData.isDragging = false;
            // Snap back
            const originalPos = draggedCardRef.current.userData.originalPosition;
            draggedCardRef.current.position.set(originalPos.x, originalPos.y, originalPos.z);
            draggedCardRef.current = null;
            setSelectedElement(null); // Clear selection on drop
            return;
        }

        // Handle Hover and Pinch Start
        let hoveredCard: THREE.Group | null = null;
        
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2(
            (1 - pinchXNormalized) * 2 - 1,
            -pinchYNormalized * 2 + 1
        );
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
        
        cardMeshesRef.current.forEach(card => {
             if (card !== hoveredCard && !card.userData.isDragging) {
                 card.scale.set(1, 1, 1);
             }
        });

        if (hoveredCard) {
             if (isStartingPinch && !draggedCardRef.current) {
                draggedCardRef.current = hoveredCard;
                hoveredCard.userData.isDragging = true;
                pinchState.lastScreenPos = { x: screenX, y: screenY };
                setSelectedElement(hoveredCard.userData);
             } else if (!draggedCardRef.current) {
                hoveredCard.scale.set(1.15, 1.15, 1.15);
                setSelectedElement(hoveredCard.userData);
             }
        } else if (!draggedCardRef.current) {
            setSelectedElement(null);
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
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
        cameraRef.current = camera;
        
        const worldWidth = 14; 
        const worldHeight = 8; 
        camera.position.z = Math.max(
          worldWidth / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2) * camera.aspect)),
          worldHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
        ) + 2;


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

        // Create Combination Area
        const comboAreaGeometry = new THREE.BoxGeometry(4, 2, 0.2);
        const comboAreaMaterial = new THREE.MeshBasicMaterial({ color: 0x007bff, transparent: true, opacity: 0.3 });
        const comboAreaMesh = new THREE.Mesh(comboAreaGeometry, comboAreaMaterial);
        comboAreaMesh.position.set(0, 3.5, 0);
        scene.add(comboAreaMesh);
        combinationAreaRef.current = comboAreaMesh;

        hands = new window.Hands({ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
        hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.5 });
        
        hands.onResults((results: any) => {
          handsCtx.save();
          handsCtx.clearRect(0, 0, handsCanvasEl.width, handsCanvasEl.height);

          if (results.multiHandLandmarks && cameraRef.current) {
             let leftHand = null, rightHand = null;
            if(results.multiHandedness.length > 0){
              results.multiHandedness.forEach((handedness: any, i: number) => {
                if (handedness.label === 'Right') leftHand = results.multiHandLandmarks[i];
                else rightHand = results.multiHandLandmarks[i];
              });
            } else if (results.multiHandLandmarks.length > 0) {
              // Fallback if handedness is not available
              rightHand = results.multiHandLandmarks[0];
              if(results.multiHandLandmarks.length > 1) {
                  leftHand = results.multiHandLandmarks[1];
              }
            }


            if(rightHand) {
                 detectCardInteraction(rightHand, cameraRef.current);
                 window.drawConnectors(handsCtx, rightHand, window.HAND_CONNECTIONS, { color: '#FF7B00', lineWidth: 5 });
                 window.drawLandmarks(handsCtx, rightHand, { color: '#07C1FF', lineWidth: 2, radius: 5 });
            } else {
                 if (draggedCardRef.current) {
                    draggedCardRef.current.userData.isDragging = false;
                    const originalPos = draggedCardRef.current.userData.originalPosition;
                    draggedCardRef.current.position.set(originalPos.x, originalPos.y, originalPos.z);
                    draggedCardRef.current = null;
                    setSelectedElement(null);
                 }
                 pinchState.isPinching = false;
            }

            if (leftHand) {
                window.drawConnectors(handsCtx, leftHand, window.HAND_CONNECTIONS, { color: '#007BFF', lineWidth: 5 });
                window.drawLandmarks(handsCtx, leftHand, { color: '#FFC107', lineWidth: 2, radius: 5 });
            } 
          } else {
             if (draggedCardRef.current) {
                draggedCardRef.current.userData.isDragging = false;
                const originalPos = draggedCardRef.current.userData.originalPosition;
                draggedCardRef.current.position.set(originalPos.x, originalPos.y, originalPos.z);
                draggedCardRef.current = null;
                setSelectedElement(null);
            }
            pinchState.isPinching = false;
          }

          handsCtx.restore();
        });

        mpCamera = new window.Camera(videoEl, {
          onFrame: async () => await hands.send({ image: videoEl }),
          width: width,
          height: height,
        });
        mpCamera.start();

        const animate = () => {
          animationFrameId = requestAnimationFrame(animate);
          if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
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
  }, [mixedElements]); 

  const handleClearMixedElements = () => {
    setMixedElements([]);
    setCombinationHints([]);
  }

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center">
      {status === "error" && (
        <Alert variant="destructive" className="max-w-md z-20">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Initialization Failed</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="absolute inset-0 z-0">
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
          className="absolute top-0 left-0 w-full h-full transform -scale-x-100 pointer-events-none z-10"
        />
        <StatsCard element={selectedElement} />
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-6 py-2 rounded-lg flex items-center gap-2 z-20">
            <FlaskConical />
            <p className="font-bold text-lg">Espacio de Combinación</p>
            <div className="flex gap-2 ml-4">
                {mixedElements.map((el, i) => (
                    <span key={i} className="bg-white/30 text-black font-bold px-2 py-1 rounded-md text-sm">{el.simbolo}</span>
                ))}
            </div>
            {mixedElements.length > 0 && (
                <Button variant="destructive" size="sm" onClick={handleClearMixedElements}>Limpiar</Button>
            )}
        </div>
        <CombinationGuide hints={combinationHints} mixedElements={mixedElements} />
      </div>
    </div>
  );
}

    

    
