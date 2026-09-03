import type { HorseColor } from '../assets/assetManifest';
import { SpriteAnimation } from '../animation/SpriteAnimation';

export type HorseMotionState = 'idle' | 'running' | 'finished';

export class Horse {
  public readonly idleAnimation: SpriteAnimation;
  public readonly runAnimation: SpriteAnimation;
  public velocity = 0;
  public finishPlace: number | null = null;
  public finishTime: number | null = null;
  private motionState: HorseMotionState = 'idle';

  public constructor(
    public readonly color: HorseColor,
    public worldX: number,
    public laneIndex: number,
    idleFramesPerSecond: number,
    runFramesPerSecond: number,
  ) {
    this.idleAnimation = new SpriteAnimation(5, idleFramesPerSecond);
    this.runAnimation = new SpriteAnimation(8, runFramesPerSecond);
  }

  public get motion(): HorseMotionState {
    return this.motionState;
  }

  public reset(worldX: number): void {
    this.worldX = worldX;
    this.velocity = 0;
    this.finishPlace = null;
    this.finishTime = null;
    this.motionState = 'idle';
    this.idleAnimation.reset();
    this.runAnimation.reset();
  }

  public startRunning(): void {
    this.motionState = 'running';
    this.runAnimation.reset();
  }

  public finish(place: number, time: number): void {
    this.motionState = 'finished';
    this.velocity = 0;
    this.finishPlace = place;
    this.finishTime = time;
    this.idleAnimation.reset();
  }

  public updateAnimation(deltaSeconds: number): void {
    if (this.motionState === 'running') {
      this.runAnimation.update(deltaSeconds);
      return;
    }

    this.idleAnimation.update(deltaSeconds);
  }
}
