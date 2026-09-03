export class SpriteAnimation {
  private currentFrame = 0;
  private elapsedSeconds = 0;

  public constructor(
    public readonly frameCount: number,
    private readonly framesPerSecond: number,
  ) {
    if (frameCount < 1 || framesPerSecond <= 0) {
      throw new Error('Sprite animation values must be positive.');
    }
  }

  public update(deltaSeconds: number): void {
    this.elapsedSeconds += deltaSeconds;
    const frameDuration = 1 / this.framesPerSecond;

    while (this.elapsedSeconds >= frameDuration) {
      this.currentFrame = (this.currentFrame + 1) % this.frameCount;
      this.elapsedSeconds -= frameDuration;
    }
  }

  public get frameIndex(): number {
    return this.currentFrame;
  }
}
