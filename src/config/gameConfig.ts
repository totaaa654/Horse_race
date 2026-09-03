export const GAME_CONFIG = {
  canvas: {
    width: 960,
    height: 540,
  },
  preview: {
    laneCount: 3,
    horseLaneIndex: 1,
    horseX: 250,
    idleFramesPerSecond: 2,
  },
} as const;

export const HORSE_LIMITS = {
  minimum: 2,
  maximum: 8,
} as const;
