<script lang="ts">
	import '../app.css';
	import { asset, resolve } from '$app/paths';
	import { getLocale } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages.js';
	import { applyDocumentLocale } from '$lib/i18n';
	import LanguageSelector from '$lib/components/ui/selector/language-selector.svelte';
	import BrandLogo from '$lib/components/brand-logo.svelte';

	let { children } = $props();

	$effect(() => applyDocumentLocale(document.documentElement, getLocale()));
</script>

<svelte:head>
	<link rel="icon" href={asset('/favicon.ico')} sizes="32x32" />
	<link rel="icon" href={asset('/favicon.svg')} type="image/svg+xml" />
	<link rel="apple-touch-icon" href={asset('/apple-touch-icon.png')} />
</svelte:head>

<header class="site-header">
	<div class="container-page">
		<a class="brand" href={resolve('/')}>
			<span class="brand-mark"><BrandLogo /></span>
			<span class="truncate">{m.app_title()}</span>
		</a>
		<LanguageSelector />
	</div>
</header>

<main>
	{@render children?.()}
</main>

<footer class="site-footer">
	<div class="container-page space-y-2 text-center">
		<p>{@html m.footer_text()}</p>
		<p class="text-dim">{m.footer_subtext()}</p>
	</div>
</footer>
