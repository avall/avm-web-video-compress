import { describe, expect, it } from 'vitest';
import { applyDocumentLocale, textDirection } from './i18n';

describe('textDirection', () => {
	const cases = [
		{ locale: 'en', expected: 'ltr' },
		{ locale: 'fr', expected: 'ltr' },
		{ locale: 'ko', expected: 'ltr' },
		{ locale: 'ar', expected: 'rtl' },
		{ locale: 'he-IL', expected: 'rtl' },
		{ locale: 'FA', expected: 'rtl' }
	];

	it.each(cases)('$locale', ({ locale, expected }) => {
		expect(textDirection(locale)).toBe(expected);
	});
});

describe('applyDocumentLocale', () => {
	it.each([
		{ locale: 'ar', dir: 'rtl' },
		{ locale: 'ko', dir: 'ltr' }
	])('sets lang and dir for $locale', ({ locale, dir }) => {
		const root = { lang: 'en', dir: 'ltr' };
		applyDocumentLocale(root, locale);
		expect(root).toEqual({ lang: locale, dir });
	});
});
