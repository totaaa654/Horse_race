import type { GameAssets } from '../assets/assetLoader';
import { IDLE_CONTENT_BOUNDS } from '../animation/horseSpriteLayout';
import type { Horse } from '../entities/Horse';

interface TrackLayout {
  topHeight: number;
  laneHeight: number;
  bottomHeight: number;
  trackTop: number;
}

const SKY_COLOR = '#2398f5';
const TRACK_DIRT_COLOR = '#c17830';

export class GameRenderer {
  private readonly context: CanvasRenderingContext2D;

  public constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly assets: GameAssets,
    private readonly laneCount: number,
  ) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D rendering is not supported.');
    }

    this.context = context;
    this.context.imageSmoothingEnabled = false;
  }

  public render(horses: readonly Horse[]): void {
    const { width, height } = this.canvas;
    const layout = this.calculateLayout(height);

    this.context.imageSmoothingEnabled = false;
    this.context.clearRect(0, 0, width, height);
    this.context.fillStyle = SKY_COLOR;
    this.context.fillRect(0, 0, width, layout.topHeight);
    this.drawRepeated(this.assets.topScenery, 0, layout.topHeight, width);

    for (let laneIndex = 0; laneIndex < this.laneCount; laneIndex += 1) {
      const laneY = layout.trackTop + laneIndex * layout.laneHeight;
      this.drawRepeated(this.assets.lane, laneY, layout.laneHeight, width);
    }

    const bottomY = layout.trackTop + this.laneCount * layout.laneHeight;
    this.context.fillStyle = TRACK_DIRT_COLOR;
    this.context.fillRect(0, bottomY, width, layout.bottomHeight);
    this.drawRepeated(
      this.assets.bottomScenery,
      bottomY,
      layout.bottomHeight,
      width,
    );

    horses.forEach((horse) => this.drawHorse(horse, layout));
  }

  private calculateLayout(canvasHeight: number): TrackLayout {
    const naturalTotalHeight =
      this.assets.topScenery.height +
      this.assets.lane.height * this.laneCount +
      this.assets.bottomScenery.height;
    const scale = canvasHeight / naturalTotalHeight;
    const topHeight = Math.round(this.assets.topScenery.height * scale);
    const bottomHeight = Math.round(this.assets.bottomScenery.height * scale);
    const laneHeight = Math.floor((canvasHeight - topHeight - bottomHeight) / this.laneCount);

    return { topHeight, laneHeight, bottomHeight, trackTop: topHeight };
  }

  private drawRepeated(
    image: HTMLImageElement,
    y: number,
    destinationHeight: number,
    canvasWidth: number,
  ): void {
    const scale = destinationHeight / image.height;
    const tileWidth = Math.max(1, Math.round(image.width * scale));

    for (let x = 0; x < canvasWidth; x += tileWidth) {
      this.context.drawImage(image, x, y, tileWidth, destinationHeight);
    }
  }

  private drawHorse(horse: Horse, layout: TrackLayout): void {
    const horseIdle = this.assets.horseIdle.get(horse.color);
    if (!horseIdle) {
      return;
    }

    const frameCount = horse.idleAnimation.frameCount;
    const sourceX = Math.floor(
      (horse.idleAnimation.frameIndex * horseIdle.width) / frameCount,
    );
    const nextSourceX = Math.floor(
      ((horse.idleAnimation.frameIndex + 1) * horseIdle.width) / frameCount,
    );
    const sourceWidth = nextSourceX - sourceX;
    const contentBounds = IDLE_CONTENT_BOUNDS[horse.color];
    const sourceHeight = contentBounds.bottom - contentBounds.top;
    const lanePadding = Math.max(3, Math.round(layout.laneHeight * 0.06));
    const maximumHeight = Math.max(1, layout.laneHeight - lanePadding * 2);
    const drawHeight = Math.min(sourceHeight, maximumHeight);
    const drawWidth = Math.max(1, Math.round(sourceWidth * (drawHeight / sourceHeight)));
    const laneTop = layout.trackTop + horse.laneIndex * layout.laneHeight;
    const drawY = laneTop + layout.laneHeight - drawHeight - lanePadding;
    this.context.drawImage(
      horseIdle,
      sourceX,
      contentBounds.top,
      sourceWidth,
      sourceHeight,
      Math.round(horse.x),
      Math.round(drawY),
      drawWidth,
      drawHeight,
    );
  }
}
