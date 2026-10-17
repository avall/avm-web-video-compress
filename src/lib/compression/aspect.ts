import { MAX_CUSTOM_EDGE, type OutputDimensions } from './settings';

const KNOWN_RATIOS = [
	[16, 9],
	[9, 16],
	[4, 3],
	[3, 4],
	[1, 1],
	[21, 9],
	[9, 21],
	[3, 2],
	[2, 3],
	[5, 4],
	[4, 5]
] as const;

/** Wide enough for marketing ratios such as 2560x1080 (64:27) to read as 21:9. */
const RATIO_TOLERANCE = 0.025;

const STANDARD_SHORT_EDGES = [2160, 1440, 1080, 720, 540, 480, 360];

const RESOLUTION_PATTERN = /^(\d+)x(\d+)$/;

const isValidSize = (width: number, height: number): boolean =>
	Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

const toEven = (value: number): number => Math.max(2, Math.round(value / 2) * 2);

/** Parses a "WxH" resolution string, or null when it is not a positive size. */
export const parseResolution = (resolution: string): OutputDimensions | null => {
	const match = RESOLUTION_PATTERN.exec(resolution);
	if (!match) return null;
	const width = Number(match[1]);
	const height = Number(match[2]);
	return isValidSize(width, height) ? { width, height } : null;
};

/** Well-known ratio within tolerance, else the reduced fraction; null for invalid sizes. */
export const aspectLabel = (width: number, height: number): string | null => {
	if (!isValidSize(width, height)) return null;
	const ratio = width / height;
	const known = KNOWN_RATIOS.find(([w, h]) => Math.abs(ratio / (w / h) - 1) <= RATIO_TOLERANCE);
	if (known) return `${known[0]}:${known[1]}`;
	const divisor = gcd(Math.round(width), Math.round(height));
	return `${Math.round(width) / divisor}:${Math.round(height) / divisor}`;
};

/** Standard sizes not larger than the source, keeping its exact ratio and orientation. */
export const suggestedSizes = (width: number, height: number): OutputDimensions[] => {
	if (!isValidSize(width, height)) return [];
	const portrait = height > width;
	const short = Math.min(width, height);
	const long = Math.max(width, height);
	return STANDARD_SHORT_EDGES.filter((edge) => edge <= short)
		.map((edge) => ({ short: edge, long: toEven((edge * long) / short) }))
		.filter((size) => size.long <= MAX_CUSTOM_EDGE)
		.map((size) =>
			portrait ? { width: size.short, height: size.long } : { width: size.long, height: size.short }
		);
};
