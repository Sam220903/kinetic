// 1. Definimos los datos del menú (¡Añadimos la propiedad 'url'!)
const menuItems = [
  {
    id: "routines",
    text: "Rutinas y ejercicios",
    url: "routines", // <-- Tu archivo de rutinas
    svg: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="m536-84-56-56 142-142-340-340-142 142-56-56 56-58-56-56 84-84-56-58 56-56 58 56 84-84 56 56 58-56 56 56-142 142 340 340 142-142 56 56-56 58 56 56-84 84 56 58-56 56-58-56-84 84-56-56-58 56Z"/></svg>`
  },
  {
    id: "creator",
    text: "Creador",
    url: "creator", // <-- Tu archivo del creador
    svg: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M756-120 537-339l84-84 219 219-84 84Zm-552 0-84-84 276-276-68-68-28 28-51-51v82l-28 28-121-121 28-28h82l-50-50 142-142q20-20 43-29t47-9q24 0 47 9t43 29l-92 92 50 50-28 28 68 68 90-90q-4-11-6.5-23t-2.5-24q0-59 40.5-99.5T701-841q15 0 28.5 3t27.5 9l-99 99 72 72 99-99q7 14 9.5 27.5T841-701q0 59-40.5 99.5T701-561q-12 0-24-2t-23-7L204-120Z"/></svg>`
  },
  {
    id: "session",
    text: "Sesión en vivo",
    url: "live-session", // <-- Tu archivo de la cámara
    svg: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M197-197q-54-55-85.5-127.5T80-480q0-84 31.5-156.5T197-763l57 57q-44 44-69 102t-25 124q0 67 25 125t69 101l-57 57Zm113-113q-32-33-51-76.5T240-480q0-51 19-94.5t51-75.5l57 57q-22 22-34.5 51T320-480q0 33 12.5 62t34.5 51l-57 57Zm113.5-113.5Q400-447 400-480t23.5-56.5Q447-560 480-560t56.5 23.5Q560-513 560-480t-23.5 56.5Q513-400 480-400t-56.5-23.5ZM650-310l-57-57q22-22 34.5-51t12.5-62q0-33-12.5-62T593-593l57-57q32 32 51 75.5t19 94.5q0 50-19 93.5T650-310Zm113 113-57-57q44-44 69-102t25-124q0-67-25-125t-69-101l57-57q54 54 85.5 126.5T880-480q0 83-31.5 155.5T763-197Z"/></svg>`
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

    linksContainer.appendChild(li);
  });
}

// 4. Llamamos a la función al iniciar
renderSidebar();