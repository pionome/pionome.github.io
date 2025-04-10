document.addEventListener('DOMContentLoaded', function() {
    const modsContainer = document.getElementById('mods-container');
    const loading = document.getElementById('loading');
    const loadMoreBtn = document.getElementById('load-more');
    const controls = document.getElementById('controls');
    const errorDiv = document.getElementById('error');
    
    const memberId = '1757842';
    const perPage = 20;
    let currentPage = 1;
    let mods = [];
    
    loadMoreBtn.addEventListener('click', fetchMods);
    
    fetchMods();
       
    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    async function fetchMods() {
        loading.style.display = 'block';
        errorDiv.style.display = 'none';
        
        try {
            const response = await fetch(`https://gamebanana.com/apiv11/Member/${memberId}/SubFeed?_nPage=${currentPage}&_nPerpage=${perPage}`);
            console.log(`https://gamebanana.com/apiv11/Member/${memberId}/SubFeed?_nPage=${currentPage}&_nPerpage=${perPage}`);
            
            if (!response.ok) {
                throw new Error(`GameBanana API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data || !data._aRecords || data._aRecords.length === 0) {
                showError('No more mods found');
                controls.style.display = 'none';
                return;
            }
            
            mods = [...mods, ...data._aRecords];
            displayMods(data._aRecords);
            
            if (data._aMetadata._bIsComplete) {
                controls.style.display = 'none';
            } else {
                currentPage++;
                controls.style.display = 'flex';
            }
            
        } catch (error) {
            showError(`Error fetching mods: ${error.message}`);
            console.error(error);
        } finally {
            loading.style.display = 'none';
        }
    }
    
    function displayMods(modsToDisplay) {
        modsToDisplay.forEach(mod => {
            const card = document.createElement('div');
            card.className = 'mod-card';
            
            const previewImage = mod._aPreviewMedia?._aImages?.[0] ? `${mod._aPreviewMedia._aImages[0]._sBaseUrl}/${mod._aPreviewMedia._aImages[0]._sFile}` : "";
            
            const gameIcon = mod._aGame?._sIconUrl || "";
            
            card.innerHTML = `
                <img src="${previewImage}" class="mod-image" alt="${mod._sName}" loading="lazy">
                <div class="mod-content">
                    <h3 class="mod-title">${mod._sName}</h3>
                    <div class="mod-game">
                        <img src="${gameIcon}" class="game-icon" alt="${mod._aGame?._sName || 'Unknown'}">
                        <span>${mod._aGame?._sName || 'Unknown Game'}</span>
                    </div>
                    <div class="mod-date">
                        <i class="far fa-calendar-alt"></i>
                        ${formatDate(mod._tsDateModified)}
                    </div>
                    <div class="mod-stats">
                        <span class="mod-stat">
                            <i class="fas fa-eye"></i>
                            ${mod._nViewCount || 0}
                        </span>
                        <span class="mod-stat">
                            <i class="fas fa-comment"></i>
                            ${mod._nPostCount || 0}
                        </span>
                        <span class="mod-stat">
                            <i class="fas fa-thumbs-up"></i>
                            ${mod._nLikeCount || 0}
                        </span>
                    </div>
                </div>
            `;
            
            card.addEventListener('click', () => {
                window.open(mod._sProfileUrl, '_blank');
            });
            modsContainer.appendChild(card);
        });
    }
    
    function formatDate(timestamp) {
        if (!timestamp) return 'Unknown date';
        try {
            const date = new Date(timestamp * 1000);
            return isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleDateString();
        } catch {
            return 'Unknown date';
        }
    }
});