import { describe, expect, it } from 'vitest';
import { pptxColor } from './export-utils';

describe('PowerPoint color conversion', () => {
  it('expands short RGB colors and returns uppercase six-digit RGB', () => {
    expect(pptxColor('#abc')).toEqual({ color: 'AABBCC', transparency: 0 });
    expect(pptxColor('#a1B2c3')).toEqual({ color: 'A1B2C3', transparency: 0 });
  });
  it('converts CSS alpha from the last channel instead of treating it as RGB', () => {
    expect(pptxColor('#f008')).toEqual({ color: 'FF0000', transparency: 46.6667 });
    expect(pptxColor('#12345680')).toEqual({ color: '123456', transparency: 49.8039 });
    expect(pptxColor('#12345600')).toEqual({ color: '123456', transparency: 100 });
  });
  it('multiplies color alpha by layer opacity and handles transparent', () => {
    expect(pptxColor('#abc', .8)).toEqual({ color: 'AABBCC', transparency: 20 });
    expect(pptxColor('#ffffff80', .5)).toEqual({ color: 'FFFFFF', transparency: 74.902 });
    expect(pptxColor('transparent', .2)).toEqual({ color: '000000', transparency: 100 });
  });
  it('clamps opacity and falls back to black for malformed color data', () => {
    expect(pptxColor('#fff', -1)).toEqual({ color: 'FFFFFF', transparency: 100 });
    expect(pptxColor('#fff', 2)).toEqual({ color: 'FFFFFF', transparency: 0 });
    expect(pptxColor('#fff', NaN)).toEqual({ color: 'FFFFFF', transparency: 0 });
    expect(pptxColor('red; fill:bad()', .5)).toEqual({ color: '000000', transparency: 50 });
  });
});
