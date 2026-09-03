export interface GameAssets {
  lane: HTMLImageElement;
  topScenery: HTMLImageElement;
  bottomScenery: HTMLImageElement;
  horseIdle: HTMLImageElement;
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
  horseIdle: string;
}): Promise<GameAssets> {
  const [lane, topScenery, bottomScenery, horseIdle] = await Promise.all([
    loadImage(paths.lane),
    loadImage(paths.topScenery),
    loadImage(paths.bottomScenery),
    loadImage(paths.horseIdle),
  ]);

  return { lane, topScenery, bottomScenery, horseIdle };
}
