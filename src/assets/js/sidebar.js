// 1. Definimos los datos del menú (¡Añadimos la propiedad 'url'!)
const menuItems = [
  {
    id: "routines",
    text: "Rutinas y ejercicios",
    url: "routines", // <-- Tu archivo de rutinas
    svg: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="m536-84-56-56 142-142-340-340-142 142-56-56 56-58-56-56 84-84-56-58 56-56 58 56 84-84 56 56 58-56 56 56-142 142 340 340 142-142 56 56-56 58 56 56-84 84 56 58-56 56-58-56-84 84-56-56-58 56Z"/></svg>`,
    disabled: false,
  },
  {
    id: "routine_creator",
    text: "Creador de rutinas",
    url: "routine_creator", // <-- Tu archivo del creador
    svg: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M756-120 537-339l84-84 219 219-84 84Zm-552 0-84-84 276-276-68-68-28 28-51-51v82l-28 28-121-121 28-28h82l-50-50 142-142q20-20 43-29t47-9q24 0 47 9t43 29l-92 92 50 50-28 28 68 68 90-90q-4-11-6.5-23t-2.5-24q0-59 40.5-99.5T701-841q15 0 28.5 3t27.5 9l-99 99 72 72 99-99q7 14 9.5 27.5T841-701q0 59-40.5 99.5T701-561q-12 0-24-2t-23-7L204-120Z"/></svg>`,
    disabled: true, // <-- Deshabilitado
  },
  {
    id: "exercise_uploader",
    text: "Nuevo ejercicio",
    url: "exercise_uploader",
    svg: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M440-280h80v-160h160v-80H520v-160h-80v160H280v80h160v160Zm40 200q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480v320q0 33-23.5 56.5T800-80H480Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>`,
    disabled: true,
  }
];



// 2. Función para renderizar el menú
function renderSidebar() {
  const linksContainer = document.getElementById("links");
  linksContainer.innerHTML = "";

  // Leemos la ruta actual en la que se encuentra el navegador
  const currentPath = window.location.pathname;

  // Iteramos sobre nuestros datos
  menuItems.forEach((item) => {
    const li = document.createElement("li");
    
    // Si la URL actual del navegador incluye el nombre del archivo de este item, lo marcamos como seleccionado
    if (currentPath.includes(item.url)) {
      li.classList.add("selected");
    }

    // Le metemos el SVG y el texto
    li.innerHTML = `
      ${item.svg}
      <span>${item.text}</span>
    `;

    // 3. Agregamos el evento click para redirigir
    li.addEventListener("click", () => {
      // Usamos window.location.href para saltar a la otra página
      window.location.href = item.url;
    });


    if (item.disabled) {
      li.classList.add("disabled");
      // Si el item está deshabilitado, evitamos que el click haga algo
      li.addEventListener("click", (e) => {
        e.preventDefault();
      });
    }

    linksContainer.appendChild(li);
  });
}

// 4. Llamamos a la función al iniciar
renderSidebar();