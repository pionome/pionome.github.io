const navbarToggle = document.getElementById('navbarToggle');
    const navbarPanel = document.getElementById('navbarPanel');

    navbarToggle.onclick = (e) => { 
        e.stopPropagation();
        navbarToggle.classList.toggle('active'); 
        navbarPanel.classList.toggle('active'); 
    };

    window.onclick = (event) => {
        if (navbarPanel.classList.contains('active') && 
            !navbarPanel.contains(event.target) && 
            !navbarToggle.contains(event.target)) {
            navbarToggle.classList.remove('active');
            navbarPanel.classList.remove('active');
        }
    };