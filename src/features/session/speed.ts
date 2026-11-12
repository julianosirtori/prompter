export const MIN_SPEED = 0.8;
export const MAX_SPEED = 1.2;

/** Global speed moves in 5% steps between 80% and 120%. */
export const stepSpeed = (speed: number, direction: 1 | -1): number =>
  Math.min(MAX_SPEED, Math.max(MIN_SPEED, Math.round((speed + direction * 0.05) * 100) / 100));
