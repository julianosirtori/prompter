/** Touch-first device (phone or tablet), where gestures replace the keyboard. */
export const isTouchDevice = (): boolean => window.matchMedia('(pointer: coarse)').matches;
