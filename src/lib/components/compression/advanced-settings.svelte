<script lang="ts">
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import Settings from '@lucide/svelte/icons/settings';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import * as m from '$lib/paraglide/messages.js';
	import SettingToggle from './setting-toggle.svelte';
	import { MAX_CUSTOM_EDGE } from '$lib/compression/settings';

	interface Props {
		audioOnlyMode: boolean;
		muteSound: boolean;
		preserveOriginalFps: boolean;
		trimVideo: boolean;
		skipFirstSeconds: number;
		skipLastSeconds: number;
		customDimensions: boolean;
		outputWidth: number | null;
		outputHeight: number | null;
	}

	let {
		audioOnlyMode = $bindable(),
		muteSound = $bindable(),
		preserveOriginalFps = $bindable(),
		trimVideo = $bindable(),
		skipFirstSeconds = $bindable(),
		skipLastSeconds = $bindable(),
		customDimensions = $bindable(),
		outputWidth = $bindable(),
		outputHeight = $bindable()
	}: Props = $props();

	let open = $state(false);
</script>

<div class="rounded-[14px] border bg-section">
	<button
		onclick={() => (open = !open)}
		type="button"
		aria-expanded={open}
		class="flex w-full items-center justify-between rounded-[14px] p-3 text-start transition-colors hover:bg-accent/50"
	>
		<div class="flex items-center gap-2">
			<Settings class="h-4 w-4 text-primary" />
			<span class="tool-label">{m.advanced_settings()}</span>
		</div>
		<ChevronDown
			class="h-4 w-4 text-muted-foreground transition-transform duration-200 {open
				? 'rotate-180'
				: ''}"
		/>
	</button>

	<div
		class="grid transition-[grid-template-rows] duration-300 ease-in-out {open
			? 'grid-rows-[1fr]'
			: 'grid-rows-[0fr]'}"
	>
		<div class="overflow-hidden">
			<div class="space-y-2 border-t p-3">
				<SettingToggle
					id="audio-only-mode"
					label={m.audio_only_mode()}
					description={m.audio_only_mode_description()}
					bind:checked={audioOnlyMode}
				/>
				<SettingToggle
					id="mute-sound"
					label={m.mute_sound()}
					description={m.mute_sound_description()}
					bind:checked={muteSound}
				/>
				<SettingToggle
					id="preserve-original-fps"
					label={m.preserve_original_fps()}
					description={m.preserve_original_fps_description()}
					bind:checked={preserveOriginalFps}
				/>
				<div class="flex flex-col space-y-2">
					<SettingToggle
						id="trim-video"
						label={m.trim_video()}
						description={m.trim_video_description()}
						bind:checked={trimVideo}
					/>

					{#if trimVideo}
						<div class="grid grid-cols-2 gap-3 ps-12 pe-3 pb-1">
							<div class="space-y-1.5">
								<Label for="skip-first" class="text-xs text-muted-foreground"
									>{m.skip_first_seconds()}</Label
								>
								<Input
									id="skip-first"
									type="number"
									min="0"
									bind:value={skipFirstSeconds}
									class="h-8 text-sm"
								/>
							</div>
							<div class="space-y-1.5">
								<Label for="skip-last" class="text-xs text-muted-foreground"
									>{m.skip_last_seconds()}</Label
								>
								<Input
									id="skip-last"
									type="number"
									min="0"
									bind:value={skipLastSeconds}
									class="h-8 text-sm"
								/>
							</div>
						</div>
					{/if}
				</div>
				<div class="flex flex-col space-y-2">
					<SettingToggle
						id="custom-dimensions"
						label={m.custom_dimensions()}
						description={m.custom_dimensions_description()}
						bind:checked={customDimensions}
					/>

					{#if customDimensions}
						<div class="grid grid-cols-2 gap-3 ps-12 pe-3 pb-1">
							<div class="space-y-1.5">
								<Label for="output-width" class="text-xs text-muted-foreground"
									>{m.output_width()}</Label
								>
								<Input
									id="output-width"
									type="number"
									min="0"
									max={MAX_CUSTOM_EDGE}
									placeholder={m.dimension_auto()}
									bind:value={outputWidth}
									class="h-8 text-sm"
								/>
							</div>
							<div class="space-y-1.5">
								<Label for="output-height" class="text-xs text-muted-foreground"
									>{m.output_height()}</Label
								>
								<Input
									id="output-height"
									type="number"
									min="0"
									max={MAX_CUSTOM_EDGE}
									placeholder={m.dimension_auto()}
									bind:value={outputHeight}
									class="h-8 text-sm"
								/>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
