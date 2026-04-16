import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import Swal from "sweetalert2";
import routinesService from "/src/assets/js/api/services/routines.js";

// 1. Referencias al DOM y configuración inicial
const videoRef = document.getElementById("webcam");
const canvasRef = document.getElementById("output-canvas");
const canvasCtx = canvasRef.getContext("2d");
const drawingUtils = new DrawingUtils(canvasCtx);

const currentRepsElement = document.getElementById("current-reps"); 
const totalRepsElement = document.getElementById('total-reps');
const repsProgressElement = document.getElementById("reps-progress");
const progressPerElement = document.getElementById("progress-per");
const totalProgressElement = document.getElementById("total-progress");
const routineName = document.getElementById("routine-name");
const exerciseName = document.getElementById('exercise-name');
const exerciseBodyZone = document.getElementById('exercise-body-zone');

// --- NUEVO: Referencia al botón de ejemplo ---
const btnReference = document.getElementById("btn-reference");

// Variables para la lógica dinámica del ejercicio
let currentExerciseIndex = 0;
let isContracting = false;
let repCount = 0;
let maxReps = 0;
let currentAiParams = null;
let routineData = null;

let poseLandmarker;
let runningMode = "VIDEO"; 
let lastVideoTime = -1;

// =====================================================
// PALETA: Titanium Slate
// =====================================================
const PALETTE = {
  primary:             "#3B6090",
  tertiary:            "#2E5484",
  secondary:           "#A4B4BE",
  neutral:             "#0A0F12",
  surfaceBase:         "#C8D6E5",
  surfaceContainerLow: "#EBF1F7",
  textPrimary:         "#0A0F12",
  textSecondary:       "#4A5568",
  textOnAccent:        "#FFFFFF",
};

// Config reutilizable para todos los popups SweetAlert
const SWAL_DEFAULTS = {
  background:          PALETTE.surfaceContainerLow,
  color:               PALETTE.textPrimary,
  iconColor:           PALETTE.primary,
  confirmButtonColor:  PALETTE.primary,
  confirmButtonText:   `<span style="color: ${PALETTE.textOnAccent}; font-weight: bold; font-family: Lexend;">¡Entendido!</span>`,
  customClass:         { popup: "kinetic-popup" },
};

// --- BOTÓN DE REFERENCIA ---
btnReference.addEventListener("click", () => {
  if (!routineData || !routineData.exercises) return;

  const currentExercise = routineData.exercises[currentExerciseIndex];

  if (currentExercise.video_url) {
    Swal.fire({
      ...SWAL_DEFAULTS,
      title: `¿Cómo hacer?: ${currentExercise.name}`,
      confirmButtonText: `<span style="color: ${PALETTE.textOnAccent}; font-weight: bold; font-family: Lexend;">Cerrar</span>`,
      html: `
        <div style="display: flex; justify-content: center; background: ${PALETTE.surfaceBase}; border-radius: 10px; padding: 10px;">
          <video 
            src="${currentExercise.video_url}" 
            style="width: 250px; height: 250px; object-fit: cover; border-radius: 8px;" 
            autoplay loop muted playsinline>
          </video>
        </div>
        <p style="margin-top: 15px; font-size: 0.9em; color: ${PALETTE.textSecondary};">
          ${currentExercise.description || "Mantén una postura firme, controla la respiración y realiza el movimiento completo de manera fluida."}
        </p>
      `,
    });
  } else {
    Swal.fire({
      ...SWAL_DEFAULTS,
      icon:  "info",
      title: "Sin referencia visual",
      text:  "Aún no contamos con un video para este ejercicio.",
      confirmButtonText: `<span style="color: ${PALETTE.textOnAccent}; font-weight: bold; font-family: Lexend;">Cerrar</span>`,
    });
  }
});

// --- INICIALIZACIÓN DE DATOS DE LA API ---
const urlParams = new URLSearchParams(window.location.search);
const routineID = urlParams.get('routine_id');

