export const MIN_ARTBOARD_SIZE = 1;
export const MAX_ARTBOARD_SIZE = 16384;

export function validArtboardSize(width: number, height: number): boolean {
  return [width, height].every(value => Number.isFinite(value) && value >= MIN_ARTBOARD_SIZE && value <= MAX_ARTBOARD_SIZE);
}

export function parseArtboardSize(width: string, height: string): {width: number; height: number} | null {
  if (!width.trim() || !height.trim()) return null;
  const size = {width: Number(width), height: Number(height)};
  return validArtboardSize(size.width, size.height) ? size : null;
}
