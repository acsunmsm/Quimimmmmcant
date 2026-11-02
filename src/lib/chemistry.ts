import data from './elementos.json';
import rules from './reglas.json';

const details: Record<string, [number, number, string, string]> = {
  H: [1, 1, 'No metal', 'El hidrógeno es el elemento más abundante del universo.'],
  He: [18, 1, 'Gas noble', 'El helio se descubrió primero en la luz del Sol.'],
  Li: [1, 2, 'Metal', 'El litio es el metal más ligero y se usa en baterías recargables.'],
  Be: [2, 2, 'Metal', 'El berilio aporta rigidez a aleaciones muy ligeras.'],
  B: [13, 2, 'Metaloide', 'El boro ayuda a que el vidrio de laboratorio resista los cambios de temperatura.'],
  C: [14, 2, 'No metal', 'El diamante y el grafito están hechos de carbono; cambia cómo se ordenan sus átomos.'],
  N: [15, 2, 'No metal', 'Cerca del 78 % del aire seco es nitrógeno.'],
  O: [16, 2, 'No metal', 'El oxígeno forma parte del agua y participa en la respiración celular.'],
  F: [17, 2, 'Halógeno', 'El flúor es el elemento más electronegativo.'],
  Ne: [18, 2, 'Gas noble', 'El neón emite luz rojiza al recibir una descarga eléctrica.'],
  Na: [1, 3, 'Metal', 'El sodio y el cloro forman la red iónica de la sal de mesa.'],
  Mg: [2, 3, 'Metal', 'El magnesio está en el centro de la molécula de clorofila.'],
  Al: [13, 3, 'Metal', 'El aluminio se protege de la corrosión con una fina capa de óxido.'],
  Si: [14, 3, 'Metaloide', 'El silicio es un semiconductor usado en los chips electrónicos.'],
  P: [15, 3, 'No metal', 'El fósforo forma parte del ADN y de las moléculas que transportan energía en las células.'],
  S: [16, 3, 'No metal', 'El azufre forma parte de algunos aminoácidos de tus proteínas.'],
  Cl: [17, 3, 'Halógeno', 'Los iones cloruro ayudan a mantener el equilibrio de líquidos en tu cuerpo.'],
  Ar: [18, 3, 'Gas noble', 'El argón se usa para crear atmósferas protectoras al soldar.'],
};
const extra = [
  {numeroAtomico:10,simbolo:'Ne',nombre:'Neón',protones:10,neutrones:10,electrones:10,color:'0x6fedee'},
  {numeroAtomico:18,simbolo:'Ar',nombre:'Argón',protones:18,neutrones:22,electrones:18,color:'0x6fedee'},
];
export const elements = [...data.elementos, ...extra.filter(el => !data.elementos.some(e => e.simbolo === el.simbolo))]
  .sort((a,b) => a.numeroAtomico - b.numeroAtomico).map(el => {
    const [group, period, family, fact] = details[el.simbolo];
    return {...el, group, period, family, fact};
  });
export type Element = typeof elements[number];
export const bySymbol = Object.fromEntries(elements.map(el => [el.simbolo, el])) as Record<string, Element>;
const formulas = ['H₂O','CO₂','CO','CH₄','NH₃','HCl','NaCl','Na₂O','MgO','Al₂O₃','SiO₂','H₃PO₄','H₂SO₄','HF','SO₃'];
const ionic = new Set(['regla_cloruro_sodio','regla_oxido_sodio','regla_oxido_magnesio','regla_oxido_aluminio']);
export const reactions = rules.reglas.map((r,i) => ({...r, formula: formulas[i], name: r.id === 'regla_acido_clorhidrico' ? 'Cloruro de hidrógeno' : r.producto.split(' (')[0], kind: ionic.has(r.id) ? 'Red iónica' : r.id === 'regla_dioxido_silicio' ? 'Red covalente' : 'Molécula'}));
export type Reaction = typeof reactions[number];
export const countAtoms = (atoms: string[]) => atoms.reduce<Record<string,number>>((counts,s) => ({...counts, [s]: (counts[s] || 0) + 1}), {});
export function matchReaction(atoms: string[]) {
  const counts = countAtoms(atoms);
  return reactions.find(r => Object.keys(counts).length === r.reactivos.length && r.reactivos.every(a => counts[a.simbolo] === a.cantidad));
}
export function getHints(atoms: string[]) {
  if (!atoms.length) return [];
  const counts = countAtoms(atoms);
  return reactions.filter(r => Object.entries(counts).every(([s,n]) => (r.reactivos.find(a => a.simbolo === s)?.cantidad || 0) >= n))
    .map(r => ({...r, missing: r.reactivos.map(a => ({...a, cantidad: a.cantidad - (counts[a.simbolo] || 0)})).filter(a => a.cantidad > 0)}))
    .sort((a,b) => a.missing.reduce((n,x)=>n+x.cantidad,0)-b.missing.reduce((n,x)=>n+x.cantidad,0));
}
export function placementMessage(atoms: string[]) {
  const match = matchReaction(atoms);
  if (match) return `¡Tienes la proporción de ${match.formula}! Pulsa «Reaccionar» para ver ${match.name.toLowerCase()} en 3D. También puedes seguir añadiendo átomos.`;
  const hint = getHints(atoms)[0];
  return hint ? `Para construir ${hint.formula}, añade ${hint.missing.map(a=>`${a.cantidad} de ${bySymbol[a.simbolo].nombre.toLowerCase()}`).join(' y ')}. ¡Vamos a probar!` : 'Esta combinación aún no está en mi biblioteca. Quita un átomo o limpia la mesa para probar otra proporción.';
}
export const funFacts = [
  'Los átomos se conservan en las reacciones químicas: se reorganizan sus enlaces.',
  'Una molécula de agua tiene dos átomos de hidrógeno y uno de oxígeno. ¿La construimos?',
  'Los gases nobles tienen una capa externa completa y suelen ser poco reactivos.',
  'Una fórmula cuenta átomos: el 2 de H₂O indica dos hidrógenos por cada oxígeno.',
  'El carbono puede formar cuatro enlaces covalentes. Es la base de muchísimas moléculas de la vida.',
];
