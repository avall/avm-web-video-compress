import cloudflare from '@sveltejs/adapter-cloudflare';
import node from '@sveltejs/adapter-node';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const adapters = {
	node: () => node(),
	cloudflare: () => cloudflare(),
	static: () => adapterStatic({ pages: 'build', assets: 'build', fallback: '404.html' })
};

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		adapter: (adapters[process.env.ADAPTER] ?? adapters.static)(),
		paths: {
			base: process.env.BASE_PATH ?? ''
		}
	}
};

export default config;
