document.addEventListener('DOMContentLoaded', function() {
    const programsGrid = document.getElementById('programs-grid');
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');

    fetch('data/programs.json')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            loading.style.display = 'none';
            data.forEach(program => createProgramCard(program, programsGrid));
        })
        .catch(error => {
            loading.style.display = 'none';
            errorDiv.textContent = `Error loading programs: ${error.message}`;
            errorDiv.style.display = 'block';
        });

    function createProgramCard(program, container) {
        const card = document.createElement('div');
        card.className = 'program-card';

        card.innerHTML = `
            <div class="program-image">
                <img src="${program.image}" alt="${program.name}">
            </div>
            <a href="${program.link}" class="program-name">${program.name}</a>
            <p class="program-description">${program.description}</p>
            <a href="${program.downloadLink}" class="program-button">Download</a>
        `;

        container.appendChild(card);
    }
});