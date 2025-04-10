document.addEventListener('DOMContentLoaded', function() {
    const soloGrid = document.getElementById('games-grid-solo');
    const collabGrid = document.getElementById('games-grid-collab');
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');

    fetch('data/games.json')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            loading.style.display = 'none';
            const soloGames = data.filter(game => game.collaboration === false).reverse();
            const collabGames = data.filter(game => game.collaboration === true).reverse();
            
            soloGames.forEach(game => createGameCard(game, soloGrid));
            collabGames.forEach(game => createGameCard(game, collabGrid));
        })
        .catch(error => {
            loading.style.display = 'none';
            errorDiv.textContent = `Error loading games: ${error.message}`;
            errorDiv.style.display = 'block';
        });

    function createGameCard(game, container) {
        const card = document.createElement('a');
        card.className = 'game-card';
        card.href = game.link;

        card.innerHTML = `
            <img src="${game.thumbnail}" class="game-thumbnail" alt="${game.name}">
            <div class="game-info">
                <h3 class="game-name">${game.name}</h3>
                <p class="game-description">${game.description}</p>
                ${game.jam ? `<p class="game-jam"><i class="fas fa-gamepad"></i>${game.jam}</p>` : ''}
            </div>
        `;

        container.appendChild(card);
    }
});