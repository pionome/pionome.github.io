document.addEventListener('DOMContentLoaded', function() {
    const artContainer = document.getElementById('art-container');
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const loadMoreBtn = document.getElementById('load-more');
    const controls = document.getElementById('controls');
    const modalLoading = document.getElementById('modalLoading');
    
    const modal = document.getElementById('artModal');
    const modalArtTitle = document.getElementById('modalArtTitle');
    const modalArtImage = document.getElementById('modalArtImage');
    const modalArtDescription = document.getElementById('modalArtDescription');
    const modalArtDate = document.getElementById('modalArtDate');
    const modalArtLikes = document.getElementById('modalArtLikes');
    const modalArtViews = document.getElementById('modalArtViews');
    const modalArtBookmarks = document.getElementById('modalArtBookmarks');
    const modalArtTags = document.getElementById('modalArtTags');
    const modalArtLink = document.getElementById('modalArtLink');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageIndicator = document.getElementById('pageIndicator');
    const closeModalBtn = document.querySelector('.close-modal');
    const modalArtist = document.getElementById('modalArtist');
    const modalArtistAvatar = document.getElementById('modalArtistAvatar');
    const modalArtistName = document.getElementById('modalArtistName');
    
    const userId = '46385589';
    const proxy = 'https://pixivnow-eight.vercel.app';
    const profileUrl = `${proxy}/ajax/user/${userId}/profile/all`;
    const userProfileUrl = `${proxy}/ajax/user/${userId}?full=1`;
    let allIllustIds = [];
    let currentPage = 1;
    const pageSize = 15;
    let currentArtwork = null;
    let currentPageIndex = 0;
    let userProfile = null;
    
    loadMoreBtn.addEventListener('click', fetchArtwork);
    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (modal.style.display === 'block' && e.key === 'Escape') {
            closeModal();
        }
    });
    
    prevPageBtn.addEventListener('click', () => navigatePage(-1));
    nextPageBtn.addEventListener('click', () => navigatePage(1));
    
    fetchProfile();
    
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }
    
    function fixUrl(ogUrl)
    {
        return ogUrl.replace('https://i.pximg.net', `${proxy}/~`).replace('https://s.pximg.net', `${proxy}/~`)
    }
    
    
    async function fetchProfile() {
        try {
            loading.style.display = 'block';
            errorDiv.style.display = 'none';
            
            const userRes = await fetch(userProfileUrl);
            if (!userRes.ok) throw new Error('Failed to fetch user profile');
            userProfile = await userRes.json();
            
            if (!userProfile || !userProfile.name) {
                throw new Error('Invalid user profile data');
            }
            
            userProfile.imageBig = fixUrl(userProfile.imageBig);
            
            const response = await fetch(profileUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch profile: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.illusts) {
                throw new Error('Invalid profile data format');
            }
            
            allIllustIds = Object.keys(data.illusts).map(id => id);
            
            if (allIllustIds.length === 0) {
                showError('No artwork found in profile');
                return;
            }
            
            allIllustIds.reverse();
            
            fetchArtwork();
            
        } catch (error) {
            showError(`Error fetching profile: ${error.message}`);
            console.error(error);
        }
    }
    
    async function fetchArtwork() {
        try {
            loading.style.display = 'block';
            errorDiv.style.display = 'none';
            
            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const currentIds = allIllustIds.slice(startIndex, endIndex);
            
            if (currentIds.length === 0) {
                controls.style.display = 'none';
                return;
            }
            
            const idsParam = currentIds.map(id => `ids[]=${id}`).join('&');
            const detailsUrl = `${proxy}/ajax/user/${userId}/illusts?${idsParam}`;
            
            const response = await fetch(detailsUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch artwork: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data) {
                throw new Error('Invalid artwork data format');
            }
            dataValues = Object.values(data)
            displayArtwork(dataValues);
            
            currentPage++;
            if (dataValues.length < pageSize)
                controls.style.display = 'none';
            else
                controls.style.display = 'flex';
            
        } catch (error) {
            showError(`Error fetching artwork: ${error.message}`);
            console.error(error);
        } finally {
            loading.style.display = 'none';
        }
    }
    
    function displayArtwork(artworkData) {
        Object.values(artworkData).reverse().forEach(art => {
            if (!art) return;
            
            const imageUrl = fixUrl(art.url);
            
            const card = document.createElement('div');
            card.className = 'art-card';
            card.dataset.artId = art.id;
            
            card.innerHTML = `
                <div class="art-thumbnail-container">
                    <img src="${imageUrl}" class="art-thumbnail" alt="${art.title}">
                </div>
                <div class="art-content">
                    <div class="art-header">
                        <h3 class="art-title">${art.title}</h3>
                        <div class="art-artist">
                        ${userProfile ? `<img src="${userProfile.imageBig}" class="artist-avatar" alt="${userProfile.name}">` : ''}
                        <span class="artist-name">${userProfile ? userProfile.name : 'Pio'}</span>
                    </div>
                    </div>
                    
                    <div class="art-date">
                        <span><i class="fas fa-calendar-alt"></i> ${formatDate(art.createDate)}</span>
                        <span><i class="fas fa-images"></i> ${art.pageCount}</span>
                    </div>
                </div>
            `;
            
            card.addEventListener('click', () => openModal(art));
            artContainer.appendChild(card);
        });
    }
    
    async function openModal(art) {
        modalLoading.style.display = 'block';
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        try {
            if (userProfile) {
                modalArtistAvatar.src = userProfile.imageBig;
                modalArtistAvatar.alt = userProfile.name;
                modalArtistName.textContent = userProfile.name;
                let targetUrl = `https://pixiv.net/users/${userProfile.userId}`;
                modalArtist.setAttribute("role", "link");
                modalArtist.setAttribute("tabindex", "0");
                modalArtist.style.cursor = "pointer";
                modalArtist.addEventListener("click", () => {
                    window.location.href = targetUrl;
                });

                modalArtist.addEventListener("keydown", (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        window.location.href = targetUrl;
                    }
                });
            }
            
            const response = await fetch(`${proxy}/ajax/illust/${art.id}`);
            if (!response.ok) throw new Error(`Failed to fetch artwork details: ${response.status}`);
            
            const fullArt = await response.json();
            if (!fullArt) throw new Error('Invalid artwork details');
            
            console.log(fullArt);

            currentArtwork = fullArt;
            currentPageIndex = 0;
            
            modalArtTitle.textContent = fullArt.title;
            modalArtDate.textContent = formatDate(fullArt.createDate);
            modalArtLikes.textContent = fullArt.likeCount;
            modalArtViews.textContent = fullArt.viewCount;
            modalArtBookmarks.textContent = fullArt.bookmarkCount;
            modalArtLink.href = `https://www.pixiv.net/artworks/${fullArt.id}`;
            
            if (fullArt.description) {
                modalArtDescription.innerHTML = fullArt.description;
                modalArtDescription.classList.remove('empty-description');
            } else {
                modalArtDescription.textContent = 'No description available';
                modalArtDescription.classList.add('empty-description');
            }
            
            modalArtTags.innerHTML = '';
            if (fullArt.tags && fullArt.tags.tags) {
                fullArt.tags.tags.forEach(tag => {
                    const tagEl = document.createElement('div');
                    if (tag.translation)
                        tagEl.title = `${tag.translation.en} (${tag.romaji})`;
                    else if (tag.romaji)
                        tagEl.title = `(${tag.romaji})`;
                    tagEl.className = 'tag-modal';
                    tagEl.textContent = tag.tag;
                    modalArtTags.appendChild(tagEl);
                });
            }
            
            loadImageForPage(0);
        } catch (error) {
            console.error('Error loading artwork details:', error);
            modalArtDescription.textContent = 'Failed to load artwork details';
        }
    }
    
    function loadImageForPage(pageIndex) {
        if (!currentArtwork || pageIndex < 0 || pageIndex >= currentArtwork.pageCount) return;
        
        currentPageIndex = pageIndex;
        modalLoading.style.display = 'block';
        
        let imageUrl;
        if (currentArtwork.pageCount > 1) {
            const baseUrl = currentArtwork.urls.regular;
            imageUrl = baseUrl.replace('_p0', `_p${pageIndex}`);
        } else {
            imageUrl = currentArtwork.urls.regular;
        }
        
        imageUrl = fixUrl(imageUrl);
        
        modalArtImage.src = imageUrl;	
        modalArtImage.onload = () => {
            modalLoading.style.display = 'none';
            updatePageNavigation();
        };
        
        modalArtImage.onerror = () => {
            modalLoading.style.display = 'none';
            updatePageNavigation();
        };
    }
    
    function updatePageNavigation() {
        if (!currentArtwork) return;
        
        pageIndicator.textContent = `${currentPageIndex + 1}/${currentArtwork.pageCount}`;
        
        prevPageBtn.disabled = currentPageIndex <= 0;
        nextPageBtn.disabled = currentPageIndex >= currentArtwork.pageCount - 1;
    }
    
    function navigatePage(direction) {
        const newPage = currentPageIndex + direction;
        if (newPage >= 0 && newPage < currentArtwork.pageCount) {
            loadImageForPage(newPage);
        }
    }
    
    function closeModal() {
        modalArtImage.src = '';
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        currentArtwork = null;
    }
    
    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
});