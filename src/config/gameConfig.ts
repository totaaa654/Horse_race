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
  race: {
    startLineX: 320,
    startingGap: 24,
    finishLineX: 4800,
    countdownSeconds: 3,
    minimumSpeed: 255,
    maximumSpeed: 330,
    runFramesPerSecond: 10,
    cameraAnchorRatio: 0.38,
    finishLineScreenRatio: 0.78,
  },
} as const;

export const HORSE_LIMITS = {
  minimum: 2,
  maximum: 8,
} as const;
