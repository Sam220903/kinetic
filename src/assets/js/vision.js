import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import Swal from "sweetalert2";

// 1. Referencias al DOM y configuración inicial
const videoRef = document.getElementById("webcam");
const canvasRef = document.getElementById("output-canvas");
const canvasCtx = canvasRef.getContext("2d");
const drawingUtils = new DrawingUtils(canvasCtx);

// Variables para la lógica de la sentadilla
let isSquattingDown = false;
let repCount = 0;
const maxReps = 10;
const currentRepsElement = document.getElementById("current-reps"); // Tu elemento HTML
const repsProgressElement = document.getElementById("reps-progress");
const progressPerElement = document.getElementById("progress-per");
const totalProgressElement = document.getElementById("total-progress");


let poseLandmarker;
let runningMode = "VIDEO"; // Como usaremos la cámara, el modo debe ser VIDEO
let lastVideoTime = -1;

// 2. Función para cargar el modelo
const createPoseLandmarker = async () => {
  try {
    // Apunta a tu carpeta local de wasm
    const vision = await FilesetResolver.forVisionTasks('./wasm');
    
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `./models/pose_landmarker_lite.task`,
        delegate: "GPU" // Usa la tarjeta gráfica para mayor fluidez
      },
      runningMode: runningMode,
      numPoses: 1 // Si solo vas a estar tú en la cámara, 1 es más rápido y eficiente que 2
    });
    
    console.log("¡Modelo PoseLandmarker cargado exitosamente!");
    
    // Una vez que el modelo carga, encendemos la cámara
    enableWebcam();
  } catch (error) {
    console.error("Error al cargar el modelo:", error);
  }
};

// 3. Función para encender la cámara web
const enableWebcam = () => {
  // CORRECCIÓN: video debe ser 'true' para que encienda la cámara
  const constraints = { video: true }; 

  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    videoRef.srcObject = stream;
    // Una vez que el video empieza a reproducirse, iniciamos el bucle de predicción
    videoRef.addEventListener('loadeddata', predictWebcam);
  }).catch((err) => {
    console.error("Permiso de cámara denegado o no hay cámara conectada:", err);
  });
};

// 4. Bucle principal de predicción y dibujo (ACTUALIZADO CON EFECTO ESPEJO)
const predictWebcam = async () => {
  // Nos aseguramos de que las dimensiones del canvas coincidan con las del video
  canvasRef.width = videoRef.videoWidth;
  canvasRef.height = videoRef.videoHeight;

  let startTimeMs = performance.now();
  
  // Solo procesamos si hay un nuevo frame de video y el modelo está listo
  if (lastVideoTime !== videoRef.currentTime && poseLandmarker) {
    lastVideoTime = videoRef.currentTime;
    
    poseLandmarker.detectForVideo(videoRef, startTimeMs, (result) => {
      canvasCtx.save(); // <-- [PASO 1] Guardamos el estado "limpio" y crudo del canvas context
      
      // --- INICIO EFECTO ESPEJO EN CANVAS ---
      // [PASO 2] Movemos el punto de origen de coordenadas a la esquina superior DERECHA
      canvasCtx.translate(canvasRef.width, 0);
      // [PASO 3] Invertimos la escala del eje X (-1). Ahora dibujar a X=10 dibuja visualmente a X = Width - 10.
      canvasCtx.scale(-1, 1);
      // --- FIN CONFIGURACIÓN ESPEJO ---

      // Limpiamos el canvas en cada frame ANTES de dibujar (pero después de aplicar el espejo)
      canvasCtx.clearRect(0, 0, canvasRef.width, canvasRef.height);

      // Si detecta un cuerpo, dibuja los puntos y calcula el ejercicio
      if (result.landmarks && result.landmarks.length > 0) {
        // Tomamos la primera persona detectada (el índice 0)
        const landmarks = result.landmarks[0]; 
        
        // --- 1. DIBUJO DE LA SILUETA (Lo que ya tenías) ---
        drawingUtils.drawLandmarks(landmarks, {
          radius: (data) => DrawingUtils.lerp(data.from.z, -0.15, 0.1, 5, 1),
          color: "#8DF48E"
        });
        drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
          color: "#FFFFFF",
          lineWidth: 2
        });

        // --- 2. LÓGICA DE LA SENTADILLA ---
        // Extraemos los puntos de la pierna izquierda (puedes usar la derecha: 24, 26, 28)
        const hip = landmarks[23];
        const knee = landmarks[25];
        const ankle = landmarks[27];

        // Nos aseguramos de que los puntos sean visibles en la cámara antes de calcular
        if (hip.visibility > 0.5 && knee.visibility > 0.5 && ankle.visibility > 0.5) {
          
          // Calculamos el ángulo de la rodilla
          const kneeAngle = calculateAngle(hip, knee, ankle);

          // Lógica de estado (Umbrales aproximados)
          // Si el ángulo es mayor a 160°, estás de pie
          if (kneeAngle > 160) {
            isSquattingDown = false;
          }
          
          // Si el ángulo es menor a 100° y antes estabas de pie, ¡es una sentadilla!
          if (kneeAngle < 100 && !isSquattingDown) {
            isSquattingDown = true;
            if (repCount < maxReps) {
              repCount ++;
              
              // Actualizamos tu interfaz web automáticamente
              if (currentRepsElement) {
                currentRepsElement.innerText = repCount;
              }
              
              updateProgressUI(repCount);

              console.log("¡Sentadilla completada! Total:", repCount);

              // NUEVO: Lanzamos SweetAlert cuando llega al máximo
      if (repCount === maxReps) {
        
        Swal.fire({
          title: '¡Ejercicio Completado!',
          text: 'Has terminado el ejercicio. ¡Excelente forma!',
          icon: 'success',
          // --- ESTILO KINETIC ---
          background: '#0A1610',         // El color de fondo de tus tarjetas
          color: '#ffffff',              // Texto blanco
          iconColor: '#8DF48E',          // Icono verde neón
          confirmButtonColor: '#8DF48E', // Botón verde neón
          confirmButtonText: '<span style="color: #06100B; font-weight: bold; font-family: Lexend;">Continuar</span>',
          customClass: {
            popup: 'kinetic-popup'       // Clase opcional por si quieres darle más estilos en tu CSS
          }
        }).then((result) => {
          // Esto se ejecuta cuando el usuario hace clic en "Continuar"
          if (result.isConfirmed) {
            console.log("El usuario cerró la alerta. Listo para el siguiente ejercicio.");
            // Aquí podemos reiniciar los contadores
          }
        });
        
      }

            }
          }
        }
      }
      
      canvasCtx.restore(); // <-- [PASO 4] Restauramos el contexto a su estado original para el próximo frame
    });
  }

  // Llama a esta misma función en el siguiente ciclo de renderizado
  window.requestAnimationFrame(predictWebcam);
};
// 5. Iniciar todo el proceso
createPoseLandmarker();


