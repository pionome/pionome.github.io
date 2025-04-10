
document.addEventListener('DOMContentLoaded', function() {
    const reposContainer = document.getElementById('repos-container');
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const loadMoreBtn = document.getElementById('load-more');
    const controls = document.getElementById('controls');
    const modalLoading = document.getElementById('modalLoading');
    
    const modal = document.getElementById('repoModal');
    const modalRepoName = document.getElementById('modalRepoName');
    const modalRepoOwner = document.getElementById('modalRepoOwner');
    const modalRepoAvatar = document.getElementById('modalRepoAvatar');
    const modalRepoDescription = document.getElementById('modalRepoDescription');
    const modalRepoStars = document.getElementById('modalRepoStars');
    const modalRepoForks = document.getElementById('modalRepoForks');
    const modalRepoWatchers = document.getElementById('modalRepoWatchers');
    const modalRepoIssues = document.getElementById('modalRepoIssues');
    const modalRepoLanguages = document.getElementById('modalRepoLanguages');
    const modalRepoLink = document.getElementById('modalRepoLink');
    const modalRepoWebsite = document.getElementById('modalRepoWebsite');
    
    const username = 'Pioziomgames';
    let currentPage = 1;
    let repos = [];
    let languagesCache = {};
    
    loadMoreBtn.addEventListener('click', fetchRepos);
    
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
    
    fetchRepos();
    
    async function fetchRepos() {
        loading.style.display = 'block';
        errorDiv.style.display = 'none';
        
        try {
            const response = await fetch(`https://api.github.com/users/${username}/repos?page=${currentPage}&per_page=30&sort=updated`);
            
            if (!response.ok) {
                throw new Error(`GitHub API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.length === 0) {
                showError('No more repositories found');
                controls.style.display = 'none';
                return;
            }
            
            repos = [...repos, ...data];
            displayRepos(data);
            
            currentPage++;
            controls.style.display = 'flex';
            
        } catch (error) {
            showError(`Error fetching repositories: ${error.message}`);
            console.error(error);
        } finally {
            loading.style.display = 'none';
        }
    }
    
    function displayRepos(repos) {
        repos.forEach(repo => {
            if (repo.fork) return;
            
            const card = document.createElement('div');
            card.className = 'repo-card';
            card.dataset.repoName = repo.name;
            
            const languageColor = repo.language ? getLanguageColor(repo.language) : '#ccc';
            
            card.innerHTML = `
                <div class="repo-content">
                    <div class="repo-header">
                        <img src="${repo.owner.avatar_url}" class="repo-avatar" alt="${repo.owner.login}">
                        <div>
                            <h3 class="repo-name">${repo.name}</h3>
                            <p class="repo-owner">${repo.owner.login}</p>
                        </div>
                    </div>
                    <p class="repo-description">${repo.description || 'No description provided'}</p>
                    <div class="repo-stats">
                        <span class="repo-stat">
                            <i class="fas fa-star"></i>
                            ${repo.stargazers_count}
                        </span>
                        <span class="repo-stat">
                            <i class="fas fa-code-branch"></i>
                            ${repo.forks_count}
                        </span>
                        <span class="repo-stat">
                            <span class="repo-language" style="background-color: ${languageColor}"></span>
                            ${repo.language || 'Unknown'}
                        </span>
                    </div>
                </div>
            `;
            
            card.addEventListener('click', () => openModal(repo));
            reposContainer.appendChild(card);
        });
    }
    
    async function openModal(repo) {
        modalLoading.style.display = 'block';
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        modalRepoName.textContent = repo.name;
        modalRepoOwner.textContent = repo.owner.login;
        modalRepoAvatar.src = repo.owner.avatar_url;
        modalRepoDescription.textContent = repo.description || 'No description provided';
        modalRepoStars.textContent = repo.stargazers_count;
        modalRepoForks.textContent = repo.forks_count;
        modalRepoWatchers.textContent = repo.watchers_count;
        modalRepoIssues.textContent = repo.open_issues_count;
        modalRepoLink.href = repo.html_url;
        
        if (repo.homepage) {
            modalRepoWebsite.href = repo.homepage;
            modalRepoWebsite.style.display = 'inline-block';
        } else {
            modalRepoWebsite.style.display = 'none';
        }
        
        if (!languagesCache[repo.name]) {
            try {
                const response = await fetch(repo.languages_url);
                if (response.ok) {
                    languagesCache[repo.name] = await response.json();
                }
            } catch (error) {
                console.error('Error fetching languages:', error);
            }
        }
        
        modalRepoLanguages.innerHTML = '';
        if (languagesCache[repo.name]) {
            const totalBytes = Object.values(languagesCache[repo.name]).reduce((sum, bytes) => sum + bytes, 0);
            
            Object.entries(languagesCache[repo.name]).forEach(([lang, bytes]) => {
                const percentage = ((bytes / totalBytes) * 100).toFixed(1);
                if (percentage > 0) {
                    const langColor = getLanguageColor(lang);
                    const languageTag = document.createElement('div');
                    languageTag.className = 'language-tag';
                    languageTag.innerHTML = `
                        <span class="language-color" style="background-color: ${langColor}"></span>
                        ${lang} <span class="language-percentage">${percentage}%</span>
                    `;
                    modalRepoLanguages.appendChild(languageTag);
                }
            });
        }
        
        modalLoading.style.display = 'none';
    }
    
    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
    
    function getLanguageColor(language) {
        const colors = {
            'JavaScript': '#f1e05a',
            'Python': '#3572A5',
            'Java': '#b07219',
            'C++': '#f34b7d',
            'C#': '#178600',
            'PHP': '#4F5D95',
            'Ruby': '#701516',
            'CSS': '#563d7c',
            'HTML': '#e34c26',
            'Rust': '#dea584',
        };
        
        return colors[language] || '#ccc';
    }
});