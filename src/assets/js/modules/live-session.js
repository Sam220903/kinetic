import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import Swal from "sweetalert2";
import routinesService from "../api/services/routines.js";

// 1. Referencias al DOM y configuración inicial
const videoRef = document.getElementById("webcam");
const canvasRef = document.getElementById("output-canvas");
const canvasCtx = canvasRef.getContext("2d");
const drawingUtils = new DrawingUtils(canvasCtx);

const currentRepsElement = document.getElementById("current-reps"); 
const repsProgressElement = document.getElementById("reps-progress");
const progressPerElement = document.getElementById("progress-per");
const totalProgressElement = document.getElementById("total-progress");
const routineName = document.getElementById("routine-name");
const exerciseName = document.getElementById('exercise-name');

// Variables para la lógica dinámica del ejercicio
let currentExerciseIndex = 0;     // Qué ejercicio de la rutina estamos haciendo
let isContracting = false;        // Estado genérico dinámico
let repCount = 0;
let maxReps = 0;                  // Se llenará con la API
let currentAiParams = null;       // Guardará el JSON parseado de la IA
let routineData = null;           // Guardará toda la rutina de la API

let poseLandmarker;
let runningMode = "VIDEO"; 
let lastVideoTime = -1;

// --- INICIALIZACIÓN DE DATOS DE LA API ---
const urlParams = new URLSearchParams(window.location.search);
const routineID = urlParams.get('routine_id');



// Obtenemos los datos y preparamos el primer ejercicio
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

// Prepara las variables para el ejercicio actual
function setupCurrentExercise() {
  const exercise = routineData.exercises[currentExerciseIndex];
  exerciseName.innerHTML = exercise.name;
  maxReps = parseInt(exercise.repetitions); 
  currentAiParams = JSON.parse(exercise.ai_parameters); // Parseamos el JSON de la DB
  repCount = 0;
  isContracting = false;
  
  console.log(`[KINETIC] Iniciando: ${exercise.exercise} | Objetivo: ${maxReps} reps`);
  
  if (currentRepsElement) currentRepsElement.innerText = repCount;
  updateProgressUI(0);
}


// 2. Función para cargar el modelo
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

// 3. Función para encender la cámara web
const enableWebcam = () => {
  const constraints = { video: true }; 

  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    videoRef.srcObject = stream;
    videoRef.addEventListener('loadeddata', predictWebcam);
  }).catch((err) => {
    console.error("Permiso de cámara denegado o no hay cámara conectada:", err);
  });
};

// 4. Bucle principal de predicción y dibujo
const predictWebcam = async () => {
  canvasRef.width = videoRef.videoWidth;
  canvasRef.height = videoRef.videoHeight;

  let startTimeMs = performance.now();
  
  if (lastVideoTime !== videoRef.currentTime && poseLandmarker) {
    lastVideoTime = videoRef.currentTime;
    
    poseLandmarker.detectForVideo(videoRef, startTimeMs, (result) => {
      canvasCtx.save(); 
      
      // Efecto Espejo
      canvasCtx.translate(canvasRef.width, 0);
      canvasCtx.scale(-1, 1);
      canvasCtx.clearRect(0, 0, canvasRef.width, canvasRef.height);

      if (result.landmarks && result.landmarks.length > 0) {
        const landmarks = result.landmarks[0]; 
        
        // --- 1. DIBUJO DE LA SILUETA ---
        drawingUtils.drawLandmarks(landmarks, {
          radius: (data) => DrawingUtils.lerp(data.from.z, -0.15, 0.1, 5, 1),
          color: "#8DF48E"
        });
        drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
          color: "#FFFFFF",
          lineWidth: 2
        });

        // --- 2. LÓGICA DINÁMICA DEL EJERCICIO ---
        if (currentAiParams) {
          // Extraemos los puntos DINÁMICAMENTE
          const p1 = landmarks[currentAiParams.key_points[0]];
          const p2 = landmarks[currentAiParams.key_points[1]]; // El vértice
          const p3 = landmarks[currentAiParams.key_points[2]];

          if (p1.visibility > 0.5 && p2.visibility > 0.5 && p3.visibility > 0.5) {
            
            const currentAngle = calculateAngle(p1, p2, p3);

            // Evaluamos según el logic_state de la base de datos
            if (currentAiParams.logic_state === "descending") {
              if (currentAngle > currentAiParams.threshold_start) isContracting = false;
              if (currentAngle < currentAiParams.threshold_contract && !isContracting) {
                isContracting = true;
                registerRepetition();
              }
            } 
            else if (currentAiParams.logic_state === "ascending") {
              if (currentAngle < currentAiParams.threshold_start) isContracting = false;
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

// 5. Iniciar la cámara y modelo
createPoseLandmarker();

// --- FUNCIONES DE AYUDA ---

// Registra la repetición y maneja el flujo de la rutina
function registerRepetition() {
  if (repCount < maxReps) {
    repCount++;
    console.log(`Repetición: ${repCount}/${maxReps}`);
    
    if (currentRepsElement) currentRepsElement.innerText = repCount;
    updateProgressUI(repCount);

    // ¿Se terminó el ejercicio actual?
    if (repCount === maxReps) {
      Swal.fire({
        title: '¡Serie Completada!',
        text: `Has terminado tus ${maxReps} repeticiones. ¡Excelente forma!`,
        icon: 'success',
        background: '#0A1610', color: '#ffffff', iconColor: '#8DF48E', confirmButtonColor: '#8DF48E',
        confirmButtonText: '<span style="color: #06100B; font-weight: bold; font-family: Lexend;">Continuar</span>',
        customClass: { popup: 'kinetic-popup' },
        allowOutsideClick: false // Obliga al usuario a darle a continuar
      }).then((result) => {
        if (result.isConfirmed) {
          // Revisamos si hay más ejercicios en la rutina
          currentExerciseIndex++;
          if (currentExerciseIndex < routineData.exercises.length) {
            // Pasamos al siguiente ejercicio automáticamente
            setupCurrentExercise();
          } else {
            // Se acabó toda la rutina
            Swal.fire({
              title: '¡Rutina Finalizada!',
              text: '¡Gran trabajo completando tu pausa activa!',
              icon: 'success',
              background: '#0A1610', color: '#ffffff', confirmButtonColor: '#8DF48E'
            }).then(() => {
              // Aquí podrías redirigir al usuario al dashboard o guardar su progreso en la BD
              console.log("Rutina 100% completada");
            });
          }
        }
      });
    }
  }
}

// Calcula el ángulo entre 3 puntos
function calculateAngle(a, b, c) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
}

// Actualiza las barras de progreso
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
  if (progressPerElement) progressPerElement.innerText = `${percentage}%`;
  if (totalProgressElement) totalProgressElement.value = percentage;
}

// Pruebas con barra espaciadora (También usa la nueva función dinámica)
document.addEventListener("keydown", (event) => {
  if (event.code === "Space" && currentAiParams) {
    event.preventDefault(); 
    registerRepetition();
  }
});