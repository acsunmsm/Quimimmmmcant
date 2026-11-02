'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Atom, ArrowRight, Camera, CameraOff, Check, ChevronDown, FlaskConical, Hand, HelpCircle, MousePointer2, Plus, RotateCcw, Search, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { bySymbol, elements, funFacts, getHints, matchReaction, placementMessage, reactions, type Reaction } from '@/lib/chemistry';
import { inside, toWorkspace, type Gesture, type Point } from '@/lib/gestures';
import { useHandTracking } from '@/hooks/use-hand-tracking';

const Scene3D = dynamic(() => import('@/components/lab/scene-3d'), { ssr:false, loading:()=> <div className="scene-loading">Preparando vista 3D…</div> });
const groups=[1,2,13,14,15,16,17,18];
const welcome='¡Hola! Soy NOVA, tu compañero de laboratorio. Elige un elemento y llévalo a la mesa. ¿Empezamos construyendo agua?';

type Drag = {symbol:string;source:'hand'|'pointer';start:Point;moved:boolean};
export default function AtomicCanvasClient() {
  const [atoms,setAtoms]=useState<string[]>([]);
  const atomsRef=useRef(atoms); atomsRef.current=atoms;
  const [selected,setSelected]=useState('H');
  const [query,setQuery]=useState('');
  const [family,setFamily]=useState('Todos');
  const [product,setProduct]=useState<Reaction|null>(null);
  const productRef=useRef(product); productRef.current=product;
  const [history,setHistory]=useState<Reaction[]>([]);
  const [message,setMessage]=useState(welcome);
  const [voice,setVoice]=useState(false);
  const [talking,setTalking]=useState(false);
  const [speechSupported,setSpeechSupported]=useState(false);
  const [help,setHelp]=useState(false);
  const [sensitivity,setSensitivity]=useState(0.3);
  const [hover,setHover]=useState<string|null>(null);
  const [dragSymbol,setDragSymbol]=useState<string|null>(null);
  const [overTable,setOverTable]=useState(false);
  const [announcement,setAnnouncement]=useState('');
  const workspaceRef=useRef<HTMLDivElement>(null);
  const dropRef=useRef<HTMLDivElement>(null);
  const cursorRef=useRef<HTMLDivElement>(null);
  const ghostRef=useRef<HTMLDivElement>(null);
  const drag=useRef<Drag|null>(null);
  const suppressClick=useRef(false);
  const lastActivity=useRef(Date.now());
  const helpRef=useRef<HTMLDialogElement>(null);
  const say=(text:string)=>{lastActivity.current=Date.now();setMessage(text);};
  const select=(s:string)=>{setSelected(s);say(`${bySymbol[s].nombre}: ${bySymbol[s].fact}`);};
  const add=(s:string)=>{
    const base=productRef.current?[]:atomsRef.current;
    if(base.length>=12){say('La mesa tiene espacio para 12 átomos. Quita alguno para continuar.');return;}
    const next=[...base,s];atomsRef.current=next;setAtoms(next);setProduct(null);productRef.current=null;
    setSelected(s);say(`${bySymbol[s].nombre} en la mesa. ${placementMessage(next)}`);
    setAnnouncement(`${bySymbol[s].nombre} añadido. ${next.length} átomos en la mesa.`);
  };
  const clear=()=>{atomsRef.current=[];setAtoms([]);setProduct(null);productRef.current=null;say('Mesa lista. Prueba con un sodio y un cloro para explorar la sal.');};
  const remove=(index:number)=>{
    const next=atomsRef.current.filter((_,i)=>i!==index);atomsRef.current=next;setAtoms(next);setProduct(null);productRef.current=null;
    say(next.length?placementMessage(next):'Mesa vacía. Elige un elemento para empezar.');
  };
  const react=()=>{
    const result=matchReaction(atomsRef.current);
    if(!result){say(placementMessage(atomsRef.current));return;}
    setProduct(result);productRef.current=result;setHistory(h=>h.some(r=>r.id===result.id)?h:[result,...h]);
    say(`¡Lo lograste! Construiste ${result.formula}, ${result.name.toLowerCase()}. ${result.kind==='Molécula'?'Observa cómo se organizan sus átomos.':'En realidad forma una red extensa; aquí vemos una unidad de su proporción.'}`);
    setAnnouncement(`Resultado: ${result.name}, ${result.formula}.`);
  };
  const nearest=(point:Point)=>{
    let nearestButton:HTMLButtonElement|null=null,min=Infinity;
    workspaceRef.current?.querySelectorAll<HTMLButtonElement>('[data-element]:not(:disabled)').forEach(button=>{
      const rect=button.getBoundingClientRect();
      if(!inside(point,rect,7))return;
      const d=Math.hypot(point.x-(rect.left+rect.width/2),point.y-(rect.top+rect.height/2));
      if(d<min){min=d;nearestButton=button;}
    });
    return (nearestButton as HTMLButtonElement|null)?.dataset.element||null;
  };
  const move=(point:Point)=>{
    if(ghostRef.current){ghostRef.current.style.left=`${point.x}px`;ghostRef.current.style.top=`${point.y}px`;}
    const rect=dropRef.current?.getBoundingClientRect();setOverTable(Boolean(drag.current&&rect&&inside(point,rect)));
  };
  const cancel=()=>{drag.current=null;setDragSymbol(null);setOverTable(false);};
  const begin=(symbol:string,point:Point,source:'hand'|'pointer')=>{suppressClick.current=false;drag.current={symbol,source,start:point,moved:false};setDragSymbol(symbol);select(symbol);move(point);};
  const drop=(point:Point)=>{
    const item=drag.current;const rect=dropRef.current?.getBoundingClientRect();
    suppressClick.current=Boolean(item?.moved);
    if(item&&rect&&inside(point,rect))add(item.symbol);
    else if(item?.moved)say('Suelta el átomo dentro de la mesa de reacción. También puedes pulsar «Añadir a la mesa».');
    cancel();
  };
  const onGesture=(gesture:Gesture)=>{
    if(helpRef.current?.open){cancel();if(cursorRef.current)cursorRef.current.style.display='none';return;}
    if(drag.current?.source==='pointer')return;
    if(gesture.phase==='lost') {if(cursorRef.current)cursorRef.current.style.display='none';if(drag.current?.source==='hand')cancel();setHover(null);return;}
    if(!gesture.point||!workspaceRef.current)return;
    const bounds=workspaceRef.current.getBoundingClientRect();
    const left=Math.max(0,bounds.left),top=Math.max(0,bounds.top);
    const point=toWorkspace(gesture.point,{left,top,width:Math.min(innerWidth,bounds.right)-left,height:Math.min(innerHeight,bounds.bottom)-top});
    if(gesture.pinching&&drag.current?.source==='hand'){
      if(point.y>innerHeight-55&&bounds.bottom>innerHeight)window.scrollBy(0,8);
      else if(point.y<55&&bounds.top<0)window.scrollBy(0,-8);
    }
    if(cursorRef.current){cursorRef.current.style.display='flex';cursorRef.current.style.left=`${point.x}px`;cursorRef.current.style.top=`${point.y}px`;cursorRef.current.dataset.holding=String(gesture.pinching);}
    const symbol=nearest(point);setHover(symbol);
    if(gesture.phase==='grab'&&symbol)begin(symbol,point,'hand');
    if(drag.current?.source==='hand'){drag.current.moved=true;move(point);if(gesture.phase==='release')drop(point);}
    // A fresh pinch also activates the reaction button; no repeated activation while holding.
    if(gesture.phase==='grab'&&!symbol&&!drag.current) {
      const button=workspaceRef.current.querySelector<HTMLButtonElement>('[data-react]');
      if(button&&!button.disabled&&inside(point,button.getBoundingClientRect(),6))react();
    }
  };
  const camera=useHandTracking(onGesture,sensitivity);
  const actions=useRef({drop,cancel,move});actions.current={drop,cancel,move};
  useEffect(()=>{
    const movePointer=(e:PointerEvent)=>{const d=drag.current;if(d?.source!=='pointer')return;const p={x:e.clientX,y:e.clientY};d.moved ||= Math.hypot(p.x-d.start.x,p.y-d.start.y)>6;actions.current.move(p);};
    const up=(e:PointerEvent)=>{if(drag.current?.source==='pointer')actions.current.drop({x:e.clientX,y:e.clientY});};
    const abort=()=>actions.current.cancel();
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape')abort();};
    window.addEventListener('pointermove',movePointer);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',abort);window.addEventListener('keydown',key);window.addEventListener('blur',abort);
    return()=>{window.removeEventListener('pointermove',movePointer);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',abort);window.removeEventListener('keydown',key);window.removeEventListener('blur',abort);};
  },[]);
  useEffect(()=>{
    setSpeechSupported('speechSynthesis' in window);
    setMessage(`${funFacts[Math.floor(Math.random()*funFacts.length)]} Soy NOVA. Elige un elemento y empecemos.`);
    const timer=setInterval(()=>{if(!document.hidden&&Date.now()-lastActivity.current>45000&&!drag.current){setMessage(funFacts[Math.floor(Math.random()*funFacts.length)]);lastActivity.current=Date.now();}},45000);
    return()=>clearInterval(timer);
  },[]);
  useEffect(()=>{
    if(!voice||!('speechSynthesis' in window))return;
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(message);utterance.lang='es-PE';utterance.rate=1;
    utterance.onstart=()=>setTalking(true);utterance.onend=utterance.onerror=()=>setTalking(false);
    window.speechSynthesis.speak(utterance);
    return()=>{window.speechSynthesis.cancel();setTalking(false);};
  },[message,voice]);
  useEffect(()=>{if(help)helpRef.current?.showModal();else helpRef.current?.close();},[help]);
  const element=bySymbol[selected];
  const match=matchReaction(atoms);const hints=getHints(atoms).filter(h=>h.missing.length).slice(0,2);
  const filtered=(s:string)=>{const e=bySymbol[s];return (family==='Todos'||e.family===family)&&`${e.nombre} ${e.simbolo} ${e.numeroAtomico}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());};
  return <div className="lab-shell">
    <a className="skip-link" href="#laboratorio">Saltar al laboratorio</a>
    <header className="app-header"><Link href="/" className="brand"><Atom size={29}/><span>atomic<span className="brand-light">canvas</span></span></Link><span className="header-context">Tu laboratorio de química</span><button className="button quiet" onClick={()=>setHelp(true)}><HelpCircle size={17}/><span>Cómo funciona</span></button></header>
    <main id="laboratorio" className="lab-main">
      <div className="intro"><div><h1>La química, en tus manos.</h1><p>Elige átomos. Explora sus enlaces. Descubre lo que puedes crear.</p></div><div className="mode-badge"><span className={`status-dot ${camera.status==='ready'?'active':''}`}/>{camera.status==='ready'?'Control con las manos':'Modo libre'}<span className="mode-detail">{camera.status==='ready'?'Cámara activa':'Ratón, táctil o teclado'}</span></div></div>
      <div ref={workspaceRef} className="workspace">
        <div className="element-column">
          <section className="periodic-panel" aria-labelledby="periodic-title">
            <div className="panel-title"><div><h2 id="periodic-title">Tabla periódica</h2><p>Primeros tres períodos · 18 elementos</p></div><span className="subtle-icon"><Atom size={24}/></span></div>
            <div className="element-filters"><label className="search"><Search size={17}/><input aria-label="Buscar elemento" placeholder="Busca un elemento…" value={query} onChange={e=>setQuery(e.target.value)}/>{query?<button aria-label="Borrar búsqueda" onClick={()=>setQuery('')}><X size={15}/></button>:null}</label><label className="family-select"><select aria-label="Filtrar por familia" value={family} onChange={e=>setFamily(e.target.value)}>{['Todos','No metal','Metal','Metaloide','Halógeno','Gas noble'].map(x=><option key={x}>{x}</option>)}</select><ChevronDown size={14}/></label></div>
            <div className="periodic-grid" role="group" aria-label="Elementos organizados por grupo y período">
              {groups.map((g,i)=><span className="group-number" key={g} style={{gridColumn:i+1,gridRow:1}} title={`Grupo ${g}`}>{g}</span>)}
              <div className="table-explainer"><span>Pequeñas piezas.</span><strong>Infinitas preguntas.</strong></div>
              {elements.map(e=><button key={e.simbolo} data-element={e.simbolo} data-family={e.family} disabled={!filtered(e.simbolo)} aria-label={`${e.nombre} (${e.simbolo}), número atómico ${e.numeroAtomico}`} aria-pressed={selected===e.simbolo} className={`element-tile ${selected===e.simbolo?'selected':''} ${hover===e.simbolo?'hand-hover':''}`} style={{gridColumn:groups.indexOf(e.group)+1,gridRow:e.period+1}} onPointerDown={event=>{if(event.button!==0)return;event.currentTarget.setPointerCapture(event.pointerId);begin(e.simbolo,{x:event.clientX,y:event.clientY},'pointer');}} onClick={()=>{if(!suppressClick.current)select(e.simbolo);suppressClick.current=false;}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select(e.simbolo);}}}><span className="atomic-number">{e.numeroAtomico}</span><strong>{e.simbolo}</strong><span className="element-name">{e.nombre}</span></button>)}
            </div>
            {!elements.some(e=>filtered(e.simbolo))?<p role="status" className="no-results">No hay elementos con ese filtro. Prueba otro nombre.</p>:null}
            <div className="table-caption"><Hand size={15}/><span>Haz pinza para agarrar, abre los dedos para soltar.</span></div>
            <div className="element-detail"><div className="detail-symbol">{element.simbolo}<small>{element.numeroAtomico}</small></div><div className="detail-copy"><h3>{element.nombre}</h3><span>{element.family} · Grupo {element.group}</span><p>{element.protones} {element.protones===1?'protón':'protones'} <span> / </span> {element.electrones} {element.electrones===1?'electrón':'electrones'}</p></div><button className="button secondary add-button" onClick={()=>add(selected)}><Plus size={16}/><span>Añadir a la mesa</span></button></div>
          </section>
          <section className="guide-panel" aria-label="NOVA, guía de química"><div className="robot-portrait"><Scene3D robot talking={talking}/></div><div className="guide-body"><div className="guide-heading"><h2>NOVA <span>Tu compañero de laboratorio</span></h2><button className="icon-button" aria-label={voice?'Silenciar a NOVA':'Activar voz de NOVA'} disabled={!speechSupported} aria-pressed={voice} onClick={()=>setVoice(v=>!v)}>{voice?<Volume2 size={18}/>:<VolumeX size={18}/>}</button></div><p aria-live="polite">{message}</p><button className="text-button" onClick={()=>say(funFacts[(funFacts.indexOf(message)+1+Math.floor(Math.random()*(funFacts.length-1)))%funFacts.length])}><Sparkles size={14}/> Cuéntame algo más</button></div></section>
        </div>
        <div className="reaction-column">
          <section className={`reaction-panel ${overTable?'drop-active':''}`} aria-labelledby="reaction-title">
            <div className="panel-title"><div><h2 id="reaction-title">Mesa de reacción</h2><p>{product?'Un nuevo descubrimiento':atoms.length?`${atoms.length} ${atoms.length===1?'átomo listo':'átomos listos'} para explorar`:'Tu próximo descubrimiento empieza aquí'}</p></div><button className="icon-button" aria-label="Limpiar mesa" title="Limpiar mesa" disabled={!atoms.length} onClick={clear}><RotateCcw size={18}/></button></div>
            <div className="reaction-stage" ref={dropRef} data-testid="drop-zone"><Scene3D atoms={atoms} reaction={product}/>{overTable?<div className="drop-prompt"><Plus size={20}/> Suelta aquí tu átomo</div>:null}{!atoms.length?<div className="stage-caption"><span>¿Qué vamos a descubrir?</span><p>Trae un átomo a la mesa para empezar.</p></div>:null}{product?<div className="product-caption"><span><Check size={14}/> {product.kind}</span><strong>{product.formula}</strong><p>{product.name}</p></div>:null}</div>
            <div className="bench-controls"><div className="atom-tray" aria-label="Átomos en la mesa">{!atoms.length?<span className="tray-empty">Tus átomos aparecerán aquí</span>:atoms.map((s,i)=><button className="atom-chip" key={`${s}-${i}`} aria-label={`Quitar ${bySymbol[s].nombre} ${i+1}`} onClick={()=>remove(i)}>{s}<X size={12}/></button>)}</div><button data-react className="button primary react-button" disabled={!match||!!product} onClick={react}>{product?<Check size={17}/>:<FlaskConical size={17}/>} {product?'Creado':'Reaccionar'}</button></div>
            <div className="reaction-hints">{product?<p>Modelo educativo de composición. La formación real depende de condiciones y energía; las formas complejas son esquemáticas.</p>:atoms.length===0?<p><MousePointer2 size={14}/> También puedes seleccionar un elemento y pulsar «Añadir a la mesa».</p>:match?<p className="ready-hint"><Check size={15}/> Proporción lista para {match.formula}. Puedes reaccionar o seguir añadiendo.</p>:hints.length?hints.map(h=><p key={h.id}><span>{h.formula}</span> Añade {h.missing.map(a=>`${a.cantidad} ${a.simbolo}`).join(' + ')}</p>):<p>Combinación no incluida. Retira un átomo o limpia la mesa.</p>}</div>
          </section>
          <section className="camera-panel" aria-labelledby="camera-title"><div className={`camera-preview ${camera.status==='ready'?'live':''}`}><video ref={camera.videoRef} playsInline muted autoPlay/><canvas ref={camera.overlayRef}/>{camera.status!=='ready'?<div className="camera-placeholder"><Hand size={29}/><span>{camera.status==='loading'?'Preparando…':'Usa tus manos'}</span></div>:null}</div><div className="camera-copy"><h2 id="camera-title">{camera.status==='ready'?(camera.detected?(camera.holding?'Átomo sujeto':'Mano detectada'):'Muestra una mano'):'Un laboratorio sin tocar la pantalla'}</h2><p>{camera.status==='ready'?'Apunta con el índice. Junta índice y pulgar para agarrar.':'Activa tu cámara y mueve los átomos con una pinza.'}</p><button className={`button ${camera.status==='ready'?'secondary':'quiet'}`} onClick={()=>camera.status==='ready'||camera.status==='loading'?camera.stop():camera.start()}>{camera.status==='ready'||camera.status==='loading'?<CameraOff size={16}/>:<Camera size={16}/>} {camera.status==='loading'?'Cancelar':camera.status==='ready'?'Desactivar cámara':camera.status==='error'?'Reintentar':'Activar cámara'}</button></div>{camera.error?<p role="alert" className="camera-error">{camera.error}</p>:null}<details className="camera-settings"><summary>Ajustes y consejos de detección</summary><p>Ilumina tu mano de frente, mantenla completa en la imagen y abre los dedos antes de la primera pinza. Usa una mano a la vez.</p><label>Facilidad de agarre <input type="range" min="0.2" max="0.45" step="0.01" value={sensitivity} onChange={e=>setSensitivity(Number(e.target.value))}/></label><small>La imagen se procesa en tu dispositivo. La cámara se apaga al cambiar de pestaña.</small></details></section>
        </div>
      </div>
      <section className="discoveries"><div><h2>Tus descubrimientos</h2><p>{history.length?`${history.length} de ${reactions.length} combinaciones exploradas en esta sesión`:'Cada experimento es una nueva pregunta.'}</p></div><div className="discovery-items">{history.length?history.map(r=><span key={r.id} title={r.name}>{r.formula}<Check size={12}/></span>):<span className="discovery-empty">Empieza con 2 H + 1 O <ArrowRight size={14}/> H₂O</span>}</div></section>
    </main>
    <footer className="lab-footer"><span>Atomic Canvas</span><span>Explora con curiosidad. Aprende experimentando.</span><span>Simulación educativa</span></footer>
    <div className="hand-cursor" ref={cursorRef} aria-hidden="true"><span/></div>
    <div ref={ghostRef} className={`drag-atom ${dragSymbol?'visible':''}`} aria-hidden="true">{dragSymbol}</div>
    <div className="sr-only" role="status">{announcement}</div>
    <dialog ref={helpRef} className="help-dialog" onCancel={()=>setHelp(false)} onClick={e=>{if(e.target===e.currentTarget)setHelp(false);}}><div className="dialog-heading"><h2>Tu primer experimento</h2><button className="icon-button" aria-label="Cerrar ayuda" onClick={()=>setHelp(false)}><X size={20}/></button></div><ol><li><strong>Elige un elemento.</strong> Selecciónalo en la tabla para conocerlo. Con teclado, usa Tab y Enter.</li><li><strong>Llévalo a la mesa.</strong> Arrástralo o pulsa «Añadir a la mesa». Con la cámara activa, abre la mano, apunta con el índice y haz pinza.</li><li><strong>Completa la proporción.</strong> Prueba dos H y un O. NOVA te dirá qué falta.</li><li><strong>Reacciona.</strong> Pulsa «Reaccionar» para ver la estructura 3D. Con las manos, haz una nueva pinza sobre ese botón.</li></ol><p>Si pierdes el seguimiento, el agarre se conserva brevemente. Si la mano desaparece más tiempo, se cancela sin añadir átomos por accidente.</p><button className="button primary" onClick={()=>setHelp(false)}>Vamos al laboratorio</button></dialog>
  </div>;
}




