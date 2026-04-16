import routinesService from "/src/assets/js/api/services/routines.js";

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const routines = await routinesService.get();
        renderRoutines(routines)
    } catch (e) {
        console.error('Error:', e);
        renderRoutines([]);
    }

})


function renderRoutines(routinesData){
    const routinesContainer = document.getElementById("routines-list");

    routinesContainer.innerHTML = '';

    if(!routinesData?.length) {
        routinesContainer.style.display = 'flex';
        routinesContainer.style.justifyContent = 'center';
        routinesContainer.innerHTML = `
            <div id="create-routine">
                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
                    <path d="M440-280h80v-160h160v-80H520v-160h-80v160H280v80h160v160Zm40 200q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
                </svg>
                <span>Crea una nueva rutina</span>
            </div>
        `;
    }

    routinesData.forEach(routine => {
        let card = document.createElement('div');
        card.classList.add('routine-card');
        card.innerHTML = `
            <div class="card-header">
                <div class="card-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
                        <path d="M480-80 200-360l56-57 184 184v-287h80v287l184-183 56 56L480-80Zm-40-520v-120h80v120h-80Zm0-200v-80h80v80h-80Z"/>
                    </svg>
                </div>
            </div>
            `;

        let cardBody = document.createElement('div');
        cardBody.classList.add('card-body');

        let h3 = document.createElement('h3');
        h3.classList.add('card-title')
        h3.innerHTML = `${routine.name}`;

        let p = document.createElement('p');
        p.classList.add('card-desc');
        p.innerHTML = `${routine.description}`;

        cardBody.appendChild(h3);
        cardBody.appendChild(p);


        let cardStats = document.createElement('div');
        cardStats.classList.add('card-stats');

        let statLabel = document.createElement('span');
        statLabel.classList.add('stat-label');
        statLabel.innerHTML = `ZONA DEL CUERPO`;

        let statValue = document.createElement('span');
        statValue.classList.add('stat-value');
        statValue.innerHTML = `${routine.body_zone}`;

        cardStats.appendChild(statLabel);
        cardStats.appendChild(statValue);


        let launchBtn = document.createElement('a');
        launchBtn.classList.add('launch-btn');
        launchBtn.href = `./live-session.html?routine_id=${routine.id}`
        launchBtn.innerHTML= `Empezar ejercicio`;

        card.appendChild(cardBody);
        card.appendChild(cardStats);
        card.appendChild(launchBtn);


        routinesContainer.appendChild(card);
    });

    
}
