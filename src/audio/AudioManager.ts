export interface AudioSources {
  background: string;
  trumpets: string;
  countdown: string;
  victory: string;
}

type AudioName = keyof AudioSources;
type TrumpetsStateListener = (isPlaying: boolean) => void;

const TRACK_VOLUMES: Record<AudioName, number> = {
  background: 0.32,
  trumpets: 0.75,
  countdown: 0.8,
  victory: 0.8,
};

export class AudioManager {
  private readonly tracks: Record<AudioName, HTMLAudioElement>;
  private currentTrack: AudioName | null = null;
  private muted = false;

  public constructor(
    sources: AudioSources,
    private readonly onTrumpetsStateChange: TrumpetsStateListener = () => undefined,
  ) {
    this.tracks = {
      background: this.createAudio(sources.background, 'background', true),
      trumpets: this.createAudio(sources.trumpets, 'trumpets'),
      countdown: this.createAudio(sources.countdown, 'countdown'),
      victory: this.createAudio(sources.victory, 'victory'),
    };

    this.tracks.trumpets.addEventListener('ended', () => {
      if (this.currentTrack === 'trumpets') this.currentTrack = null;
      this.onTrumpetsStateChange(false);
    });

    const unlockAudio = (): void => {
      if (this.currentTrack) void this.tryPlay(this.tracks[this.currentTrack]);
    };
    document.addEventListener('pointerdown', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
  }

  public get isMuted(): boolean {
    return this.muted;
  }

  public toggleMuted(): boolean {
    this.muted = !this.muted;
    Object.values(this.tracks).forEach((track) => {
      track.muted = this.muted;
    });
    if (!this.muted && this.currentTrack) {
      void this.tryPlay(this.tracks[this.currentTrack]);
    }
    return this.muted;
  }

  public playBackground(): void {
    this.switchTo('background', false);
  }

  public playTrumpets(): void {
    this.switchTo('trumpets', true);
    this.onTrumpetsStateChange(true);
  }

  public skipTrumpets(): void {
    if (this.currentTrack !== 'trumpets') return;
    this.pauseAndRewind(this.tracks.trumpets);
    this.currentTrack = null;
    this.onTrumpetsStateChange(false);
  }

  public playCountdown(): void {
    this.switchTo('countdown', true);
  }

  public playVictory(): void {
    this.switchTo('victory', true);
  }

  public stopAll(): void {
    Object.values(this.tracks).forEach((track) => track.pause());
    if (this.currentTrack === 'trumpets') this.onTrumpetsStateChange(false);
    this.currentTrack = null;
  }

  private createAudio(source: string, name: AudioName, loop = false): HTMLAudioElement {
    const audio = new Audio(source);
    audio.loop = loop;
    audio.preload = 'auto';
    audio.volume = TRACK_VOLUMES[name];
    return audio;
  }

  private switchTo(name: AudioName, restart: boolean): void {
    if (this.currentTrack === name && !restart) {
      void this.tryPlay(this.tracks[name]);
      return;
    }

    Object.entries(this.tracks).forEach(([trackName, track]) => {
      if (trackName !== name) track.pause();
    });
    if (this.currentTrack === 'trumpets' && name !== 'trumpets') {
      this.onTrumpetsStateChange(false);
    }

    const track = this.tracks[name];
    if (restart) track.currentTime = 0;
    this.currentTrack = name;
    void this.tryPlay(track);
  }

  private pauseAndRewind(track: HTMLAudioElement): void {
    track.pause();
    track.currentTime = 0;
  }

  private async tryPlay(track: HTMLAudioElement): Promise<void> {
    try {
      await track.play();
    } catch {
      // Browsers can block audio until the first user interaction.
    }
  }
}
