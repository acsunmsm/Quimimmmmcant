import test from 'node:test';
import assert from 'node:assert/strict';
import { PinchTracker, inside, toWorkspace, type Point } from '../src/lib/gestures';
import { elements, reactions, matchReaction, getHints } from '../src/lib/chemistry';
function hand(ratio:number,scale=1):Point[] {
  const p=Array.from({length:21},()=>({x:0.5,y:0.5}));
  p[0]={x:0.5,y:0.7};p[9]={x:0.5,y:0.5};p[5]={x:0.45,y:0.52};p[17]={x:0.55,y:0.52};
  p[8]={x:0.5,y:0.3};p[4]={x:0.5+ratio*0.2/(4/3),y:0.3};
  return p.map(p=>({x:0.5+(p.x-0.5)*scale,y:0.5+(p.y-0.5)*scale}));
}
test('requires open hand before first grab; confirms a pinch by elapsed time',()=>{
  const t=new PinchTracker();assert.equal(t.update(hand(.1),0).phase,'move');assert.equal(t.update(hand(.1),100).pinching,false);
  t.update(hand(.8),120);t.update(hand(.2),150);assert.equal(t.update(hand(.2),220).phase,'grab');assert.equal(t.update(hand(.2),250).phase,'move');
});
test('hysteresis and brief occlusion do not drop atoms; prolonged loss cancels',()=>{
  const t=new PinchTracker();t.update(hand(.8),0);t.update(hand(.2),20);t.update(hand(.2),100);
  assert.equal(t.update(hand(.4),140).pinching,true);assert.equal(t.update(undefined,300).pinching,true);
  assert.equal(t.update(hand(.2),350).pinching,true);assert.equal(t.update(undefined,850).phase,'lost');
  assert.equal(t.update(hand(.1),900).pinching,false);
});
test('release requires sustained opening, independent of frame rate',()=>{
  const t=new PinchTracker();t.update(hand(.8),0);t.update(hand(.2),30);t.update(hand(.2),100);t.update(hand(.8),130);
  assert.equal(t.update(hand(.8),210).pinching,true);assert.equal(t.update(hand(.8),240).phase,'release');
});
test('pinch is invariant to camera distance',()=>{
  for(const scale of [.4,1,1.5]){const t=new PinchTracker();t.update(hand(.8,scale),0);t.update(hand(.2,scale),10);assert.equal(t.update(hand(.2,scale),90).phase,'grab');}
});
test('invalid landmarks cancel safely; mapped cursor respects bounds',()=>{
  const t=new PinchTracker();assert.equal(t.update([{x:NaN,y:0}],10).phase,'lost');
  assert.deepEqual(toWorkspace({x:-1,y:2},{left:10,top:20,width:100,height:200}),{x:10,y:220});
  assert.equal(inside({x:0,y:0},{left:10,right:20,top:10,bottom:20}),false);
});
test('18 unique elements preserve periodic groups and periods',()=>{
  assert.equal(elements.length,18);assert.equal(new Set(elements.map(e=>`${e.group},${e.period}`)).size,18);
  assert.deepEqual(elements.map(e=>e.numeroAtomico),Array.from({length:18},(_,i)=>i+1));
});
test('all 15 rules match exact counts in any order; extra atoms reject',()=>{
  assert.equal(reactions.length,15);
  for(const r of reactions){const atoms=r.reactivos.flatMap(a=>Array(a.cantidad).fill(a.simbolo));assert.equal(matchReaction(atoms.reverse())?.id,r.id);assert.notEqual(matchReaction([...atoms,'He'])?.id,r.id);}
});
test('CO can still become CO2; hints are derived without consuming atoms',()=>{
  const atoms=['C','O'];assert.equal(matchReaction(atoms)?.formula,'CO');assert.ok(getHints(atoms).some(h=>h.formula==='CO₂'&&h.missing[0].cantidad===1));assert.deepEqual(atoms,['C','O']);assert.equal(matchReaction([...atoms,'O'])?.formula,'CO₂');
});
test('unsupported mixtures and noble gases do not invent reactions',()=>{
  assert.equal(matchReaction(['He','H']),undefined);assert.equal(getHints(['He']).length,0);assert.equal(getHints([]).length,0);assert.equal(matchReaction([]),undefined);
});
