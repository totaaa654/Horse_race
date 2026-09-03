import type { GameAssets } from '../assets/assetLoader';
import { IDLE_CONTENT_BOUNDS, RUN_CONTENT_BOUNDS } from '../animation/horseSpriteLayout';
import type { Horse } from '../entities/Horse';

interface TrackLayout {
  topHeight: number;
  laneHeight: number;
  bottomHeight: number;
  trackTop: number;
}

const SKY_COLOR = '#2398f5';
const TRACK_DIRT_COLOR = '#c17830';

export interface RaceRenderState {
  cameraX: number;
  startLineX: number;
  finishLineX: number;
  announcement: string | null;
}

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

  public render(horses: readonly Horse[], state: RaceRenderState): void {
    const { width, height } = this.canvas;
    const layout = this.calculateLayout(height);

    this.context.imageSmoothingEnabled = false;
    this.context.clearRect(0, 0, width, height);
    this.context.fillStyle = SKY_COLOR;
    this.context.fillRect(0, 0, width, layout.topHeight);
    this.drawRepeated(
      this.assets.topScenery,
      0,
      layout.topHeight,
      width,
      state.cameraX * 0.22,
    );

    for (let laneIndex = 0; laneIndex < this.laneCount; laneIndex += 1) {
      const laneY = layout.trackTop + laneIndex * layout.laneHeight;
      this.drawRepeated(this.assets.lane, laneY, layout.laneHeight, width, state.cameraX);
    }

    const bottomY = layout.trackTop + this.laneCount * layout.laneHeight;
    this.context.fillStyle = TRACK_DIRT_COLOR;
    this.context.fillRect(0, bottomY, width, layout.bottomHeight);
    this.drawRepeated(
      this.assets.bottomScenery,
      bottomY,
      layout.bottomHeight,
      width,
      state.cameraX,
    );

    this.drawStartLine(state.startLineX - state.cameraX, layout);
    this.drawFinishLine(state.finishLineX - state.cameraX, layout);
    horses.forEach((horse) => this.drawHorse(horse, layout, state.cameraX));
    if (state.announcement) this.drawAnnouncement(state.announcement);
  }

  private calculateLayout(canvasHeight: number): TrackLayout {
    const naturalTotalHeight =
      this.assets.topScenery.height +
      this.assets.lane.height * this.laneCount +
      this.assets.bottomScenery.height;
    const scale = canvasHeight / naturalTotalHeight;
    const topHeight = Math.round(this.assets.topScenery.height * scale);
    const scaledBottomHeight = Math.round(this.assets.bottomScenery.height * scale);
    const laneHeight = Math.floor(
      (canvasHeight - topHeight - scaledBottomHeight) / this.laneCount,
    );
    const bottomHeight = canvasHeight - topHeight - laneHeight * this.laneCount;

    return { topHeight, laneHeight, bottomHeight, trackTop: topHeight };
  }

  private drawRepeated(
    image: HTMLImageElement,
    y: number,
    destinationHeight: number,
    canvasWidth: number,
    worldOffsetX: number,
  ): void {
    const scale = destinationHeight / image.height;
    const tileWidth = Math.max(1, Math.round(image.width * scale));
    const offsetX = Math.round(((worldOffsetX % tileWidth) + tileWidth) % tileWidth);

    for (let x = -offsetX; x < canvasWidth; x += tileWidth) {
      this.context.drawImage(image, x, y, tileWidth, destinationHeight);
    }
  }

  private drawHorse(horse: Horse, layout: TrackLayout, cameraX: number): void {
    const isRunning = horse.motion === 'running';
    const sprite = isRunning
      ? this.assets.horseRun.get(horse.color)
      : this.assets.horseIdle.get(horse.color);
    if (!sprite) return;

    const animation = isRunning ? horse.runAnimation : horse.idleAnimation;
    const frameCount = animation.frameCount;
    const sourceX = Math.floor(
      (animation.frameIndex * sprite.width) / frameCount,
    );
    const nextSourceX = Math.floor(
      ((animation.frameIndex + 1) * sprite.width) / frameCount,
    );
    const sourceWidth = nextSourceX - sourceX;
    const contentBounds = isRunning ? RUN_CONTENT_BOUNDS : IDLE_CONTENT_BOUNDS[horse.color];
    const sourceHeight = contentBounds.bottom - contentBounds.top;
    const lanePadding = Math.max(3, Math.round(layout.laneHeight * 0.06));
    const maximumHeight = Math.max(1, layout.laneHeight - lanePadding * 2);
    const drawHeight = Math.min(sourceHeight, maximumHeight);
    const drawWidth = Math.max(1, Math.round(sourceWidth * (drawHeight / sourceHeight)));
    const laneTop = layout.trackTop + horse.laneIndex * layout.laneHeight;
    const drawY = laneTop + layout.laneHeight - drawHeight - lanePadding;
    const screenFrontX = horse.worldX - cameraX;
    const drawX = Math.round(screenFrontX - drawWidth * 0.92);
    if (drawX > this.canvas.width || drawX + drawWidth < 0) return;
    this.context.drawImage(
      sprite,
      sourceX,
      contentBounds.top,
      sourceWidth,
      sourceHeight,
      drawX,
      Math.round(drawY),
      drawWidth,
      drawHeight,
    );
  }

  private drawStartLine(screenX: number, layout: TrackLayout): void {
    const lineWidth = Math.max(5, Math.round(layout.laneHeight * 0.1));
    if (screenX < -lineWidth || screenX > this.canvas.width + lineWidth) return;
    const trackHeight = layout.laneHeight * this.laneCount;
    this.context.fillStyle = '#fff8e9';
    this.context.fillRect(Math.round(screenX - lineWidth / 2), layout.trackTop, lineWidth, trackHeight);
    this.context.fillStyle = '#f4bc32';
    this.context.fillRect(Math.round(screenX - 1), layout.trackTop, 2, trackHeight);
    this.drawMarkerLabel('START', screenX, layout.trackTop, '#f4bc32');
  }

  private drawFinishLine(screenX: number, layout: TrackLayout): void {
    const tileSize = Math.max(4, Math.round(layout.laneHeight * 0.12));
    const lineWidth = tileSize * 2;
    if (screenX < -lineWidth || screenX > this.canvas.width + lineWidth) return;
    const trackHeight = layout.laneHeight * this.laneCount;
    const left = Math.round(screenX - lineWidth / 2);

    for (let y = 0; y < trackHeight; y += tileSize) {
      for (let column = 0; column < 2; column += 1) {
        const row = Math.floor(y / tileSize);
        this.context.fillStyle = (row + column) % 2 === 0 ? '#fff8e9' : '#26170f';
        this.context.fillRect(
          left + column * tileSize,
          layout.trackTop + y,
          tileSize,
          Math.min(tileSize, trackHeight - y),
        );
      }
    }
    this.drawMarkerLabel('FINISH', screenX, layout.trackTop, '#fff8e9');
  }

  private drawMarkerLabel(
    label: string,
    screenX: number,
    trackTop: number,
    background: string,
  ): void {
    const fontSize = Math.max(8, Math.min(14, Math.round(this.canvas.height * 0.022)));
    this.context.font = `900 ${fontSize}px "Courier New", monospace`;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'top';
    const labelWidth = Math.ceil(this.context.measureText(label).width) + 10;
    const labelX = Math.round(screenX - labelWidth / 2);
    this.context.fillStyle = background;
    this.context.fillRect(labelX, trackTop + 3, labelWidth, fontSize + 6);
    this.context.fillStyle = '#26170f';
    this.context.fillText(label, Math.round(screenX), trackTop + 6);
  }

  private drawAnnouncement(message: string): void {
    const fontSize = Math.max(30, Math.min(76, Math.round(this.canvas.height * 0.13)));
    this.context.font = `900 ${fontSize}px "Courier New", monospace`;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    this.context.fillStyle = '#26170f';
    this.context.fillText(message, this.canvas.width / 2 + 4, this.canvas.height / 2 + 4);
    this.context.fillStyle = '#f4bc32';
    this.context.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
  }
}
