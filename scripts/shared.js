document.addEventListener('DOMContentLoaded', function() {
    const background = document.getElementById('background');
	if (background != null)
	{
		const starEmojis = ['✨', '🌟', '⭐', '💫'];
		const fragment = document.createDocumentFragment();
		
		for (let i = 0; i < 30; i++) {
			const item = document.createElement('div');
			item.className = 'floating-item star';
			item.innerHTML = starEmojis[Math.floor(Math.random() * starEmojis.length)];
			
			item.style.cssText = `
				font-size: ${Math.random() * 30 + 15}px;
				left: ${Math.random() * 100}%;
				animation-duration: ${Math.random() * 15 + 10}s;
				animation-delay: ${Math.random() * 5}s;
			`;
			
			if (Math.random() > 0.7) {
				item.classList.add('wiggle');
			}
			
			fragment.appendChild(item);
		}
		
		background.appendChild(fragment);
	}
    
    const navItems = document.querySelectorAll('.nav-links li:not(.side-nav .nav-links li)');
    navItems.forEach((item, index) => {
        item.style.animation = `dropdown 0.6s ease-out ${index * 0.1}s both`;
    });

});

function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}