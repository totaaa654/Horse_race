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
  track: {
    lane: '/assets/scenery/tracks/lane.png',
    topScenery: '/assets/scenery/tracks/top-scenery.png',
    bottomScenery: '/assets/scenery/tracks/bottom-scenery.png',
  },
  horse: (color: HorseColor) => ({
    idle: `/assets/horses/${color}/idle.png?v=idle-atlas-3`,
    run: `/assets/horses/${color}/run.png`,
  }),
} as const;
