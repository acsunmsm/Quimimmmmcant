'use client';
import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import type { Reaction } from '@/lib/chemistry';

type Props = { atoms?: string[]; reaction?: Reaction | null; robot?: boolean; talking?: boolean; className?: string };
const emptyAtoms: string[] = [];
const purple = 0x412bfd, cyan = 0x6fedee;
function release(root: T.Object3D) {
  root.traverse(object => {
    const mesh = object as T.Mesh;
    mesh.geometry?.dispose();
    if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      (material as T.MeshBasicMaterial).map?.dispose(); material.dispose();
    }
  });
}
function ball(radius: number, color: number) {
  return new T.Mesh(new T.SphereGeometry(radius,32,24),new T.MeshStandardMaterial({color,roughness:0.27,metalness:0.16}));
}
function label(text: string) {
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = text === 'H' ? '#242139' : '#ffffff'; ctx.font = '600 64px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text,64,66);
  const texture = new T.CanvasTexture(canvas);
  const sprite = new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:false})); sprite.scale.set(0.6,0.6,1); return sprite;
}
function robotModel() {
  const root = new T.Group();
  const head = ball(0.83,0xffffff); head.scale.set(1.16,0.82,0.8); head.position.y=0.6; root.add(head);
  const visor = ball(0.68,0x201c45); visor.scale.set(1.12,0.62,0.3); visor.position.set(0,0.63,0.52); root.add(visor);
  for (const x of [-0.27,0.27]) { const eye = ball(0.105,cyan); eye.scale.y=1.3; eye.position.set(x,0.66,0.73); root.add(eye); }
  const mouth = new T.Mesh(new T.TorusGeometry(0.15,0.025,8,24,Math.PI),new T.MeshBasicMaterial({color:cyan}));
  mouth.rotation.z=Math.PI; mouth.position.set(0,0.5,0.745); root.add(mouth);
  const body = ball(0.6,0xffffff); body.scale.set(0.85,0.9,0.65); body.position.y=-0.45; root.add(body);
  const badge = ball(0.13,purple); badge.position.set(0,-0.38,0.37); root.add(badge);
  for(const x of [-1,1]) {
    const ear=ball(0.19,purple); ear.position.set(x*0.91,0.6,0); root.add(ear);
    const arm=ball(0.2,cyan); arm.scale.y=1.8; arm.position.set(x*0.68,-0.35,0); arm.rotation.z=x*0.3; root.add(arm);
  }
  const antenna = new T.Mesh(new T.CylinderGeometry(0.025,0.025,0.35,12),new T.MeshStandardMaterial({color:purple})); antenna.position.set(0,1.36,0); root.add(antenna);
  const tip=ball(0.09,cyan); tip.position.y=1.56; root.add(tip);
  return {root,mouth};
}
function moleculePositions(atoms: string[], reaction?: Reaction | null): T.Vector3[] {
  if (!reaction) return atoms.map((_,i)=>new T.Vector3((i%4- Math.min(atoms.length-1,3)/2)*1.3, 0.35+Math.floor(i/4)*1.05, 0));
  if (reaction.formula==='H₂O') {let hydrogen=0; return atoms.map(s=> s==='O'?new T.Vector3(0,0.65,0):new T.Vector3(hydrogen++===0?-0.95:0.95,-0.1,0));}
  if (reaction.formula==='CO₂') {let oxygen=0;return atoms.map(s=>new T.Vector3(s==='C'?0:++oxygen===1?-1.2:1.2,0.45,0));}
  if (atoms.length===2) return atoms.map((_,i)=>new T.Vector3(i===0?-0.57:0.57,0.45,0));
  const center = atoms.findIndex(s=>s!=='H'&&s!=='O');
  let outer=0;
  const tetra = [[1,0.3,0.7],[-1,0.3,0.7],[0,1.05,-0.7],[0,-0.8,-0.7]];
  return atoms.map((_,i)=> {
    if(i===Math.max(0,center)) return new T.Vector3(0,0.4,0);
    const n=outer++;
    if(atoms.length<=5) return new T.Vector3(...tetra[n] as [number,number,number]).add(new T.Vector3(0,0.4,0));
    const a=n/(atoms.length-1)*Math.PI*2; return new T.Vector3(Math.cos(a)*1.65,0.4+Math.sin(a)*1.1,Math.sin(a*2)*0.45);
  });
}
export default function Scene3D({atoms=emptyAtoms,reaction,robot=false,talking=false,className=''}: Props) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const state=useRef({atoms,reaction,talking}); state.current={atoms,reaction,talking};
  const sceneUpdate=useRef<()=>void>();
  const [unavailable,setUnavailable]=useState(false);
  useEffect(()=>sceneUpdate.current?.(),[atoms,reaction]);
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas)return;
    let renderer:T.WebGLRenderer;
    try {renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});} catch {setUnavailable(true);return;}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));
    renderer.setClearColor(0xffffff,0); renderer.outputColorSpace=T.SRGBColorSpace;
    const scene=new T.Scene();
    const camera=new T.PerspectiveCamera(robot?35:38,1,0.1,100);
    camera.position.set(robot?0:0.3,robot?0.5:4,robot?7:8.5); camera.lookAt(0,robot?0.15:0.1,0);
    scene.add(new T.HemisphereLight(0xffffff,0xa4a4c0,2.8));
    const light=new T.DirectionalLight(0xffffff,4); light.position.set(-3,7,5); scene.add(light);
    const fill=new T.DirectionalLight(cyan,1.5); fill.position.set(4,1,-3); scene.add(fill);
    const group=new T.Group(); scene.add(group);
    let robotParts: ReturnType<typeof robotModel> | undefined;
    let started=performance.now();
    let spheres:T.Group[]=[]; let targets:T.Vector3[]=[];
    if(robot) {robotParts=robotModel();group.add(robotParts.root);}
    else {
      const base=new T.Mesh(new T.CylinderGeometry(3.15,3.3,0.18,80),new T.MeshStandardMaterial({color:0xf0f1fb,roughness:0.55,metalness:0.1})); base.position.y=-0.95;scene.add(base);
      const ring=new T.Mesh(new T.TorusGeometry(2.9,0.025,10,100),new T.MeshBasicMaterial({color:0xcac5ff})); ring.rotation.x=Math.PI/2;ring.position.y=-0.85;scene.add(ring);
    }
    const update=()=>{
      if(robot)return;
      release(group);group.clear();spheres=[];
      const {atoms,reaction}=state.current;
      const display=atoms.length?atoms:['H','O','H'];
      targets=moleculePositions(display,reaction || (!atoms.length ? {formula:'H₂O'} as Reaction : null));
      display.forEach((s,i)=>{
        const atom=new T.Group();
        atom.add(ball(s==='H'?0.37:0.51,s==='H'?0x6fedee:s==='O'?purple:s==='C'?0x34314f:0x8374ff));
        const symbol=label(s);symbol.position.set(0,s==='H'?0.15:0.2,s==='H'?0.34:0.48);symbol.scale.multiplyScalar(s==='H'?0.75:0.85);atom.add(symbol);
        atom.position.copy(targets[i]);group.add(atom);spheres.push(atom);
      });
      if(reaction || !atoms.length) {
        const center=display.indexOf(display.find(s=>s!=='H'&&s!=='O') || 'O');
        for(let i=0;i<targets.length;i++) {
          const c=Math.max(0,center); if(i===c)continue;
          const delta=targets[i].clone().sub(targets[c]);
          const bond=new T.Mesh(new T.CylinderGeometry(0.065,0.065,delta.length(),16),new T.MeshStandardMaterial({color:0xb8b2df,roughness:0.4}));
          bond.position.copy(targets[c]).add(targets[i]).multiplyScalar(0.5); bond.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()); group.add(bond);
        }
      }
      started=performance.now();
    };sceneUpdate.current=update;update();
    const resize=()=>{const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();};
    const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0;
    const render=(time:number)=>{
      frame=requestAnimationFrame(render);if(document.hidden)return;
      const t=time/1000;
      if(robotParts) {
        robotParts.root.position.y=motion.matches?0:Math.sin(t*1.6)*0.07;
        robotParts.root.rotation.y=motion.matches?0:Math.sin(t*0.7)*0.16;
        robotParts.mouth.scale.y=state.current.talking&&!motion.matches?0.8+Math.sin(t*16)*0.35:1;
      } else {
        group.rotation.y=motion.matches?0:Math.sin(t*0.25)*0.35;
        const progress=motion.matches?1:Math.min(1,(time-started)/1100);
        spheres.forEach((sphere,i)=>{sphere.position.copy(targets[i]); if(state.current.reaction) sphere.position.multiplyScalar(1+(1-progress)**3*1.9);});
        group.position.y=motion.matches?0:Math.sin(t)*0.04;
      }
      renderer.render(scene,camera);
    };frame=requestAnimationFrame(render);
    const lost=(event:Event)=>{event.preventDefault();setUnavailable(true);};canvas.addEventListener('webglcontextlost',lost);
    return()=>{cancelAnimationFrame(frame);observer.disconnect();canvas.removeEventListener('webglcontextlost',lost);sceneUpdate.current=undefined;release(scene);renderer.dispose();};
  },[robot]);
  return <div className={`scene-wrap ${className}`}>
    <canvas ref={canvasRef} aria-label={robot?'NOVA, tu robot guía tridimensional':reaction?`Modelo tridimensional de ${reaction.formula}`:'Mesa tridimensional de átomos'} role="img" />
    {unavailable?<div className="scene-fallback">{robot?'NOVA':reaction?.formula||atoms.join(' + ')||'Selecciona tus átomos'}<small>La vista 3D no está disponible en este dispositivo. Puedes seguir experimentando.</small></div>:null}
  </div>;
}
