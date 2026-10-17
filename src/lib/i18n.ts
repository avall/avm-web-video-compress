const RIGHT_TO_LEFT_LANGUAGES = new Set([
	'ar',
	'dv',
	'fa',
	'he',
	'ku',
	'ps',
	'sd',
	'ug',
	'ur',
	'yi'
]);

export type TextDirection = 'ltr' | 'rtl';

export const textDirection = (locale: string): TextDirection =>
	RIGHT_TO_LEFT_LANGUAGES.has(locale.split('-')[0].toLowerCase()) ? 'rtl' : 'ltr';

/** Mirrors the active locale on the document root, since static hosting has no server to do it. */
export const applyDocumentLocale = (root: { lang: string; dir: string }, locale: string): void => {
	root.lang = locale;
	root.dir = textDirection(locale);
};
