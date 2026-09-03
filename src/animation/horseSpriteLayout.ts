import type { HorseColor } from '../assets/assetManifest';

export interface SpriteContentBounds {
  top: number;
  bottom: number;
}

// Shared crop for all five normalized idle poses. The extra transparent space
// above and below the measured alpha bounds prevents ears and hooves from being
// lost when a frame is reduced to a small lane with nearest-neighbour scaling.
const NORMALIZED_IDLE_BOUNDS = { top: 272, bottom: 701 } as const;

export const IDLE_CONTENT_BOUNDS: Record<HorseColor, SpriteContentBounds> = {
  red: NORMALIZED_IDLE_BOUNDS,
  orange: NORMALIZED_IDLE_BOUNDS,
  yellow: NORMALIZED_IDLE_BOUNDS,
  green: NORMALIZED_IDLE_BOUNDS,
  blue: NORMALIZED_IDLE_BOUNDS,
  violet: NORMALIZED_IDLE_BOUNDS,
  pink: NORMALIZED_IDLE_BOUNDS,
  cyan: NORMALIZED_IDLE_BOUNDS,
};

export const RUN_CONTENT_BOUNDS: SpriteContentBounds = {
  top: 402,
  bottom: 580,
};
