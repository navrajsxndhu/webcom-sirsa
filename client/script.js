window.addEventListener('scroll', () => {

const nav = document.querySelector('.glass-nav');

if(window.scrollY > 50) {
nav.style.background = '#0f172a';
}
else {
nav.style.background = 'rgba(0,0,0,0.6)';
}

});