try {
  routineData = await routinesService.getbyID(routineID);
  routineName.innerHTML = routineData.routine_details.name;
  
  if (routineData && routineData.exercises && routineData.exercises.length > 0) {
    setupCurrentExercise();
  } else {
    console.error("La rutina no tiene ejercicios o no se encontró.");
  }
} catch (error) {
  console.error("Error al obtener la rutina de la API:", error);
}

function setupCurrentExercise() {
  const exercise = routineData.exercises[currentExerciseIndex];
  exerciseName.innerHTML   = exercise.name;
  totalRepsElement.innerHTML = `/ ${exercise.repetitions}`;
  exerciseBodyZone.innerHTML = exercise.body_zone;
  maxReps        = parseInt(exercise.repetitions); 
  currentAiParams = JSON.parse(exercise.ai_parameters);
  repCount       = 0;
  isContracting  = false;
  
  console.log(`[KINETIC] Iniciando: ${exercise.name} | Objetivo: ${maxReps} reps`);
  
  if (currentRepsElement) currentRepsElement.innerText = repCount;
  updateProgressUI(0);

  const zonaCuerpo = exercise.body_zone;
  let alertaTitulo = '';
  let alertaTexto  = '';

  if (zonaCuerpo === 'Tren superior') {
    alertaTitulo = 'Ejercicio de Tren Superior';
    alertaTexto  = 'Ponte de pie y aléjate unos 2 metros de la cámara. Asegúrate de que tu torso completo esté visible en la pantalla.';
  } else if (zonaCuerpo === 'Tren inferior') {
    alertaTitulo = 'Ejercicio de Tren Inferior';
    alertaTexto  = 'Retírate unos 3 metros de la cámara para que tus piernas estén completamente visibles. Asegúrate de tener espacio para moverte sin obstáculos.';
  } else {
    alertaTitulo = 'Ejercicio de zona media';
    alertaTexto  = 'Asegúrate de tener espacio a tu alrededor para mover tu torso.';
  }

  Swal.fire({
    ...SWAL_DEFAULTS,
    title: alertaTitulo,
    text:  alertaTexto,
    icon:  'info',
  });
}

// 2. Cargar el modelo
const createPoseLandmarker = async () => {
  try {
    const vision = await FilesetResolver.forVisionTasks('./wasm');
    
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `./models/pose_landmarker_lite.task`,
        delegate: "GPU" 
      },
      runningMode: runningMode,
      numPoses: 1 
    });
    
    console.log("¡Modelo PoseLandmarker cargado exitosamente!");
    enableWebcam();
  } catch (error) {
    console.error("Error al cargar el modelo:", error);
  }
};

// 3. Encender la cámara
const enableWebcam = () => {
  navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    videoRef.srcObject = stream;
    videoRef.addEventListener('loadeddata', predictWebcam);
  }).catch((err) => {
    console.error("Permiso de cámara denegado o no hay cámara conectada:", err);
  });
};

