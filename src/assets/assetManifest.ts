export const HORSE_COLORS = [
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'violet',
  'pink',
  'cyan',
] as const;

export type HorseColor = (typeof HORSE_COLORS)[number];

export const assetManifest = {
  audio: {
    background: '/assets/sounds/Kevin MacLeod - Pixelland  NO COPYRIGHT 8-bit Music.mp3',
    trumpets: '/assets/sounds/trumpets.mp3',
    countdown: '/assets/sounds/countdown.mp3',
    victory: '/assets/sounds/Victory Sound Effect.mp3',
  },
  track: {
    lane: '/assets/scenery/tracks/lane.png',
    topScenery: '/assets/scenery/tracks/top-scenery.png',
    bottomScenery: '/assets/scenery/tracks/bottom-scenery.png',
  },
  horse: (color: HorseColor) => ({
    idle: `/assets/horses/${color}/idle.png?v=idle-atlas-3`,
    run: `/assets/horses/${color}/run.png?v=run-atlas-5`,
  }),
} as const;
