import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { textDirection } from '$lib/i18n';
import { crossOriginIsolationHeaders } from '../isolation-headers.js';

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html.replace('%paraglide.lang%', locale).replace('%paraglide.dir%', textDirection(locale))
		});
	});

const handleFFmpeg: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	for (const [name, value] of Object.entries(crossOriginIsolationHeaders)) {
		response.headers.set(name, value);
	}

	return response;
};

export const handle: Handle = sequence(handleParaglide, handleFFmpeg);
