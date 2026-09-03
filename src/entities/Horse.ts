import type { HorseColor } from '../assets/assetManifest';
import { SpriteAnimation } from '../animation/SpriteAnimation';

export class Horse {
  public readonly idleAnimation: SpriteAnimation;

  public constructor(
    public readonly color: HorseColor,
    public x: number,
    public laneIndex: number,
    idleFramesPerSecond: number,
  ) {
    this.idleAnimation = new SpriteAnimation(5, idleFramesPerSecond);
  }

  public update(deltaSeconds: number): void {
    this.idleAnimation.update(deltaSeconds);
  }
}