// Calcula el ángulo entre 3 puntos (en grados)
function calculateAngle(a, b, c) {
  // b es el vértice (la rodilla)
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
}

// Actualiza la barra de progreso punteada de las repeticiones y la barra total
function updateProgressUI(currentReps) {
  // 1. Actualizar las rayitas (tu código original)
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

  // 2. NUEVO: Actualizar la barra de progreso total inferior
  // Calculamos el porcentaje (ej: 5 / 10 = 0.5 * 100 = 50)
  const percentage = Math.round((currentReps / maxReps) * 100);

  // Actualizamos el texto (ej: "50%")
  if (progressPerElement) {
    progressPerElement.innerText = `${percentage}%`;
  }

  // Actualizamos el atributo 'value' de la barra <progress>
  if (totalProgressElement) {
    totalProgressElement.value = percentage;
  }
}


/* Pruebas UI */
document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault(); 
    
    if (repCount < maxReps) {
      repCount++; 
      
      if (currentRepsElement) currentRepsElement.innerText = repCount;
      updateProgressUI(repCount);

      // NUEVO: Lanzamos SweetAlert cuando llega al máximo
      if (repCount === maxReps) {
        
        Swal.fire({
          title: '¡Ejercicio Completado!',
          text: 'Has terminado tus 10 sentadillas. ¡Excelente forma!',
          icon: 'success',
          // --- ESTILO KINETIC ---
          background: '#0A1610',         // El color de fondo de tus tarjetas
          color: '#ffffff',              // Texto blanco
          iconColor: '#8DF48E',          // Icono verde neón
          confirmButtonColor: '#8DF48E', // Botón verde neón
          confirmButtonText: '<span style="color: #06100B; font-weight: bold; font-family: Lexend;">Continuar</span>',
          customClass: {
            popup: 'kinetic-popup'       // Clase opcional por si quieres darle más estilos en tu CSS
          }
        }).then((result) => {
          // Esto se ejecuta cuando el usuario hace clic en "Continuar"
          if (result.isConfirmed) {
            console.log("El usuario cerró la alerta. Listo para el siguiente ejercicio.");
            // Aquí podemos reiniciar los contadores
          }
        });
        
      }
    }
  }
});