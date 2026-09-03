import './styles.css';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealElements = document.querySelectorAll<HTMLElement>('.reveal');
const progressBar = document.querySelector<HTMLElement>('.scroll-progress span');
const startButtons = document.querySelectorAll<HTMLButtonElement>('[data-start-race]');
const startNotes = document.querySelectorAll<HTMLElement>('.start-note');

document.documentElement.classList.add('js');

if (prefersReducedMotion) {
  revealElements.forEach((element) => element.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.16, rootMargin: '0px 0px -7% 0px' },
  );

  revealElements.forEach((element) => revealObserver.observe(element));
}

let scrollFrameRequested = false;

function updateScrollProgress(): void {
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
  progressBar?.style.setProperty('transform', `scaleX(${Math.min(1, Math.max(0, progress))})`);
  scrollFrameRequested = false;
}

window.addEventListener(
  'scroll',
  () => {
    if (scrollFrameRequested) return;
    scrollFrameRequested = true;
    requestAnimationFrame(updateScrollProgress);
  },
  { passive: true },
);

startButtons.forEach((button) => {
  button.addEventListener('click', () => {
    startNotes.forEach((note) => {
      note.textContent = 'Horse selection is the next screen we will build.';
    });
  });
});

updateScrollProgress();
