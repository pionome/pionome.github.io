document.addEventListener('DOMContentLoaded', function() {
    const grid = document.getElementById('webapps-grid');
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');

    fetch('data/webapps.json')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            loading.style.display = 'none';
            data.forEach(webapp => createWebappCard(webapp));
        })
        .catch(error => {
            loading.style.display = 'none';
            errorDiv.textContent = `Error loading web apps: ${error.message}`;
            errorDiv.style.display = 'block';
        });

    function createWebappCard(webapp) {
        const card = document.createElement('a');
        card.className = 'webapp-card';
        card.href = webapp.htmlFile;

        card.innerHTML = `
            <img src="${webapp.thumbnail}" class="webapp-thumbnail" alt="${webapp.name}">
            <div class="webapp-info">
                <h3 class="webapp-name">${webapp.name}</h3>
                <p class="webapp-description">${webapp.description}</p>
            </div>
        `;

        grid.appendChild(card);
    }
});