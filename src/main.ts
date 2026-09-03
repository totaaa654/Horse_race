import './styles.css';
import { assetManifest, type HorseColor } from './assets/assetManifest';
import { loadGameAssets } from './assets/assetLoader';
import { GAME_CONFIG } from './config/gameConfig';
import { Horse } from './entities/Horse';
import { GameRenderer } from './rendering/GameRenderer';
import { GameSetup, HORSE_COLOR_HEX } from './ui/GameSetup';

type ScreenName = 'landing' | 'setup' | 'track';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const screens: Record<ScreenName, HTMLElement> = {
  landing: requireElement('#landing-screen'),
  setup: requireElement('#setup-screen'),
  track: requireElement('#track-screen'),
};
const raceCanvas = requireElement<HTMLCanvasElement>('#game-canvas');
const fullscreenTarget = requireElement<HTMLElement>('.track-canvas-frame');

let animationFrameId: number | null = null;

function showScreen(name: ScreenName): void {
  Object.entries(screens).forEach(([screenName, element]) => {
    element.hidden = screenName !== name;
  });
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function initializeLandingAnimations(): void {
  const revealElements = document.querySelectorAll<HTMLElement>('.reveal');
  const progressBar = document.querySelector<HTMLElement>('.scroll-progress span');
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
  const updateScrollProgress = (): void => {
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
    progressBar?.style.setProperty('transform', `scaleX(${Math.min(1, Math.max(0, progress))})`);
    scrollFrameRequested = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (screens.landing.hidden || scrollFrameRequested) return;
      scrollFrameRequested = true;
      requestAnimationFrame(updateScrollProgress);
    },
    { passive: true },
  );
  updateScrollProgress();
}

async function openTrack(colors: HorseColor[]): Promise<void> {
  stopTrackAnimation();
  showScreen('track');

  const loadingMessage = requireElement<HTMLElement>('[data-track-loading]');
  const trackStatus = requireElement<HTMLElement>('[data-track-status]');
  const statusContainer = trackStatus.parentElement;
  const lineup = requireElement<HTMLElement>('[data-track-lineup]');

  resizeRaceCanvasForMode();
  loadingMessage.hidden = false;
  loadingMessage.textContent = 'Loading racers...';
  trackStatus.textContent = 'Preparing the track...';
  statusContainer?.classList.remove('is-ready');
  requireElement<HTMLElement>('[data-track-count]').textContent = `${colors.length} horses`;
  lineup.replaceChildren(...colors.map(createLineupChip));

  try {
    const assets = await loadGameAssets({
      ...assetManifest.track,
      horses: colors.map((color) => ({ color, idle: assetManifest.horse(color).idle })),
    });
    const horses = colors.map(
      (color, laneIndex) =>
        new Horse(
          color,
          100,
          laneIndex,
          GAME_CONFIG.preview.idleFramesPerSecond,
        ),
    );
    const renderer = new GameRenderer(raceCanvas, assets, colors.length);
    let previousTime = performance.now();

    loadingMessage.hidden = true;
    trackStatus.textContent = 'All racers are at the gate';
    statusContainer?.classList.add('is-ready');
    renderer.render(horses);

    const frame = (currentTime: number): void => {
      const deltaSeconds = Math.min((currentTime - previousTime) / 1000, 0.1);
      previousTime = currentTime;
      horses.forEach((horse) => horse.update(deltaSeconds));
      renderer.render(horses);
      animationFrameId = requestAnimationFrame(frame);
    };
    animationFrameId = requestAnimationFrame(frame);
  } catch (error) {
    console.error(error);
    loadingMessage.hidden = false;
    loadingMessage.textContent = 'A racer could not be loaded. Check the horse assets and try again.';
    trackStatus.textContent = 'Track loading failed';
  }
}

function createLineupChip(color: HorseColor, index: number): HTMLElement {
  const chip = document.createElement('span');
  chip.className = 'lineup-chip';
  chip.style.setProperty('--chip-color', HORSE_COLOR_HEX[color]);
  chip.textContent = `H${index + 1} ${color}`;
  return chip;
}

function stopTrackAnimation(): void {
  if (animationFrameId === null) return;
  cancelAnimationFrame(animationFrameId);
  animationFrameId = null;
}

async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement === fullscreenTarget) {
      await document.exitFullscreen();
    } else {
      await fullscreenTarget.requestFullscreen();
    }
  } catch (error) {
    console.error('Fullscreen mode could not be changed.', error);
  }
}

function updateFullscreenButton(): void {
  const button = requireElement<HTMLButtonElement>('[data-fullscreen]');
  const label = requireElement<HTMLElement>('[data-fullscreen-label]');
  const isFullscreen = document.fullscreenElement === fullscreenTarget;
  button.setAttribute('aria-pressed', String(isFullscreen));
  button.setAttribute('aria-label', isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen');
  label.textContent = isFullscreen ? 'Exit fullscreen' : 'Fullscreen';
  resizeRaceCanvasForMode();
}

function exitFullscreenIfActive(): void {
  if (document.fullscreenElement === fullscreenTarget) {
    void document.exitFullscreen();
  }
}

function resizeRaceCanvasForMode(): void {
  if (document.fullscreenElement === fullscreenTarget) {
    raceCanvas.width = Math.max(1, Math.floor(window.innerWidth));
    raceCanvas.height = Math.max(1, Math.floor(window.innerHeight));
    return;
  }

  raceCanvas.width = GAME_CONFIG.canvas.width;
  raceCanvas.height = GAME_CONFIG.canvas.height;
}

function requireElement<T extends HTMLElement = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing page element: ${selector}`);
  return element;
}

initializeLandingAnimations();

const setup = new GameSetup(screens.setup, (colors) => void openTrack(colors));

document.querySelectorAll<HTMLButtonElement>('[data-start-race]').forEach((button) => {
  button.addEventListener('click', () => {
    showScreen('setup');
    setup.open();
  });
});

document.querySelectorAll<HTMLButtonElement>('[data-home]').forEach((button) => {
  button.addEventListener('click', () => {
    stopTrackAnimation();
    exitFullscreenIfActive();
    showScreen('landing');
  });
});

requireElement<HTMLButtonElement>('[data-back-setup]').addEventListener('click', () => {
  stopTrackAnimation();
  exitFullscreenIfActive();
  showScreen('setup');
});

const fullscreenButton = requireElement<HTMLButtonElement>('[data-fullscreen]');
if (document.fullscreenEnabled) {
  fullscreenButton.addEventListener('click', () => void toggleFullscreen());
  document.addEventListener('fullscreenchange', updateFullscreenButton);
  window.addEventListener('resize', () => {
    if (document.fullscreenElement === fullscreenTarget) resizeRaceCanvasForMode();
  });
  updateFullscreenButton();
} else {
  fullscreenButton.hidden = true;
}
