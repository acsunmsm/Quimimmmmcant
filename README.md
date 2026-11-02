# Atomic Canvas

Laboratorio educativo en español con 18 elementos (períodos 1–3), 15 composiciones, control por pinza, ratón, táctil y teclado, y NOVA como guía local con voz opcional.

## Ejecutar

Requiere Node.js 20.9+ y npm. En PowerShell usa `npm.cmd` si la política de ejecución bloquea `npm.ps1`.

```sh
npm install
npm run dev
```

Abrir http://localhost:9002. `postinstall` copia MediaPipe y descarga su modelo versionado. Para regenerarlos: `npm run prepare:vision`. La cámara requiere localhost o HTTPS; los fotogramas se procesan en un worker local y no se envían a un servidor.

```sh
npm run typecheck
npm run lint
npm test
npm run build
# Con el servidor activo y Microsoft Edge instalado:
npm run test:e2e
```

## Interacción

- Selecciona un elemento y pulsa Añadir a la mesa, o arrástralo. Tab y Enter permiten operar sin arrastrar.
- Activa la cámara de forma explícita. Abre la mano para armar el gesto, apunta con el índice y junta índice/pulgar. Abre para soltar dentro de la mesa.
- La pinza normaliza la distancia con el tamaño de la palma y la relación de aspecto del vídeo. Tiene histéresis temporal, suavizado adaptativo y 450 ms de tolerancia a pérdidas de seguimiento. Una pérdida prolongada cancela, nunca deposita.
- El cursor usa las mismas coordenadas CSS que los botones y la zona de depósito. El vídeo se refleja una sola vez; no se usa el raycasting de tarjetas para seleccionar.
- Reaccionar es una acción explícita: C + O no se consume automáticamente, por lo que puedes añadir otro O y formar CO₂.
- NOVA explica selecciones, ingredientes faltantes, resultados y datos generales. La voz se activa mediante un botón para respetar las restricciones de reproducción del navegador.

## Estructura

- `src/lib/gestures.ts`: máquina de estados de pinza, coordenadas y límites.
- `src/hooks/use-hand-tracking.ts`: permisos, worker, vídeo y ciclo de vida.
- `public/hand-worker.js`: inferencia MediaPipe fuera del hilo de interfaz.
- `src/lib/chemistry.ts`: elementos, datos, proporciones y sugerencias deterministas.
- `src/components/lab/scene-3d.tsx`: mesa, ensamblaje y robot procedural Three.js.
- `src/app/lab/atomic-canvas-client.tsx`: experiencia y controles compartidos por `/` y `/lab`.

## Alcance científico y verificación

La mesa representa composición, no predice reacciones espontáneas, condiciones, energía ni cinética. Las sales y los sólidos de red se identifican como redes, con una unidad de proporción ilustrativa. Las estructuras complejas son esquemáticas. HCl se identifica como cloruro de hidrógeno; en agua forma ácido clorhídrico.

Las pruebas automatizadas cubren gestos con landmarks sintéticos, estequiometría, arrastre, teclado, filtros, permisos y arranque del modelo con vídeo sintético. La precisión en una mano real requiere validación con cámara, iluminación, distancias y usuarios reales.

El flujo Genkit previo sigue separado; no es necesario configurar claves para el laboratorio ni para NOVA.
