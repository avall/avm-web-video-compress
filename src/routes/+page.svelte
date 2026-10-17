<script lang="ts">
	import { onMount } from 'svelte';
	import { asset } from '$app/paths';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import Loader from '@lucide/svelte/icons/loader-circle';
	import FileVideo from '@lucide/svelte/icons/file-video';
	import * as m from '$lib/paraglide/messages.js';
	import AdvancedSettings from '$lib/components/compression/advanced-settings.svelte';
	import TargetPicker from '$lib/components/compression/target-picker.svelte';
	import {
		DEFAULT_SELECTION,
		resolveTarget,
		restoreSelection,
		serializeSelection,
		type TargetSelection
	} from '$lib/compression/presets';
	import ResultsCard, {
		type CompressionResult
	} from '$lib/components/compression/results-card.svelte';
	import type { TrimOptions } from '$lib/compression/args';
	import { ENGINE_NAMES, type Engine } from '$lib/compression/engine';
	import { MAX_ENCODE_ATTEMPTS } from '$lib/compression/target';
	import {
		createCompressor,
		outputFileName,
		requiredTargetSize,
		validateVideoFile,
		type VideoAnalysis
	} from '$lib/compression/compressor';
	import {
		estimateRemainingSeconds,
		formatDuration,
		formatFileSize,
		formatTimeRemaining
	} from '$lib/format';
	import { carriesFiles, nextDragDepth } from '$lib/file-drop';

	let ffmpegLoading = $state(false);
	let isAnalyzing = $state(false);
	let analysis = $state<VideoAnalysis | null>(null);
	let activeEngine = $state<Engine | null>(null);
	let isProcessing = $state(false);
	let progress = $state(0);
	let encodeAttempt = $state(0);
	let selectedFile = $state<File | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);
	let dragDepth = $state(0);
	let result = $state<CompressionResult | null>(null);
	let errorMessage = $state('');
	let startTime = $state<number>(0);
	let estimatedTimeRemaining = $state<number>(0);
	let muteSound = $state(false);
	let audioOnlyMode = $state(false);
	let preserveOriginalFps = $state(false);
	let trimVideo = $state(false);
	let skipFirstSeconds = $state(0);
	let skipLastSeconds = $state(0);
	let customDimensions = $state(false);
	let outputWidth = $state<number | null>(null);
	let outputHeight = $state<number | null>(null);

	const TARGET_STORAGE_KEY = 'target';
	const LEGACY_TARGET_STORAGE_KEY = 'targetSize';

	let targetSelection = $state<TargetSelection>(DEFAULT_SELECTION);
	const target = $derived(resolveTarget(targetSelection));

	onMount(() => {
		try {
			targetSelection = restoreSelection(
				localStorage.getItem(TARGET_STORAGE_KEY),
				localStorage.getItem(LEGACY_TARGET_STORAGE_KEY)
			);
		} catch (e) {}
		return () => void compressor.dispose();
	});

	const resetProgress = (): void => {
		progress = 0;
		startTime = Date.now();
		estimatedTimeRemaining = 0;
	};

	const compressor = createCompressor({
		onProgress: (percent) => {
			progress = percent;
			estimatedTimeRemaining =
				estimateRemainingSeconds(percent, startTime, Date.now()) ?? estimatedTimeRemaining;
		},
		onEncodeStart: ({ engine, attempt }) => {
			activeEngine = engine;
			encodeAttempt = attempt;
			resetProgress();
		},
		onFFmpegLoading: (loading) => (ffmpegLoading = loading)
	});

	const videoMetadata = $derived(analysis?.metadata ?? null);

	const currentTrim = $derived<TrimOptions>({
		enabled: trimVideo,
		skipFirstSeconds,
		skipLastSeconds
	});

	const minimumSize = $derived(
		videoMetadata ? requiredTargetSize(videoMetadata, currentTrim, muteSound) : 0
	);

	const isTargetUnreachable = $derived(!audioOnlyMode && !!target && minimumSize > target.bytes);

	const isFileSmallerThanTarget = $derived(
		!!target && !!selectedFile && selectedFile.size < target.bytes
	);

	let analysisId = 0;

	const analyzeFile = async (file: File): Promise<void> => {
		const id = ++analysisId;
		analysis = null;
		isAnalyzing = true;
		try {
			const result = await compressor.analyze(file);
			if (id !== analysisId) return;
			if (!result) {
				errorMessage = m.select_valid_video();
				return;
			}
			analysis = result;
		} catch (error) {
			console.error('Failed to analyze video:', error);
			if (id === analysisId) {
				errorMessage = 'Could not read this video. Please try again or refresh the page.';
			}
		} finally {
			if (id === analysisId) {
				isAnalyzing = false;
			}
		}
	};

	const selectFile = (file: File | undefined): boolean => {
		const validation = file ? validateVideoFile(file) : 'unsupported_type';

		if (!file || validation === 'unsupported_type') {
			errorMessage = m.select_valid_video();
			return false;
		}
		if (validation === 'too_large') {
			errorMessage = m.file_size_limit_error();
			return false;
		}

		selectedFile = file;
		errorMessage = '';
		result = null;
		analyzeFile(file);
		return true;
	};

	const handleFileSelect = (event: Event): void => {
		const input = event.currentTarget;
		if (!(input instanceof HTMLInputElement)) return;
		if (!selectFile(input.files?.[0])) {
			input.value = '';
		}
	};

	const handleDragEnter = (event: DragEvent): void => {
		if (!carriesFiles(event.dataTransfer?.types)) return;
		event.preventDefault();
		dragDepth = nextDragDepth(dragDepth, 'enter');
	};

	const handleDragOver = (event: DragEvent): void => {
		if (!carriesFiles(event.dataTransfer?.types)) return;
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = isProcessing ? 'none' : 'copy';
		}
	};

	const handleDragLeave = (event: DragEvent): void => {
		if (!carriesFiles(event.dataTransfer?.types)) return;
		dragDepth = nextDragDepth(dragDepth, 'leave');
	};

	const handleDrop = (event: DragEvent): void => {
		if (!carriesFiles(event.dataTransfer?.types)) return;
		event.preventDefault();
		dragDepth = nextDragDepth(dragDepth, 'drop');
		const file = event.dataTransfer?.files[0];
		if (isProcessing || !file) return;
		if (selectFile(file) && fileInput) {
			const selection = new DataTransfer();
			selection.items.add(file);
			fileInput.files = selection.files;
		}
	};

	const compressVideo = async (): Promise<void> => {
		if (!selectedFile || !analysis || isAnalyzing || isTargetUnreachable) return;
		if (!target && !audioOnlyMode) return;

		isProcessing = true;
		encodeAttempt = 0;
		errorMessage = '';
		resetProgress();
		const metadata = analysis.metadata;
		const targetSize = target?.bytes ?? analysis.metadata.size;

		try {
			const outcome = await compressor.compress({
				file: selectedFile,
				analysis,
				targetSize,
				audioOnly: audioOnlyMode,
				muteSound,
				preserveOriginalFps,
				trim: currentTrim,
				dimensions: customDimensions
					? { width: outputWidth ?? 0, height: outputHeight ?? 0 }
					: undefined
			});
			result = {
				data: outcome.data,
				fileName: selectedFile.name,
				originalSize: metadata.size,
				fileTag: target?.fileTag ?? 'audio',
				targetMet: outcome.targetMet,
				audioOnly: audioOnlyMode,
				muteSound
			};
		} catch (error) {
			console.error('Compression failed:', error);
			errorMessage = 'Video compression failed. Please try again with different settings.';
		} finally {
			isProcessing = false;
			activeEngine = null;
			progress = 0;
			encodeAttempt = 0;
			startTime = 0;
			estimatedTimeRemaining = 0;
		}
	};

	const downloadVideo = (): void => {
		if (!result) return;

		const blob = new Blob([new Uint8Array(result.data)], { type: 'video/mp4' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.download = outputFileName({
			fileName: result.fileName,
			audioOnly: result.audioOnly,
			muteSound: result.muteSound,
			fileTag: result.fileTag
		});
		anchor.href = url;
		document.body.appendChild(anchor);
		anchor.click();
		document.body.removeChild(anchor);
		URL.revokeObjectURL(url);
	};

	const handleTargetChange = (selection: TargetSelection): void => {
		targetSelection = selection;
		try {
			localStorage.setItem(TARGET_STORAGE_KEY, serializeSelection(selection));
			localStorage.removeItem(LEGACY_TARGET_STORAGE_KEY);
		} catch (error) {
			console.warn('Could not save the target preference:', error);
		}
	};
</script>

<svelte:head>
	<title>{m.app_title()} - {m.app_subtitle()}</title>
	<meta name="description" content={m.app_subtitle()} />
	<meta name="theme-color" content="#07090d" />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content="{m.app_title()} - {m.app_subtitle()}" />
	<meta property="og:description" content={m.app_subtitle()} />
	<meta property="og:image" content={asset('/og.png')} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="compress.lol logo and name" />

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="{m.app_title()} - {m.app_subtitle()}" />
	<meta name="twitter:description" content={m.app_subtitle()} />
	<meta name="twitter:image" content={asset('/og.png')} />
</svelte:head>

<svelte:window
	ondragenter={handleDragEnter}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
/>

{#if dragDepth > 0 && !isProcessing}
	<div
		class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm"
	>
		<div
			class="rounded-[24px] border-2 border-dashed border-primary bg-accent px-10 py-8 text-center font-display text-2xl font-bold text-white"
		>
			{m.drop_video_here()}
		</div>
	</div>
{/if}

<div class="container-page">
	<section class="hero">
		<p class="eyebrow">{m.hero_eyebrow()}</p>
		<h1>{m.hero_title()}</h1>
		<p class="lead">{m.hero_lead()}</p>
	</section>

	{#if ffmpegLoading || isAnalyzing}
		<div class="mb-6 flex items-center justify-center gap-2" role="status">
			<Loader class="h-5 w-5 animate-spin text-primary" />
			<span class="text-sm text-muted-foreground">{m.loading()}</span>
		</div>
	{/if}

	{#if errorMessage}
		<Alert.Root variant="destructive" class="mb-6">
			<Alert.Description>{errorMessage}</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="tool">
		<Card.Root>
			<Card.Header>
				<Card.Title>{m.upload_video()}</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-5">
				<label for="video-upload" class="dropzone" data-dragging={dragDepth > 0 && !isProcessing}>
					<FileVideo class="mb-1 h-8 w-8 text-primary" aria-hidden="true" />
					<span class="font-display text-base font-bold break-all text-white">
						{selectedFile ? selectedFile.name : m.choose_video_file()}
					</span>
					<span class="text-sm text-muted-foreground">
						{selectedFile ? formatFileSize(selectedFile.size) : m.upload_description()}
					</span>
					<input
						id="video-upload"
						bind:this={fileInput}
						type="file"
						accept="video/*"
						onchange={handleFileSelect}
						disabled={isProcessing}
						class="sr-only"
					/>
				</label>

				{#if videoMetadata}
					<div class="space-y-2">
						<h4 class="tool-label">{m.video_information()}</h4>
						<div class="grid grid-cols-2 gap-2 rounded-[12px] border bg-section p-3 text-sm">
							<div>
								<span class="text-dim">{m.duration()}:</span>
								{formatDuration(videoMetadata.duration)}
							</div>
							<div><span class="text-dim">{m.resolution()}:</span> {videoMetadata.resolution}</div>
							<div>
								<span class="text-dim">{m.size()}:</span>
								{formatFileSize(videoMetadata.size)}
							</div>
							<div><span class="text-dim">FPS:</span> {videoMetadata.fps}</div>
							<div class="col-span-2">
								<span class="text-dim">{m.motion_level()}:</span>
								<Badge variant={videoMetadata.hasMotion ? 'destructive' : 'secondary'}>
									{videoMetadata.hasMotion ? m.high_motion() : m.low_motion()}
								</Badge>
							</div>
						</div>
					</div>
				{/if}

				<TargetPicker selection={targetSelection} onchange={handleTargetChange} />

				<AdvancedSettings
					bind:audioOnlyMode
					bind:muteSound
					bind:preserveOriginalFps
					bind:trimVideo
					bind:skipFirstSeconds
					bind:skipLastSeconds
					bind:customDimensions
					bind:outputWidth
					bind:outputHeight
				/>

				{#if isFileSmallerThanTarget}
					<Alert.Root class="border-yellow-400/40 bg-yellow-400/10 text-yellow-100">
						<Alert.Description>{m.small_video_warning()}</Alert.Description>
					</Alert.Root>
				{/if}

				{#if isTargetUnreachable}
					<Alert.Root variant="destructive">
						<Alert.Description>
							{m.target_unreachable_error({ minimum: formatFileSize(minimumSize) })}
						</Alert.Description>
					</Alert.Root>
				{/if}

				<Button
					onclick={compressVideo}
					disabled={!selectedFile ||
						!videoMetadata ||
						(!target && !audioOnlyMode) ||
						isAnalyzing ||
						isProcessing ||
						isTargetUnreachable}
					class="w-full"
				>
					{#if isProcessing}
						{audioOnlyMode ? m.processing_audio() : m.compressing()}
					{:else}
						{audioOnlyMode ? m.process_audio_only() : m.compress_video()}
					{/if}
				</Button>

				{#if isProcessing && activeEngine === 'ffmpeg' && !audioOnlyMode}
					<Alert.Root>
						<Alert.Description>{m.slow_engine_notice()}</Alert.Description>
					</Alert.Root>
				{/if}

				{#if isProcessing && progress > 0}
					<div class="space-y-2">
						<div class="flex justify-between text-sm font-bold">
							<span>
								{m.progress()}
								{#if encodeAttempt > 1}
									({encodeAttempt}/{MAX_ENCODE_ATTEMPTS})
								{/if}
							</span>
							<div class="flex items-center gap-2">
								<span>{progress}%</span>
								{#if estimatedTimeRemaining > 0}
									<span class="text-dim">• ~{formatTimeRemaining(estimatedTimeRemaining)}</span>
								{/if}
							</div>
						</div>
						<Progress value={progress} class="w-full" />
						{#if activeEngine}
							<p class="text-center text-xs text-dim">
								{m.encoding_with({ engine: ENGINE_NAMES[activeEngine] })}
							</p>
						{/if}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<ResultsCard audioOnly={audioOnlyMode} {result} onDownload={downloadVideo} />
	</div>

	<section class="mt-12 space-y-6" aria-labelledby="how-it-works">
		<h2 id="how-it-works" class="text-center text-3xl leading-tight">{m.how_it_works()}</h2>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<div class="mini-card text-sm leading-relaxed">
				<span aria-hidden="true">🎯</span> <strong class="text-white">{m.how_target_size()}</strong>
			</div>
			<div class="mini-card text-sm leading-relaxed">
				<span aria-hidden="true">🚀</span>
				<strong class="text-white">{m.how_motion_detection()}</strong>
			</div>
			<div class="mini-card text-sm leading-relaxed">
				<span aria-hidden="true">⚡</span>
				<strong class="text-white">{m.how_lightning_fast()}</strong>
			</div>
		</div>
		<p class="text-center text-sm text-muted-foreground">{m.how_perfect_for()}</p>
	</section>
</div>
