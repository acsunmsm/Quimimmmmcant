
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

const ELEMENTOS_DATA: { [key: string]: any } = {};
data.elementos.forEach(el => {
  ELEMENTOS_DATA[el.simbolo] = el;
});


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

function calculateElectronShells(numElectrons: number): number[] {
  const shells: number[] = [];
  let remainingElectrons = numElectrons;
  let n = 1;
  while (remainingElectrons > 0) {
    const capacity = 2 * n * n;
    const electronsInShell = Math.min(remainingElectrons, capacity);
    shells.push(electronsInShell);
    remainingElectrons -= electronsInShell;
    n++;
  }
  return shells;
}

function BohrModelCanvas({ element }: { element: any | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !element || typeof element.electrones !== 'number') return;

    const electronShells = calculateElectronShells(element.electrones);

    const scene = new THREE.Scene();
    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);

    const maxRadius = electronShells.length > 0
      ? BOHR_MODEL_CONFIG.baseOrbitRadius + (electronShells.length - 1) * BOHR_MODEL_CONFIG.orbitSpacing
      : BOHR_MODEL_CONFIG.baseOrbitRadius;
    camera.position.z = maxRadius * 2.2 + 1;

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true });
    renderer.setSize(width, height, false);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

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
    electronShells.forEach((numElectrons: number, shellIndex: number) => {
      const orbitGeometry = new THREE.TorusGeometry(currentRadius, BOHR_MODEL_CONFIG.orbitWidth, 16, 100);
      const orbitMaterial = new THREE.MeshBasicMaterial({ color: BOHR_MODEL_CONFIG.orbitColor });
      const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
      orbit.rotation.x = Math.PI / 2;
      modelGroup.add(orbit);

      for (let i = 0; i < numElectrons; i++) {
        const electronGeometry = new THREE.SphereGeometry(BOHR_MODEL_CONFIG.electronSize, 16, 16);
        const electronMaterial = new THREE.MeshLambertMaterial({ color: BOHR_MODEL_CONFIG.electronColor });
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
      if (modelRef.current) scene.remove(modelRef.current);
    };
  }, [element]);

  if (!element) return null;

  return <canvas ref={canvasRef} className="w-full h-48" />;
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
            <p>{typeof element.electrones === 'number' ? element.electrones : 'N/A'}</p>
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
    releaseFramesCount: 0,
  }).current;

  const smoothedPinchRef = useRef({ x: 0, y: 0 }); // Added LERP ref for smoothing

  const mixedElementsRef = useRef<any[]>(mixedElements);
  mixedElementsRef.current = mixedElements;

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

    const cleanup = () => {
      cancelAnimationFrame(animationFrameId);
      mpCamera?.stop();
      hands?.close();
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach((track) => track.stop());
      }

      if (sceneRef.current) {
        sceneRef.current.traverse((object: any) => {
          if (!object.isMesh) return;
          object.geometry?.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((mat: any) => {
                if (mat.map) mat.map.dispose();
                mat.dispose();
              });
            } else {
              if (object.material.map) object.material.map.dispose();
              object.material.dispose();
            }
          }
        });
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
      const wrist = handLandmarks[0];
      const middleMcp = handLandmarks[9];

      // 1. MEJORA DEL PELLIZCO: Distancia 2D para máxima estabilidad (Ignoramos Z que causa ruido de cámara web)
      const handSize2D = Math.hypot(wrist.x - middleMcp.x, wrist.y - middleMcp.y);
      const safeHandSize2D = handSize2D > 0.01 ? handSize2D : 0.1;

      const pinchDistance2D = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
      const normalizedPinchDistance = pinchDistance2D / safeHandSize2D;

      const PINCH_START_RATIO = 0.30; // Pellizco ligeramente más cerrado para agarrar
      const PINCH_RELEASE_RATIO = 0.35; // Se suelta con solo aflojar un poquito la presión

      let rawPinchingDetection = pinchState.isPinching;
      
      if (!pinchState.isPinching && normalizedPinchDistance < PINCH_START_RATIO) {
        rawPinchingDetection = true;
      } else if (pinchState.isPinching && normalizedPinchDistance > PINCH_RELEASE_RATIO) {
        rawPinchingDetection = false;
      }

      // Debouncing (Sistema Anti-caídas)
      let isPinchingNow = pinchState.isPinching;
      const FRAMES_TO_WAIT = 2; // Casi instantáneo, solo filtra fallos de 1 frame

      if (rawPinchingDetection) {
        isPinchingNow = true;
        pinchState.releaseFramesCount = 0; 
      } else if (pinchState.isPinching) {
        pinchState.releaseFramesCount++;
        if (pinchState.releaseFramesCount >= FRAMES_TO_WAIT) {
          isPinchingNow = false; 
        }
      }

      // 2. SUAVIZADO LERP DEL CURSOR (Menos temblor)
      const rawPinchXNormalized = (indexTip.x + thumbTip.x) / 2;
      const rawPinchYNormalized = (indexTip.y + thumbTip.y) / 2;

      if (smoothedPinchRef.current.x === 0 && smoothedPinchRef.current.y === 0) {
        smoothedPinchRef.current.x = rawPinchXNormalized;
        smoothedPinchRef.current.y = rawPinchYNormalized;
      }

      const LERP_FACTOR = 0.45; // Balance entre rapidez y suavidad
      smoothedPinchRef.current.x += (rawPinchXNormalized - smoothedPinchRef.current.x) * LERP_FACTOR;
      smoothedPinchRef.current.y += (rawPinchYNormalized - smoothedPinchRef.current.y) * LERP_FACTOR;

      const pinchXNormalized = smoothedPinchRef.current.x;
      const pinchYNormalized = smoothedPinchRef.current.y;

      const isStartingPinch = isPinchingNow && !pinchState.isPinching;
      const isEndingPinch = !isPinchingNow && pinchState.isPinching;

      pinchState.isPinching = isPinchingNow;

      // Coordenadas del ratón virtual (-1 a 1 para Three.js)
      const mouse2D = new THREE.Vector2(
        (1 - pinchXNormalized) * 2 - 1,
        -pinchYNormalized * 2 + 1
      );

      // 3. MOVIMIENTO PERFECTO (Plane Intersection) + Efecto de Peso
      if (draggedCardRef.current && isPinchingNow) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse2D, camera);

        // Creamos un "Muro invisible" matemático en la profundidad exacta del átomo
        const planeNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
        const dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, draggedCardRef.current.position);
        
        const intersectionPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlane, intersectionPoint);

        if (intersectionPoint) {
            // Banda elástica / Peso: El átomo "persigue" a la mano en lugar de pegarse rígidamente
            const FOLLOW_SPEED = 0.45; // Ajusta esto: 1 es instantáneo, 0.1 es muy pesado/lento
            draggedCardRef.current.position.x += (intersectionPoint.x - draggedCardRef.current.position.x) * FOLLOW_SPEED;
            draggedCardRef.current.position.y += (intersectionPoint.y - draggedCardRef.current.position.y) * FOLLOW_SPEED;
        }
        return;
      }

      // Zona de mezcla al soltar
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

        (draggedCardRef.current as any).userData.isDragging = false;
        const originalPos = (draggedCardRef.current as any).userData.originalPosition;
        draggedCardRef.current.position.set(originalPos.x, originalPos.y, originalPos.z);
        draggedCardRef.current = null;
        setSelectedElement(null);
        return;
      }

      // 4. AGARRE POR PROXIMIDAD (Aim Assist magnético)
      let hoveredCard: THREE.Group | null = null;
      let minDistance = Infinity;
      const HOVER_RADIUS = 0.20; // Radio enorme de ayuda (20% de la pantalla). ¡Imposible fallar!

      cardMeshesRef.current.forEach(card => {
        if ((card as any).userData.isDragging) return;

        // Proyectar la posición 3D del átomo a coordenadas 2D en pantalla
        const cardPos2D = card.position.clone();
        cardPos2D.project(camera);

        const distance2D = Math.hypot(cardPos2D.x - mouse2D.x, cardPos2D.y - mouse2D.y);

        if (distance2D < HOVER_RADIUS && distance2D < minDistance) {
            minDistance = distance2D;
            hoveredCard = card;
        }
      });

      // Restaurar el tamaño de las tarjetas que ya no estamos apuntando (con animación suave LERP)
      cardMeshesRef.current.forEach(card => {
          if (card !== hoveredCard && !(card as any).userData.isDragging) {
              (card as any).scale.lerp(new THREE.Vector3(1, 1, 1), 0.2);
          }
      });

      // Efectos visuales al apuntar o agarrar
      if (hoveredCard) {
        if (isStartingPinch && !draggedCardRef.current) {
          draggedCardRef.current = hoveredCard;
          (hoveredCard as any).userData.isDragging = true;
          setSelectedElement((hoveredCard as any).userData);
        } else if (!draggedCardRef.current) {
          (hoveredCard as any).scale.lerp(new THREE.Vector3(1.15, 1.15, 1.15), 0.2); // "Pop" visual suave
          setSelectedElement((hoveredCard as any).userData);
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

        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } } });
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
        renderer.setSize(width, height, false);
        rendererRef.current = renderer;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7.5);
        scene.add(directionalLight);

        createCards(scene);

        const comboAreaGeometry = new THREE.BoxGeometry(4, 2, 0.2);
        const comboAreaMaterial = new THREE.MeshBasicMaterial({ color: 0x007bff, transparent: true, opacity: 0.3 });
        const comboAreaMesh = new THREE.Mesh(comboAreaGeometry, comboAreaMaterial);
        comboAreaMesh.position.set(0, 3.5, 0);
        scene.add(comboAreaMesh);
        combinationAreaRef.current = comboAreaMesh;

        hands = new window.Hands({ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
        hands.setOptions({ maxNumHands: 2, modelComplexity: 0, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });

        hands.onResults((results: any) => {
          handsCtx.save();
          handsCtx.clearRect(0, 0, handsCanvasEl.width, handsCanvasEl.height);

          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0 && cameraRef.current) {
            let interactingHand = null;

            results.multiHandLandmarks.forEach((landmarks: any, i: number) => {
              const isRight = results.multiHandedness?.[i]?.label !== 'Right'; // MediaPipe mirrors 'Right' as left hand
              const color = isRight ? '#FF7B00' : '#007BFF';
              const landmarkColor = isRight ? '#07C1FF' : '#FFC107';

              if (i === 0) interactingHand = landmarks;

              window.drawConnectors(handsCtx, landmarks, window.HAND_CONNECTIONS, { color: color, lineWidth: 5 });
              window.drawLandmarks(handsCtx, landmarks, { color: landmarkColor, lineWidth: 2, radius: 5 });
            });

            if (interactingHand) {
              detectCardInteraction(interactingHand, cameraRef.current);
            }

          } else {
            // Reset LERP when hand is lost to avoid jumping when it returns
            smoothedPinchRef.current = { x: 0, y: 0 };
            pinchState.releaseFramesCount = 0; // Reset debouncing counter

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
  }, []);

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
          className="absolute top-0 left-0 w-full h-full object-cover"
        />
        <canvas
          ref={handsCanvasRef}
          className="absolute top-0 left-0 w-full h-full object-cover transform -scale-x-100 pointer-events-none z-10"
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
