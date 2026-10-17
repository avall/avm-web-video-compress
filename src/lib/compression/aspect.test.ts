import { describe, expect, it } from 'vitest';
import { aspectLabel, parseResolution, suggestedSizes } from './aspect';

const sizes = (...values: string[]) =>
	values.map((value) => {
		const [width, height] = value.split('x').map(Number);
		return { width, height };
	});

describe('parseResolution', () => {
	it.each([
		{ resolution: '1920x1080', expected: { width: 1920, height: 1080 } },
		{ resolution: '1080x1920', expected: { width: 1080, height: 1920 } },
		{ resolution: '', expected: null },
		{ resolution: 'unknown', expected: null },
		{ resolution: '0x1080', expected: null },
		{ resolution: '1920x', expected: null },
		{ resolution: 'NaNxNaN', expected: null }
	])('parses "$resolution"', ({ resolution, expected }) => {
		expect(parseResolution(resolution)).toEqual(expected);
	});
});

describe('aspectLabel', () => {
	it.each([
		{ width: 1920, height: 1080, expected: '16:9' },
		{ width: 1280, height: 720, expected: '16:9' },
		{ width: 854, height: 480, expected: '16:9' },
		{ width: 3840, height: 2160, expected: '16:9' },
		{ width: 1080, height: 1920, expected: '9:16' },
		{ width: 1440, height: 1080, expected: '4:3' },
		{ width: 1080, height: 1440, expected: '3:4' },
		{ width: 1080, height: 1080, expected: '1:1' },
		{ width: 2560, height: 1080, expected: '21:9' },
		{ width: 1080, height: 2560, expected: '9:21' },
		{ width: 1620, height: 1080, expected: '3:2' },
		{ width: 1280, height: 1024, expected: '5:4' },
		{ width: 1080, height: 1350, expected: '4:5' },
		{ width: 1000, height: 300, expected: '10:3' },
		{ width: 1000, height: 600, expected: '5:3' },
		{ width: 0, height: 1080, expected: null },
		{ width: -1920, height: 1080, expected: null },
		{ width: Number.NaN, height: 1080, expected: null }
	])('labels $width x $height as $expected', ({ width, height, expected }) => {
		expect(aspectLabel(width, height)).toBe(expected);
	});
});

describe('suggestedSizes', () => {
	it.each([
		{
			name: 'landscape 16:9',
			width: 1920,
			height: 1080,
			expected: sizes('1920x1080', '1280x720', '960x540', '854x480', '640x360')
		},
		{
			name: 'portrait 9:16',
			width: 1080,
			height: 1920,
			expected: sizes('1080x1920', '720x1280', '540x960', '480x854', '360x640')
		},
		{
			name: 'square',
			width: 1080,
			height: 1080,
			expected: sizes('1080x1080', '720x720', '540x540', '480x480', '360x360')
		},
		{
			name: '4:3',
			width: 1440,
			height: 1080,
			expected: sizes('1440x1080', '960x720', '720x540', '640x480', '480x360')
		},
		{
			name: '21:9',
			width: 2560,
			height: 1080,
			expected: sizes('2560x1080', '1706x720', '1280x540', '1138x480', '854x360')
		},
		{
			name: '4K keeps the source as the first entry',
			width: 3840,
			height: 2160,
			expected: sizes(
				'3840x2160',
				'2560x1440',
				'1920x1080',
				'1280x720',
				'960x540',
				'854x480',
				'640x360'
			)
		},
		{
			name: 'non-standard source is not repeated',
			width: 1000,
			height: 600,
			expected: sizes('900x540', '800x480', '600x360')
		},
		{
			name: 'long edges above the custom limit are skipped',
			width: 5120,
			height: 2160,
			expected: sizes('3414x1440', '2560x1080', '1706x720', '1280x540', '1138x480', '854x360')
		},
		{ name: 'short edge below 360', width: 1000, height: 300, expected: [] },
		{ name: 'tiny source', width: 320, height: 240, expected: [] },
		{ name: 'zero size', width: 0, height: 0, expected: [] },
		{ name: 'NaN size', width: Number.NaN, height: 720, expected: [] }
	])('$name', ({ width, height, expected }) => {
		expect(suggestedSizes(width, height)).toEqual(expected);
	});
});
