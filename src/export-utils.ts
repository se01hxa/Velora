/** Convert the editor's CSS hex colors into PowerPoint's RGB plus transparency model. */
export function pptxColor(value: string, opacity = 1): { color: string; transparency: number } {
  const multiplier = Number.isFinite(opacity) ? Math.max(0, Math.min(1, opacity)) : 1;
  let color = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (color === 'transparent') return { color: '000000', transparency: 100 };
  if (!/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(color)) color = '#000000';
  let hex = color.slice(1);
  if (hex.length <= 4) hex = hex.split('').map(c => c + c).join('');
  const alpha = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
  return { color: hex.slice(0, 6).toUpperCase(), transparency: Math.round((1 - alpha * multiplier) * 1_000_000) / 10_000 };
}
