const toggle = document.getElementById('menuToggle');
const nav = document.getElementById('publicNav');
if (toggle && nav) {
    toggle.addEventListener('click', () => { const expanded = toggle.getAttribute('aria-expanded') === 'true'; toggle.setAttribute('aria-expanded', String(!expanded)); nav.classList.toggle('open', !expanded); });
    nav.addEventListener('click', e => { if (e.target.closest('a')) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
    } });
}

