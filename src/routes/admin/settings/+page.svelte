<script lang="ts">
	import { onMount } from 'svelte';

	let settings: Record<string, string> = {};
	let loading = true;
	let saving = false;
	let saved = false;
	let errorMsg = '';

	const labels: Record<string, { label: string; description: string }> = {
		owner_notification_email: { label: 'Owner Notification Email', description: 'Email address that receives order notifications' },
		pickup_address: { label: 'Pickup Address', description: 'Address shown to customers choosing pickup' },
		pickup_times: { label: 'Pickup Times', description: 'Available pickup times (e.g., Monday 4:00 PM, Friday 4:00 PM)' },
		delivery_times: { label: 'Delivery Times', description: 'Local delivery times (e.g., Monday 5:30 PM, Friday 5:30 PM)' },
		bread_lead_days: { label: 'Bread Lead Time (days)', description: 'Minimum days in advance bread must be ordered' },
		bread_delivery_days: { label: 'Bread Delivery Days', description: 'Comma-separated days bread is baked/delivered (e.g., monday,friday)' }
	};

	onMount(async () => {
		const res = await fetch('/api/admin/settings');
		if (res.ok) {
			settings = await res.json();
		} else {
			errorMsg = 'Failed to load settings. Are you logged in?';
		}
		loading = false;
	});

	async function save() {
		saving = true;
		saved = false;
		errorMsg = '';
		const res = await fetch('/api/admin/settings', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(settings)
		});
		if (res.ok) {
			saved = true;
			setTimeout(() => { saved = false; }, 3000);
		} else {
			errorMsg = 'Failed to save settings.';
		}
		saving = false;
	}
</script>

<svelte:head>
	<title>Settings - Admin - Odd Fellow Coffee</title>
</svelte:head>

<section class="mx-auto max-w-screen-xl px-8 py-10">
	<a href="/admin" class="text-sm text-gray-500 hover:text-black">&larr; Back to Dashboard</a>
	<h1 class="mt-4 text-3xl font-bold">Site Settings</h1>

	{#if loading}
		<p class="mt-6 text-gray-500">Loading...</p>
	{:else if errorMsg}
		<p class="mt-6 text-red-500">{errorMsg}</p>
	{:else}
		<div class="mt-6 max-w-lg space-y-6">
			{#each Object.keys(labels) as key}
				<div>
					<label for={key} class="block text-sm font-medium text-gray-700">{labels[key].label}</label>
					<p class="text-xs text-gray-400">{labels[key].description}</p>
					<input
						id={key}
						type="text"
						bind:value={settings[key]}
						class="mt-1 w-full rounded border px-4 py-2"
					/>
				</div>
			{/each}

			{#if errorMsg}<p class="text-sm text-red-500">{errorMsg}</p>{/if}
			<button
				on:click={save}
				disabled={saving}
				class="w-full rounded-full py-2 font-medium text-white transition-colors {saved ? 'bg-green-600' : 'bg-black hover:bg-medium-carmine'} disabled:opacity-50"
			>
				{#if saving}Saving...{:else if saved}Saved!{:else}Save Settings{/if}
			</button>
		</div>
	{/if}
</section>
