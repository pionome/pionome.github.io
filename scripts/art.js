document.addEventListener('DOMContentLoaded', function() {
    const gallery = document.getElementById('gallery');
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const loadMoreBtn = document.getElementById('load-more');
    const controls = document.getElementById('controls');
    const modalLoading = document.getElementById('modalLoading');
    
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalCounter = document.getElementById('modalCounter');
    const modalText = document.getElementById('modalText');
    const modalDate = document.getElementById('modalDate');
    const modalLikes = document.getElementById('modalLikes');
    const modalReposts = document.getElementById('modalReposts');
    const modalImageCount = document.getElementById('modalImageCount');
    const modalPostLink = document.getElementById('modalPostLink');
    const modalPrevBtn = document.getElementById('modalPrevBtn');
    const modalNextBtn = document.getElementById('modalNextBtn');
    
    let cursor = null;
    const handle = 'pioziomgames.bsky.social';
    let currentModalData = null;
    let profileData = null;
    
    loadMoreBtn.addEventListener('click', fetchImages);
    modalPrevBtn.addEventListener('click', () => navigateModal(-1));
    modalNextBtn.addEventListener('click', () => navigateModal(1));
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (modal.style.display === 'block') {
            if (e.key === 'Escape') closeModal();
            if (e.key === 'ArrowLeft') navigateModal(-1);
            if (e.key === 'ArrowRight') navigateModal(1);
        }
    });
    
    fetchProfileData();
    fetchImages();
    
    async function fetchProfileData() {
        try {
            const response = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`);
            if (!response.ok) {
                throw new Error('Failed to fetch profile data');
            }
            profileData = await response.json();
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    }

    async function fetchImages() {
        loading.style.display = 'block';
        errorDiv.style.display = 'none';
        
        try {
            const apiUrl = `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(handle)}&limit=50${cursor ? `&cursor=${cursor}` : ''}`;
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.feed || data.feed.length === 0) {
                showError('No posts found');
                return;
            }
            
            const postsWithImages = data.feed.filter(post => {
                if (post.reply) return false;
                const postText = post.post.record.text || '';
                if (!postText.toLowerCase().includes('#東方project')) return false;
                return post.post.embed?.images || post.post.embed?.media?.images;
            });
            
            if (postsWithImages.length === 0 && gallery.innerHTML === '') {
                showError('No post with images matching criteria found');
                return;
            }
            
            postsWithImages.forEach(post => createPostCard(post));
            
            cursor = data.cursor;
            controls.style.display = cursor ? 'flex' : 'none';
            
        } catch (error) {
            showError(`Error fetching images: ${error.message}`);
            console.error(error);
        } finally {
            loading.style.display = 'none';
        }
    }
    
    function createPostCard(post) {
        const images = post.post.embed?.images || post.post.embed?.media?.images || [];
        if (images.length === 0) return;
        
        const postDate = new Date(post.post.record.createdAt);
        const formattedDate = postDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        
        const postUri = post.post.uri;
        const postUrl = `https://bsky.app/profile/${handle}/post/${postUri.split('/').pop()}`;
        
        const card = document.createElement('div');
        card.className = 'post-card';
        card.dataset.postUri = postUri;
        card.dataset.postUrl = postUrl;
        card.dataset.postText = post.post.record.text || '';
        card.dataset.postDate = formattedDate;
        card.dataset.postLikes = post.post.likeCount || 0;
        card.dataset.postReposts = post.post.repostCount || 0;
        
        card.dataset.images = JSON.stringify(images.map(img => ({
            thumb: img.thumb.replace('jpeg', 'webp'),
            fullsize: img.fullsize.replace('jpeg', 'webp'),
            alt: img.alt || 'No description'
        })));
        
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';
        
        const firstImage = images[0];
        const firstImgUrl = firstImage.thumb.replace('jpeg', 'webp');
        
        const imgElement = document.createElement('img');
        imgElement.src = firstImgUrl;
        imgElement.alt = firstImage.alt || 'No description';
        
        imageContainer.appendChild(imgElement);
        
        if (images.length > 1) {
            const counter = document.createElement('div');
            counter.className = 'image-counter';
            counter.textContent = `1/${images.length}`;
            imageContainer.appendChild(counter);
            
            const navDiv = document.createElement('div');
            navDiv.className = 'image-nav';
            
            const prevBtn = document.createElement('button');
            prevBtn.className = 'nav-btn';
            prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
            prevBtn.style.display = 'none';
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                navigateCardImage(-1, card);
            });
            
            const nextBtn = document.createElement('button');
            nextBtn.className = 'nav-btn';
            nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                navigateCardImage(1, card);
            });
            
            navDiv.appendChild(prevBtn);
            navDiv.appendChild(nextBtn);
            imageContainer.appendChild(navDiv);
            
            card.dataset.currentIndex = '0';
        }
        
        card.addEventListener('click', function() {
            openModal(card);
        });
        
        card.appendChild(imageContainer);
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'image-info';
        infoDiv.innerHTML = `
            <p>${truncateText(post.post.record.text, 150)}</p>
            <div class="post-stats">
                <span><i class="far fa-calendar"></i> ${formattedDate}</span>
                <span><i class="far fa-heart"></i> ${post.post.likeCount || 0}</span>
                <span><i class="fas fa-retweet"></i> ${post.post.repostCount || 0}</span>
                <span><i class="far fa-images"></i> ${images.length}</span>
            </div>
        `;
        card.appendChild(infoDiv);
        
        gallery.appendChild(card);
    }
    
    function openModal(card) {
        modalImage.src = '';
        modalImage.classList.add('loading');
        modalLoading.style.display = 'block';
        
        const images = JSON.parse(card.dataset.images);
        currentModalData = {
            images: images,
            currentIndex: 0,
            postText: card.dataset.postText,
            postDate: card.dataset.postDate,
            postLikes: card.dataset.postLikes,
            postReposts: card.dataset.postReposts,
            postUrl: card.dataset.postUrl,
            imageCount: images.length
        };
        
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        updateModalProfileInfo();
        loadModalImage(0);
    }
    
    function updateModalProfileInfo() {
        const profileInfo = document.createElement('div');
        profileInfo.className = 'modal-user-info';
        
        if (profileData) {
            profileInfo.innerHTML = `
                <img src="${profileData.avatar}" class="modal-avatar" alt="Profile picture">
                <div>
                    <div class="modal-username">${profileData.displayName || handle.split('.')[0]}</div>
                    <div class="modal-handle">@${handle}</div>
                </div>
            `;
        } else {
            profileInfo.innerHTML = `
                <img class="modal-avatar" alt="Profile picture">
                <div>
                    <div class="modal-username">${handle.split('.')[0]}</div>
                    <div class="modal-handle">@${handle}</div>
                </div>
            `;
        }
        
        const modalInfo = document.querySelector('.modal-info');
        const existingProfile = modalInfo.querySelector('.modal-user-info');
        if (existingProfile) {
            modalInfo.replaceChild(profileInfo, existingProfile);
        } else {
            modalInfo.insertBefore(profileInfo, modalInfo.firstChild);
        }
    }
    
    function loadModalImage(index) {
        modalLoading.style.display = 'block';
        modalImage.classList.add('loading');
        
        const image = currentModalData.images[index];
        const img = new Image();
        img.onload = function() {
            modalImage.src = this.src;
            modalImage.alt = image.alt;
            modalImage.classList.remove('loading');
            modalLoading.style.display = 'none';
            updateModalInfo();
        };
        img.src = image.fullsize;
        
        currentModalData.currentIndex = index;
        updateModalInfo();
    }
    
    function navigateModal(direction) {
        const newIndex = currentModalData.currentIndex + direction;
        if (newIndex < 0 || newIndex >= currentModalData.images.length) return;
        loadModalImage(newIndex);
    }
    
    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    function updateModalInfo() {
        modalCounter.textContent = `${currentModalData.currentIndex + 1}/${currentModalData.images.length}`;
        modalText.textContent = currentModalData.postText;
        modalDate.textContent = currentModalData.postDate;
        modalLikes.textContent = currentModalData.postLikes;
        modalReposts.textContent = currentModalData.postReposts;
        modalImageCount.textContent = currentModalData.imageCount;
        modalPostLink.href = currentModalData.postUrl;
        
        modalPrevBtn.classList.toggle('hidden', currentModalData.currentIndex === 0);
        modalNextBtn.classList.toggle('hidden', currentModalData.currentIndex === currentModalData.images.length - 1);
    }
    
    function navigateCardImage(direction, card) {
        const images = JSON.parse(card.dataset.images);
        let currentIndex = parseInt(card.dataset.currentIndex);
        const newIndex = currentIndex + direction;
        
        if (newIndex < 0 || newIndex >= images.length) return;
        
        const imageContainer = card.querySelector('.image-container');
        const imgElement = imageContainer.querySelector('img');
        imgElement.src = images[newIndex].thumb;
        imgElement.alt = images[newIndex].alt;
        
        const counter = imageContainer.querySelector('.image-counter');
        if (counter) {
            counter.textContent = `${newIndex + 1}/${images.length}`;
        }
        
        const prevBtn = imageContainer.querySelector('.nav-btn:first-child');
        const nextBtn = imageContainer.querySelector('.nav-btn:last-child');
        
        prevBtn.style.display = newIndex === 0 ? 'none' : 'flex';
        nextBtn.style.display = newIndex === images.length - 1 ? 'none' : 'flex';
        
        card.dataset.currentIndex = newIndex;
    }
});