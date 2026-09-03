import type { HorseColor } from './assetManifest';

export interface GameAssets {
  lane: HTMLImageElement;
  topScenery: HTMLImageElement;
  bottomScenery: HTMLImageElement;
  horseIdle: ReadonlyMap<HorseColor, HTMLImageElement>;
  horseRun: ReadonlyMap<HorseColor, HTMLImageElement>;
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image), { once: true });
    image.addEventListener(
      'error',
      () => reject(new Error(`Could not load image: ${source}`)),
      { once: true },
    );
    image.src = source;
  });
}

export async function loadGameAssets(paths: {
  lane: string;
  topScenery: string;
  bottomScenery: string;
  horses: ReadonlyArray<{ color: HorseColor; idle: string; run: string }>;
}): Promise<GameAssets> {
  const [lane, topScenery, bottomScenery, horseImages] = await Promise.all([
    loadImage(paths.lane),
    loadImage(paths.topScenery),
    loadImage(paths.bottomScenery),
    Promise.all(
      paths.horses.map(async ({ color, idle, run }) => ({
        color,
        idle: await loadImage(idle),
        run: await loadImage(run),
      })),
    ),
  ]);

  return {
    lane,
    topScenery,
    bottomScenery,
    horseIdle: new Map(horseImages.map(({ color, idle }) => [color, idle])),
    horseRun: new Map(horseImages.map(({ color, run }) => [color, run])),
  };
}
