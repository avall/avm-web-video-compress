<script lang="ts">
	interface Props {
		id: string;
		label: string;
		description: string;
		checked: boolean;
	}

	let { id, label, description, checked = $bindable() }: Props = $props();
</script>

<div class="seg-row">
	<input type="checkbox" role="switch" {id} bind:checked class="switch mt-0.5" />
	<div class="grid min-w-0 gap-1">
		<label for={id} class="cursor-pointer text-sm leading-tight font-bold text-white">{label}</label
		>
		<p class="text-xs leading-relaxed text-dim">{description}</p>
	</div>
</div>
