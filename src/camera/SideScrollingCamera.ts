export interface CameraSettings {
  anchorRatio: number;
  finishLineScreenRatio: number;
}

export class SideScrollingCamera {
  private positionX = 0;

  public constructor(private readonly settings: CameraSettings) {}

  public get x(): number {
    return this.positionX;
  }

  public reset(): void {
    this.positionX = 0;
  }

  public update(
    focusWorldX: number,
    finishLineWorldX: number,
    viewportWidth: number,
    deltaSeconds: number,
    shouldFollow: boolean,
  ): void {
    if (!shouldFollow) return;

    const anchorX = viewportWidth * this.settings.anchorRatio;
    const finalCameraX = Math.max(
      0,
      finishLineWorldX - viewportWidth * this.settings.finishLineScreenRatio,
    );
    const desiredX = Math.min(Math.max(0, focusWorldX - anchorX), finalCameraX);
    const forwardOnlyTarget = Math.max(this.positionX, desiredX);
    const smoothing = 1 - Math.exp(-5.5 * deltaSeconds);
    this.positionX += (forwardOnlyTarget - this.positionX) * smoothing;

    if (Math.abs(forwardOnlyTarget - this.positionX) < 0.1) {
      this.positionX = forwardOnlyTarget;
    }
  }
}
