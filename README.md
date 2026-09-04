# VHealth (Kinetic)

**VHealth** es el frontend web de un sistema de "pausas activas" que usa visión artificial para reconocer, en tiempo real y desde la cámara del usuario, si un ejercicio se está ejecutando correctamente y cuántas repeticiones lleva. Está pensado para promover el cuidado de la salud en entornos laborales.

> Este repositorio contiene **solo el frontend** (Vite + JS vanilla). Consume una API REST externa (referida en el código como `VHealth_API`) que no forma parte de este repo.

## Tabla de contenido

- [Arquitectura general](#arquitectura-general)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Partes más importantes](#partes-más-importantes)
  - [Páginas (multi-page app)](#páginas-multi-page-app)
  - [Capa de API (`src/assets/js/api`)](#capa-de-api-srcassetsjsapi)
  - [Reconocimiento de poses (`live-session.js`)](#reconocimiento-de-poses-live-sessionjs)
  - [Sidebar dinámico](#sidebar-dinámico)
  - [Configuración de Vite](#configuración-de-vite)
- [Variables de entorno](#variables-de-entorno)
- [Cómo ejecutarlo](#cómo-ejecutarlo)
- [Build de producción](#build-de-producción)
- [Estado del proyecto / limitaciones conocidas](#estado-del-proyecto--limitaciones-conocidas)

## Arquitectura general

El proyecto es una **Multi-Page Application (MPA)** construida con [Vite](https://vitejs.dev/), sin framework de UI (JS vanilla + módulos ES). No hay build de un SPA con router; cada vista es un archivo `.html` independiente que Vite empaqueta por separado.

```
┌─────────────────┐      fetch (VITE_API_URL)      ┌───────────────────┐
│  Frontend (este  │ ───────────────────────────── ▶│  VHealth_API       │
│  repositorio)     │ ◀───────────────────────────── │ (backend externo,  │
│  Vite + JS vanilla│         JSON REST              │  no incluido aquí) │
└─────────────────┘                                 └───────────────────┘
        │
        │ usa
        ▼
┌───────────────────────────┐
│ @mediapipe/tasks-vision   │  → PoseLandmarker (WASM + modelo .task)
│ corre 100% en el navegador│    para detectar landmarks corporales
│ (cámara del usuario)      │    desde la webcam, sin enviar video al backend
└───────────────────────────┘
```

Ideas clave de la arquitectura:

- **Todo el reconocimiento de pose ocurre en el cliente** (navegador), usando MediaPipe Tasks Vision compilado a WebAssembly (`public/wasm`) más un modelo ligero (`public/models/pose_landmarker_lite.task`). El video de la webcam nunca sale del navegador.
- **La lógica de negocio (rutinas, ejercicios, usuarios)** vive en la API externa; el frontend solo la consume vía `fetch` a través de una capa de servicios (`src/assets/js/api`).
- **Vite gestiona tres entradas HTML** (`index.html`, `routines.html`, `live-session.html`), cada una con su propio CSS y sus propios módulos JS.

## Estructura del repositorio

```
kinetic/
├── index.html              # Landing page (marketing / "Acerca de")
├── routines.html           # Listado de rutinas del usuario
├── live-session.html       # Vista de sesión en vivo con webcam + IA
├── vite.config.js          # Configuración de Vite (build, aliases, proxy)
├── package.json
├── .env.development        # Variables de entorno para "npm run dev"
├── .env.production         # Variables de entorno para "npm run build"
├── public/                 # Archivos estáticos servidos tal cual
│   ├── fonts/               # Fuente Lexend
│   ├── icons/                # Iconos SVG sueltos
│   ├── models/                # Modelo pose_landmarker_lite.task (MediaPipe)
│   ├── videos/                 # Videos de referencia por ejercicio + video del landing
│   └── wasm/                   # Runtime WASM de MediaPipe Tasks Vision
└── src/
    ├── main.js              # Entry point compartido (imports globales)
    ├── style.css            # Estilos base compartidos
    └── assets/
        ├── css/              # Un CSS por vista (index, routines, live-session)
        └── js/
            ├── sidebar.js     # Menú lateral dinámico (routines / live-session)
            ├── modules/        # Lógica específica de cada vista
            │   ├── routines.js       # Pinta el listado de rutinas
            │   └── live-session.js   # Núcleo de IA + lógica de repeticiones
            └── api/            # Capa de acceso a la API REST
                ├── apiClient.js       # Cliente HTTP genérico (fetch wrapper)
                └── services/
                    ├── routines.js     # Endpoints de rutinas
                    └── exercises.js    # (placeholder, aún vacío)
```

## Partes más importantes

### Páginas (multi-page app)

| Archivo | Propósito | Scripts que carga |
|---|---|---|
| `index.html` | Landing pública de marketing (hero, funciones, flujo de trabajo, CTA). | `src/main.js` + un script inline para resaltar el link del menú activo según la sección visible (`IntersectionObserver`). |
| `routines.html` | Panel con sidebar; lista las rutinas del usuario y permite lanzar una sesión en vivo. | `src/main.js`, `modules/routines.js`, `sidebar.js`. |
| `live-session.html` | Vista de entrenamiento: video de la webcam + canvas superpuesto con el esqueleto detectado, contador de repeticiones y progreso. | `src/main.js`, `modules/live-session.js`, `sidebar.js`, además del script externo `lottie-player` (animaciones). |

### Capa de API (`src/assets/js/api`)

- **`apiClient.js`**: cliente HTTP genérico sobre `fetch`. Centraliza `baseURL` (leída de `VITE_API_URL`), headers JSON, manejo de token Bearer (`setAuthToken`) y parseo/errores de respuesta. Expone métodos `get`, `post`, `put`, `patch`, `delete`. Ante un error de red o de parseo dispara un `CustomEvent('api:error')` en el `document`, para que otras partes de la app puedan reaccionar sin acoplarse directamente al cliente.
- **`services/routines.js`**: capa de dominio sobre `apiClient` con dos métodos: `get()` (lista de rutinas) y `getbyID(id)` (detalle de una rutina con sus ejercicios).
- **`services/exercises.js`**: actualmente vacío — es el lugar previsto para los endpoints de ejercicios (subida/consulta), pendiente de implementar.

### Reconocimiento de poses (`live-session.js`)

Es el módulo más importante del proyecto. Flujo resumido:

1. Al entrar a la vista, muestra un modal de carga (SweetAlert2) y en paralelo:
   - pide a la API los datos de la rutina (`routinesService.getbyID(routineID)`, tomando `routine_id` de la query string), y
   - inicializa `PoseLandmarker` de `@mediapipe/tasks-vision` (`FilesetResolver.forVisionTasks('./wasm')` + modelo `./models/pose_landmarker_lite.task`, con `delegate: "GPU"`).
2. Pide permiso de cámara (`getUserMedia`) y, cuando el primer frame está listo, arranca el bucle `predictWebcam` con `requestAnimationFrame`.
3. En cada frame: detecta landmarks corporales, los dibuja sobre un `<canvas>` (espejado horizontalmente) usando los colores definidos como variables CSS (`--color-primary`, `--color-secondary`, `--color-tertiary`).
4. **Lógica de conteo de repeticiones**: cada ejercicio trae desde la API un campo `ai_parameters` (JSON) con:
   - `key_points`: los 3 índices de landmarks que forman el ángulo a medir (ej. cadera-rodilla-tobillo),
   - `logic_state`: `"descending"` o `"ascending"` (según si el ángulo debe bajar o subir para contar la repetición),
   - `threshold_start` / `threshold_contract`: los umbrales de ángulo que delimitan el inicio y la contracción del movimiento.
   
   Con esos parámetros calcula el ángulo entre los 3 puntos (`calculateAngle`, ley del coseno vía `atan2`) y decide cuándo se completó una repetición, evitando dobles conteos con la bandera `isContracting`.
5. Actualiza la UI (repeticiones, barra de progreso segmentada, progreso total) y muestra modales (SweetAlert2) al iniciar cada ejercicio, al completar una serie y al terminar la rutina.
6. El botón "Ver Ejemplo" abre un modal con el video de referencia del ejercicio (`exercise.video_url`).

### Sidebar dinámico

`sidebar.js` no depende de la API: define un arreglo estático de secciones (Rutinas y ejercicios, Creador de rutinas, Nuevo ejercicio — estas dos últimas marcadas como `disabled: true`, es decir, aún no implementadas) y renderiza el `<ul id="links">` en runtime, resaltando la sección activa según `window.location.pathname`.

### Configuración de Vite

`vite.config.js` define:

- **Tres entradas de build**: `index.html`, `routines.html`, `live-session.html` (cada una genera su propio bundle).
- **Aliases** (`@`, `@assets`, `@css`, `@js`, `@api`, `@services`, `@modules`) apuntando a `src/...` — nota: en el código actual las importaciones usan rutas absolutas (`/src/assets/js/...`) en vez de estos aliases.
- **`assetsInclude: ["**/*.wasm", "**/*.task"]`** y exclusión de `@mediapipe/tasks-vision` del pre-bundling, necesario para que Vite maneje correctamente los binarios de MediaPipe.
- **Code-splitting manual**: separa `node_modules` en un chunk `vendor` y prevé chunks separados para la capa de API (`api-client`, `api-modules`, `api-services`).
- **Proxy de desarrollo**: las peticiones a `/api` se redirigen a `VITE_API_URL` (por defecto `http://localhost:3000`).
- **Headers COOP/COEP** en el modo `preview`, requeridos por SharedArrayBuffer/WASM multihilo.

## Variables de entorno

El proyecto usa dos archivos de entorno ya versionados (ajústalos según tu backend):

**`.env.development`** (usado con `npm run dev`):
```env
VITE_API_URL=http://localhost/VHealth_API/api/public
VITE_BASE_URL=/
```

**`.env.production`** (usado con `npm run build`):
```env
VITE_API_URL=https://lumacad.com.mx/vhealth/api/public
VITE_BASE_URL=/vhealth/web/
```

- `VITE_API_URL`: URL base de la API REST (`VHealth_API`) que consume `apiClient.js`.
- `VITE_BASE_URL`: base path del sitio (útil si se despliega en un subdirectorio, como en producción `/vhealth/web/`).

## Cómo ejecutarlo

### Requisitos

- Node.js (versión compatible con Vite 8; se recomienda Node 18+).
- Una cámara web (para probar `live-session.html`).
- Opcionalmente, una instancia corriendo de la API `VHealth_API` — sin ella, las vistas que dependen de datos (rutinas, sesión en vivo) mostrarán listas vacías o errores controlados en consola.

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/Sam220903/kinetic.git
cd kinetic

# 2. Instalar dependencias
npm install

# 3. Ajustar .env.development con la URL de tu API local
#    (por defecto apunta a http://localhost/VHealth_API/api/public,
#     típico de un entorno LAMP/XAMPP)

# 4. Levantar el servidor de desarrollo
npm run dev
```

Esto abrirá el servidor de Vite en `http://localhost:5173` (se abre automáticamente por `open: true`). Desde ahí puedes navegar a:

- `/` → landing (`index.html`)
- `/routines.html` → listado de rutinas
- `/live-session.html?routine_id=<id>` → sesión en vivo (requiere `routine_id` válido devuelto por la API y permiso de cámara)

## Build de producción

```bash
npm run build     # genera la carpeta dist/ usando .env.production
npm run preview   # sirve el build de dist/ localmente (puerto 4173)
```

El build usa `VITE_BASE_URL=/vhealth/web/`, así que si despliegas en otra ruta o dominio deberás actualizar esa variable antes de compilar.

## Estado del proyecto / limitaciones conocidas

Por transparencia, así se ve el repo en su estado actual (revisado en el commit más reciente de `main`):

- **`services/exercises.js` está vacío**: la subida/consulta de ejercicios ("Suba sus ejercicios" en el landing) aún no tiene lógica de API implementada.
- **"Creador de rutinas" y "Nuevo ejercicio" están deshabilitados** en el sidebar (`disabled: true` en `sidebar.js`) — solo "Rutinas y ejercicios" es navegable hoy.
- Los aliases definidos en `vite.config.js` (`@`, `@api`, etc.) no se usan todavía en el código; los imports actuales son rutas absolutas (`/src/assets/js/...`).
- No hay pantalla de login funcional (el botón "Login" del landing no tiene handler); tampoco hay manejo visible de sesión/token más allá del método `setAuthToken` disponible en `apiClient.js`.
- No se incluye backend en este repositorio: para probar el flujo completo (rutinas reales, ejercicios con `ai_parameters`, videos de referencia) necesitas levantar por separado la API `VHealth_API`.