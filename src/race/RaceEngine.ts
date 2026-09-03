import type { Horse } from '../entities/Horse';

export type RacePhase = 'ready' | 'countdown' | 'running' | 'finished';

export interface RaceRules {
  startLineX: number;
  startingGap: number;
  finishLineX: number;
  countdownSeconds: number;
  minimumSpeed: number;
  maximumSpeed: number;
}

interface PaceProfile {
  baseSpeed: number;
  targetMultiplier: number;
  rhythmOffset: number;
  secondsUntilChange: number;
}

export class RaceEngine {
  private currentPhase: RacePhase = 'ready';
  private countdown = 0;
  private runningSeconds = 0;
  private goSecondsRemaining = 0;
  private readonly finishers: Horse[] = [];
  private readonly paceProfiles = new Map<Horse, PaceProfile>();

  public constructor(
    private readonly horses: readonly Horse[],
    public readonly rules: RaceRules,
  ) {
    this.reset();
  }

  public get phase(): RacePhase {
    return this.currentPhase;
  }

  public get countdownRemaining(): number {
    return Math.max(0, this.countdown);
  }

  public get elapsedSeconds(): number {
    return this.runningSeconds;
  }

  public get finishOrder(): readonly Horse[] {
    return this.finishers;
  }

  public get leaderX(): number {
    return Math.max(...this.horses.map((horse) => horse.worldX));
  }

  public get announcement(): string | null {
    if (this.currentPhase === 'countdown') {
      return String(Math.max(1, Math.ceil(this.countdown)));
    }
    if (this.currentPhase === 'running' && this.goSecondsRemaining > 0) {
      return 'GO!';
    }
    if (this.currentPhase === 'finished') {
      const winner = this.finishers[0];
      return winner ? `${winner.color.toUpperCase()} WINS!` : 'FINISH!';
    }
    return null;
  }

  public start(): void {
    if (this.currentPhase !== 'ready') return;
    this.countdown = this.rules.countdownSeconds;
    this.currentPhase = 'countdown';
  }

  public reset(): void {
    this.currentPhase = 'ready';
    this.countdown = this.rules.countdownSeconds;
    this.runningSeconds = 0;
    this.goSecondsRemaining = 0;
    this.finishers.length = 0;
    this.paceProfiles.clear();

    for (const horse of this.horses) {
      horse.reset(this.rules.startLineX - this.rules.startingGap);
      this.paceProfiles.set(horse, this.createPaceProfile());
    }
  }

  public update(deltaSeconds: number): void {
    for (const horse of this.horses) {
      horse.updateAnimation(deltaSeconds);
    }

    if (this.currentPhase === 'countdown') {
      this.countdown -= deltaSeconds;
      if (this.countdown <= 0) this.beginRunning();
      return;
    }

    if (this.currentPhase !== 'running') return;

    this.runningSeconds += deltaSeconds;
    this.goSecondsRemaining = Math.max(0, this.goSecondsRemaining - deltaSeconds);
    const frameStartTime = this.runningSeconds - deltaSeconds;

    for (const horse of this.horses) {
      if (horse.motion !== 'running') continue;
      const profile = this.paceProfiles.get(horse);
      if (!profile) continue;

      profile.secondsUntilChange -= deltaSeconds;
      if (profile.secondsUntilChange <= 0) {
        profile.targetMultiplier = 0.86 + Math.random() * 0.3;
        profile.secondsUntilChange = 0.45 + Math.random() * 0.9;
      }

      const rhythm = Math.sin(this.runningSeconds * 2.2 + profile.rhythmOffset) * 0.055;
      const targetSpeed = profile.baseSpeed * (profile.targetMultiplier + rhythm);
      const responsiveness = Math.min(1, deltaSeconds * 2.4);
      horse.velocity += (targetSpeed - horse.velocity) * responsiveness;

      const previousX = horse.worldX;
      horse.worldX += horse.velocity * deltaSeconds;
      if (horse.worldX >= this.rules.finishLineX) {
        const travelledThisFrame = horse.worldX - previousX;
        const crossingRatio = travelledThisFrame > 0
          ? (this.rules.finishLineX - previousX) / travelledThisFrame
          : 1;
        const finishTime = frameStartTime + deltaSeconds * Math.max(0, Math.min(1, crossingRatio));
        horse.worldX = this.rules.finishLineX;
        this.finishers.push(horse);
        horse.finish(this.finishers.length, finishTime);
      }
    }

    if (this.finishers.length === this.horses.length) {
      this.currentPhase = 'finished';
    }
  }

  private beginRunning(): void {
    this.currentPhase = 'running';
    this.countdown = 0;
    this.goSecondsRemaining = 0.75;
    for (const horse of this.horses) horse.startRunning();
  }

  private createPaceProfile(): PaceProfile {
    const speedRange = this.rules.maximumSpeed - this.rules.minimumSpeed;
    return {
      baseSpeed: this.rules.minimumSpeed + Math.random() * speedRange,
      targetMultiplier: 0.92 + Math.random() * 0.16,
      rhythmOffset: Math.random() * Math.PI * 2,
      secondsUntilChange: 0.35 + Math.random() * 0.8,
    };
  }
}