// 4. Bucle principal
const predictWebcam = async () => {
  canvasRef.width  = videoRef.videoWidth;
  canvasRef.height = videoRef.videoHeight;

  let startTimeMs = performance.now();
  
  if (lastVideoTime !== videoRef.currentTime && poseLandmarker) {
    lastVideoTime = videoRef.currentTime;
    
    poseLandmarker.detectForVideo(videoRef, startTimeMs, (result) => {
      canvasCtx.save(); 
      canvasCtx.translate(canvasRef.width, 0);
      canvasCtx.scale(-1, 1);
      canvasCtx.clearRect(0, 0, canvasRef.width, canvasRef.height);

      if (result.landmarks && result.landmarks.length > 0) {
        const landmarks = result.landmarks[0]; 
        
        // --- LANDMARKS: Paleta Titanium Slate ---
        // Puntos: primary azul acero
        // Conectores: secondary slate como línea de estructura
        drawingUtils.drawLandmarks(landmarks, {
          radius: (data) => DrawingUtils.lerp(data.from.z, -0.15, 0.1, 5, 1),
          color:  PALETTE.primary,        // #3B6090 — puntos articulares
          fillColor: PALETTE.tertiary,    // #2E5484 — relleno interior del punto
        });
        drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
          color:     PALETTE.secondary,   // #A4B4BE — líneas de conexión
          lineWidth: 2
        });

        // --- LÓGICA DINÁMICA ---
        if (currentAiParams) {
          const p1 = landmarks[currentAiParams.key_points[0]];
          const p2 = landmarks[currentAiParams.key_points[1]];
          const p3 = landmarks[currentAiParams.key_points[2]];

          if (p1.visibility > 0.5 && p2.visibility > 0.5 && p3.visibility > 0.5) {
            const currentAngle = calculateAngle(p1, p2, p3);

            if (currentAiParams.logic_state === "descending") {
              if (currentAngle > currentAiParams.threshold_start)    isContracting = false;
              if (currentAngle < currentAiParams.threshold_contract && !isContracting) {
                isContracting = true;
                registerRepetition();
              }
            } else if (currentAiParams.logic_state === "ascending") {
              if (currentAngle < currentAiParams.threshold_start)    isContracting = false;
              if (currentAngle > currentAiParams.threshold_contract && !isContracting) {
                isContracting = true;
                registerRepetition();
              }
            }
          }
        }
      }
      
      canvasCtx.restore(); 
    });
  }

  window.requestAnimationFrame(predictWebcam);
};

createPoseLandmarker();

// --- FUNCIONES DE AYUDA ---

function registerRepetition() {
  if (repCount < maxReps) {
    repCount++;
    console.log(`Repetición: ${repCount}/${maxReps}`);
    
    if (currentRepsElement) currentRepsElement.innerText = repCount;
    updateProgressUI(repCount);

    if (repCount === maxReps) {
      Swal.fire({
        ...SWAL_DEFAULTS,
        title: '¡Serie Completada!',
        text:  `Has terminado tus ${maxReps} repeticiones. ¡Excelente forma!`,
        icon:  'success',
        confirmButtonText: `<span style="color: ${PALETTE.textOnAccent}; font-weight: bold; font-family: Lexend;">Continuar</span>`,
        allowOutsideClick: false,
      }).then((result) => {
        if (result.isConfirmed) {
          currentExerciseIndex++;
          if (currentExerciseIndex < routineData.exercises.length) {
            setupCurrentExercise();
          } else {
            Swal.fire({
              ...SWAL_DEFAULTS,
              title: '¡Rutina Finalizada!',
              text:  '¡Gran trabajo completando tu pausa activa!',
              icon:  'success',
              confirmButtonText: `<span style="color: ${PALETTE.textOnAccent}; font-weight: bold; font-family: Lexend;">Cerrar</span>`,
            }).then(() => {
              console.log("Rutina 100% completada");
            });
          }
        }
      });
    }
  }
}

function calculateAngle(a, b, c) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
}

function updateProgressUI(currentReps) {
  const segments = document.querySelectorAll("#reps-progress .segment");
  segments.forEach((segment, index) => {
    if (index < currentReps) {
      segment.classList.add("filled");
      segment.classList.remove("unfilled");
    } else {
      segment.classList.remove("filled");
      segment.classList.add("unfilled");
    }
  });

  const percentage = maxReps > 0 ? Math.round((currentReps / maxReps) * 100) : 0;
  if (progressPerElement)  progressPerElement.innerText   = `${percentage}%`;
  if (totalProgressElement) totalProgressElement.value    = percentage;
}

document.addEventListener("keydown", (event) => {
  if (event.code === "Space" && currentAiParams) {
    event.preventDefault(); 
    registerRepetition();
  }
});