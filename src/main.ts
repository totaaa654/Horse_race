import './styles.css';
import { assetManifest, type HorseColor } from './assets/assetManifest';
import { loadGameAssets } from './assets/assetLoader';
import { AudioManager } from './audio/AudioManager';
import { SideScrollingCamera } from './camera/SideScrollingCamera';
import { GAME_CONFIG } from './config/gameConfig';
import { Horse } from './entities/Horse';
import { GameRenderer } from './rendering/GameRenderer';
import { RaceEngine, type RacePhase } from './race/RaceEngine';
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
const raceControl = requireElement<HTMLButtonElement>('[data-race-control]');
const trackStatus = requireElement<HTMLElement>('[data-track-status]');
const trackTitle = requireElement<HTMLElement>('#track-title');
const skipTrumpetsButton = requireElement<HTMLButtonElement>('[data-skip-trumpets]');
const audioToggleButtons = document.querySelectorAll<HTMLButtonElement>('[data-audio-toggle]');
const audioManager = new AudioManager(assetManifest.audio, (isPlaying) => {
  skipTrumpetsButton.hidden = !isPlaying;
});

let animationFrameId: number | null = null;
let trackLoadId = 0;

interface ActiveRace {
  horses: Horse[];
  engine: RaceEngine;
  camera: SideScrollingCamera;
  renderer: GameRenderer;
  audioPhase: RacePhase;
}

