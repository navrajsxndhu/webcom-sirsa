window.addEventListener('scroll', () => {
const nav = document.querySelector('.glass-nav');
if(window.scrollY > 50) {
nav.style.background = 'rgba(15,23,42,0.95)';
} else {
nav.style.background = 'rgba(15,23,42,0.7)';
}
});

// Intersection Observer for Scroll Animations
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target); // Only animate once
        }
    });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => observer.observe(el));
});

// ==========================================
// GLOBAL AESTHETICS (COOL FACTOR)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inject Elements Dynamically
    const body = document.body;

    // Background Blobs
    const blobs = document.createElement('div');
    blobs.className = 'bg-blobs';
    blobs.innerHTML = '<div class="blob blob-1"></div><div class="blob blob-2"></div>';
    body.prepend(blobs);

    // Scroll Progress
    const scrollBar = document.createElement('div');
    scrollBar.id = 'scrollProgress';
    body.prepend(scrollBar);

    // Check if it's a touch device
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (!isTouchDevice) {
        // Custom Cursor
        const cursor = document.createElement('div');
        cursor.className = 'custom-cursor';
        body.appendChild(cursor);
        body.style.cursor = 'none'; // Only hide default cursor here

        // 2. Cursor Movement Logic
        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });

        // 3. Cursor Hover Effect on links/buttons
        setTimeout(() => {
            const interactiveElements = document.querySelectorAll('a, button, input, select, textarea, .course-card, .gallery-card, .feature-card');
            interactiveElements.forEach(el => {
                el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
                el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
            });
        }, 1000);
    }

    // 4. Scroll Progress Logic
    window.addEventListener('scroll', () => {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        scrollBar.style.width = scrolled + "%";
    });
});

// --- GLOBAL SETTINGS INJECTOR ---
document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                    ? 'http://localhost:5000/api' : 'https://webcom-sirsa.onrender.com/api';
    
    try {
        const res = await fetch(`${API_BASE}/data`);
        const data = await res.json();
        
        if (data.settings) {
            document.querySelectorAll('.dyn-phone').forEach(el => el.innerText = data.settings.phone || '+91 90507 00577');
            document.querySelectorAll('.dyn-address').forEach(el => el.innerText = data.settings.address || 'Opp. Town Park Road, Sirsa');
            document.querySelectorAll('.dyn-whatsapp-btn').forEach(el => el.href = `https://wa.me/${data.settings.whatsapp || '919050700577'}`);
            document.querySelectorAll('.dyn-youtube').forEach(el => el.href = data.settings.youtube || '#');
            document.querySelectorAll('.dyn-instagram').forEach(el => el.href = data.settings.instagram || '#');
        }
    } catch(e) {
        console.error("Failed to load global settings", e);
    }
});