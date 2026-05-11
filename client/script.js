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
    rootMargin: '100px',
    threshold: 0.05
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target); // Only animate once
        }
    });
}, observerOptions);

window.revealObserver = observer; // Make it globally accessible

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
    if (!document.querySelector('.bg-blobs')) body.prepend(blobs);

    // Scroll Progress
    if (!document.getElementById('scrollProgress')) {
        const scrollBar = document.createElement('div');
        scrollBar.id = 'scrollProgress';
        body.prepend(scrollBar);
    }

    // 1. Active Link Highlighting
    const currentPath = window.location.pathname;
    const pageName = currentPath.split("/").pop() || 'index.html';
    
    document.querySelectorAll('.nav-link').forEach(link => {
        const linkPath = link.getAttribute('href');
        if (linkPath === pageName || (pageName === 'index.html' && linkPath === 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Check if it's a touch device
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (!isTouchDevice) {
        // 2. Custom Cursor Logic
        if (!document.querySelector('.custom-cursor')) {
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
                const interactiveElements = document.querySelectorAll('a, button, input, select, textarea, .course-card, .gallery-card, .feature-card, .staff-card, .testimonial-card, .testimonial-page-card');
                interactiveElements.forEach(el => {
                    el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
                    el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
                    
                    // Mouse follow for radial gradient
                    if (el.classList.contains('course-card') || el.classList.contains('feature-card') || el.classList.contains('staff-card') || el.classList.contains('testimonial-card') || el.classList.contains('testimonial-page-card')) {
                        el.addEventListener('mousemove', (e) => {
                            const rect = el.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const y = e.clientY - rect.top;
                            el.style.setProperty('--x', `${x}px`);
                            el.style.setProperty('--y', `${y}px`);
                        });
                    }
                });
            }, 1000);
        }
    }

    // 4. Scroll Progress Logic
    window.addEventListener('scroll', () => {
        const scrollBar = document.getElementById('scrollProgress');
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        if (scrollBar) scrollBar.style.width = scrolled + "%";
    });
});

// --- GLOBAL DATA FETCH & CACHE ---
async function getWebcomData() {
    const CACHE_KEY = 'webcom_data_cache';
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' || 
                    window.location.protocol === 'file:';
    
    // Hardcoded production URL for absolute reliability across domains
    const API_BASE = isLocal 
                    ? 'http://localhost:5000/api' 
                    : 'https://webcom-sirsa.onrender.com/api';
    
    window.WEBCOM_API = API_BASE;

    // 1. Try to return cached data immediately for speed
    const cachedData = localStorage.getItem(CACHE_KEY);
    const parsedCache = cachedData ? JSON.parse(cachedData) : null;

    // 2. Define fetch logic
    const fetchData = async () => {
        try {
            const res = await fetch(`${API_BASE}/data`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            return data;
        } catch (e) {
            console.error("Background fetch failed", e);
            return parsedCache; // Fallback to cache if fetch fails
        }
    };

    // If we have cache, return it immediately to avoid "Loading" hangs
    // But pages should ideally have logic to re-render if fresh data arrives
    if (parsedCache) {
        // Kick off a background refresh anyway
        fetchData(); 
        return parsedCache;
    }

    // If no cache, we MUST wait for the fetch
    return await fetchData();
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initial fetch to warm up Render server & cache
    const data = await getWebcomData();
    
    if (data && data.settings) {
        document.querySelectorAll('.dyn-phone').forEach(el => el.innerText = data.settings.phone || '+91 90507 00577');
        document.querySelectorAll('.dyn-address').forEach(el => el.innerText = data.settings.address || 'Opp. Town Park Road, Sirsa');
        document.querySelectorAll('.dyn-whatsapp-btn').forEach(el => {
            const waNumber = data.settings.whatsapp || '919050700577';
            el.href = `https://wa.me/${waNumber.replace(/[^0-9]/g, '')}`;
        });
        document.querySelectorAll('.dyn-youtube').forEach(el => el.href = data.settings.youtube || '#');
        document.querySelectorAll('.dyn-instagram').forEach(el => el.href = data.settings.instagram || '#');
        document.querySelectorAll('.dyn-facebook').forEach(el => el.href = data.settings.facebook || '#');
        document.querySelectorAll('.dyn-channel').forEach(el => el.href = data.settings.channel || '#');
    }

    // Dynamic copyright year
    document.querySelectorAll('.dyn-year').forEach(el => el.textContent = new Date().getFullYear());
});

// --- GLOBAL TOAST NOTIFICATION ---
function showToast(title, message, type = 'success') {
    const existingToast = document.querySelector('.apple-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `apple-toast ${type}`;
    
    let icon;
    if (type === 'success') {
        icon = '<i class="fa-solid fa-check-circle" style="color:#34c759"></i>';
    } else if (type === 'error') {
        icon = '<i class="fa-solid fa-circle-xmark" style="color:#ff3b30"></i>';
    } else if (type === 'warning') {
        icon = '<i class="fa-solid fa-triangle-exclamation" style="color:#ff9f0a"></i>';
    } else {
        icon = '<i class="fa-solid fa-circle-info" style="color:#007aff"></i>';
    }

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 4500);
}
// --- SCROLL TO TOP BUTTON ---
const createScrollTop = () => {
    if (document.querySelector('.scroll-top-btn')) return;
    const btn = document.createElement('a');
    btn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
    btn.className = 'scroll-top-btn';
    btn.setAttribute('aria-label', 'Scroll to Top');
    btn.href = '#';
    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    });

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
};
createScrollTop();