let activeRace: ActiveRace | null = null;

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
  const loadId = trackLoadId;
  showScreen('track');
  audioManager.playTrumpets();

  const loadingMessage = requireElement<HTMLElement>('[data-track-loading]');
  const statusContainer = trackStatus.parentElement;
  const lineup = requireElement<HTMLElement>('[data-track-lineup]');

  resizeRaceCanvasForMode();
  loadingMessage.hidden = false;
  loadingMessage.textContent = 'Loading racers...';
  trackStatus.textContent = 'Preparing the track...';
  trackTitle.textContent = 'Racers ready!';
  statusContainer?.classList.remove('is-ready');
  raceControl.hidden = true;
  raceControl.disabled = true;
  requireElement<HTMLElement>('[data-track-count]').textContent = `${colors.length} horses`;
  lineup.replaceChildren(...colors.map(createLineupChip));

  try {
    const assets = await loadGameAssets({
      ...assetManifest.track,
      horses: colors.map((color) => ({
        color,
        idle: assetManifest.horse(color).idle,
        run: assetManifest.horse(color).run,
      })),
    });
    if (loadId !== trackLoadId) return;

    const horses = colors.map(
      (color, laneIndex) =>
        new Horse(
          color,
          GAME_CONFIG.race.startLineX - GAME_CONFIG.race.startingGap,
          laneIndex,
          GAME_CONFIG.preview.idleFramesPerSecond,
          GAME_CONFIG.race.runFramesPerSecond,
        ),
    );
    const renderer = new GameRenderer(raceCanvas, assets, colors.length);
    const engine = new RaceEngine(horses, GAME_CONFIG.race);
    const camera = new SideScrollingCamera({
      anchorRatio: GAME_CONFIG.race.cameraAnchorRatio,
      finishLineScreenRatio: GAME_CONFIG.race.finishLineScreenRatio,
    });
    const session: ActiveRace = {
      horses,
      engine,
      camera,
      renderer,
      audioPhase: engine.phase,
    };
    activeRace = session;
    let previousTime = performance.now();

    loadingMessage.hidden = true;
    statusContainer?.classList.add('is-ready');
    updateRaceUi(session);
    renderRace(session);

    const frame = (currentTime: number): void => {
      if (activeRace !== session) return;
      const deltaSeconds = Math.min((currentTime - previousTime) / 1000, 0.1);
      previousTime = currentTime;
      engine.update(deltaSeconds);
      if (session.audioPhase !== engine.phase) {
        session.audioPhase = engine.phase;
        if (engine.phase === 'finished') audioManager.playVictory();
      }
      camera.update(
        engine.leaderX,
        engine.rules.finishLineX,
        raceCanvas.width,
        deltaSeconds,
        engine.phase === 'running' || engine.phase === 'finished',
      );
      renderRace(session);
      updateRaceUi(session);
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
  trackLoadId += 1;
  activeRace = null;
  audioManager.stopAll();
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function renderRace(session: ActiveRace): void {
  session.renderer.render(session.horses, {
    cameraX: session.camera.x,
    startLineX: session.engine.rules.startLineX,
    finishLineX: session.engine.rules.finishLineX,
    announcement: session.engine.announcement,
  });
}

function updateRaceUi(session: ActiveRace): void {
  const { engine } = session;
  const statusContainer = trackStatus.parentElement;
  statusContainer?.classList.toggle('is-running', engine.phase === 'running');
  statusContainer?.classList.toggle('is-finished', engine.phase === 'finished');

  if (engine.phase === 'ready') {
    trackStatus.textContent = 'All racers are at the starting line';
    trackTitle.textContent = 'Racers ready!';
    raceControl.textContent = 'Start race';
    raceControl.disabled = false;
    raceControl.hidden = false;
    return;
  }

  if (engine.phase === 'countdown') {
    trackStatus.textContent = `Race starts in ${Math.max(1, Math.ceil(engine.countdownRemaining))}`;
    trackTitle.textContent = 'Get ready...';
    raceControl.hidden = true;
    return;
  }

  if (engine.phase === 'running') {
    const finishedCount = engine.finishOrder.length;
    trackStatus.textContent = finishedCount > 0
      ? `${finishedCount} of ${session.horses.length} horses finished`
      : 'The race is underway!';
    trackTitle.textContent = finishedCount > 0 ? 'Final stretch!' : "They're off!";
    raceControl.hidden = true;
    return;
  }

  const winner = engine.finishOrder[0];
  const winnerName = winner ? capitalize(winner.color) : 'A horse';
  trackStatus.textContent = `${winnerName} wins in ${winner?.finishTime?.toFixed(2) ?? '--'} seconds`;
  trackTitle.textContent = `${winnerName} takes the crown!`;
  raceControl.textContent = 'Race again';
  raceControl.disabled = false;
  raceControl.hidden = false;
}

function startOrReplayRace(): void {
  if (!activeRace) return;
  if (activeRace.engine.phase !== 'ready' && activeRace.engine.phase !== 'finished') return;
  if (activeRace.engine.phase === 'finished') {
    activeRace.engine.reset();
    activeRace.camera.reset();
  }
  activeRace.engine.start();
  audioManager.playCountdown();
  updateRaceUi(activeRace);
}

function updateAudioButtons(): void {
  audioToggleButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(audioManager.isMuted));
    button.setAttribute('aria-label', audioManager.isMuted ? 'Unmute game audio' : 'Mute game audio');
    const label = button.querySelector<HTMLElement>('[data-audio-label]');
    if (label) label.textContent = audioManager.isMuted ? 'Sound off' : 'Sound on';
  });
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
audioManager.playBackground();
updateAudioButtons();

audioToggleButtons.forEach((button) => {
  button.addEventListener('click', () => {
    audioManager.toggleMuted();
    updateAudioButtons();
  });
});
skipTrumpetsButton.addEventListener('click', () => audioManager.skipTrumpets());

const setup = new GameSetup(screens.setup, (colors) => void openTrack(colors));
raceControl.addEventListener('click', startOrReplayRace);

document.querySelectorAll<HTMLButtonElement>('[data-start-race]').forEach((button) => {
  button.addEventListener('click', () => {
    audioManager.playBackground();
    showScreen('setup');
    setup.open();
  });
});

document.querySelectorAll<HTMLButtonElement>('[data-home]').forEach((button) => {
  button.addEventListener('click', () => {
    stopTrackAnimation();
    exitFullscreenIfActive();
    audioManager.playBackground();
    showScreen('landing');
  });
});

requireElement<HTMLButtonElement>('[data-back-setup]').addEventListener('click', () => {
  stopTrackAnimation();
  exitFullscreenIfActive();
  audioManager.playBackground();
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
