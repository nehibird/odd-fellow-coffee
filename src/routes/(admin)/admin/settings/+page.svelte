<script lang="ts">
	import { onMount } from 'svelte';

	let settings: Record<string, string> = $state({});
	let loading = $state(true);
	let saving = $state(false);
	let saved = $state(false);
	let errorMsg = $state('');

	const labels: Record<string, { label: string; description: string }> = {
		owner_notification_email: {
			label: 'Owner Notification Email',
			description: 'Email address that receives order notifications'
		},
		pickup_address: {
			label: 'Pickup Address',
			description: 'Address shown to customers choosing pickup'
		},
		pickup_times: {
			label: 'Pickup Times',
			description: 'Available pickup times (e.g., Monday 4:00 PM, Friday 4:00 PM)'
		},
		delivery_times: {
			label: 'Delivery Times',
			description: 'Local delivery times (e.g., Monday 5:30 PM, Friday 5:30 PM)'
		},
		bread_lead_days: {
			label: 'Bread Lead Time (days)',
			description: 'Minimum days in advance bread must be ordered'
		},
		bread_delivery_days: {
			label: 'Bread Delivery Days',
			description: 'Comma-separated days bread is baked/delivered (e.g., monday,friday)'
		},
		drinks_enabled: {
			label: 'Drink Ordering (1 = on, 0 = off)',
			description:
				'Master switch. While this is 0 the Drinks page and its nav links are hidden and no drink order can be placed.'
		},
		drinks_daily_cap: {
			label: 'Drinks Per Day (cap)',
			description:
				'The most drinks that can be reserved across all windows in one day. Roughly 10 drinks per roasted pound.'
		},
		drinks_cutoff_hour: {
			label: 'Order Cutoff Hour (0-23, Central)',
			description:
				'Ordering for a day closes at this hour the evening before. 20 means 8:00 PM. Anything outside 0-23 falls back to 20.'
		},
		drinks_pickup_location: {
			label: 'Drink Pickup Location',
			description:
				'Shown on the reservation page and printed in every confirmation email. Leave blank and customers are told it will follow by email.'
		},
		drinks_order_days: {
			label: 'Drink Ordering Days',
			description:
				'Comma-separated weekdays drinks can be picked up (e.g., monday,tuesday,wednesday,thursday,friday)'
		}
	};

	onMount(async () => {
		const res = await fetch('/api/admin/settings');
		if (res.ok) settings = await res.json();
		else errorMsg = 'Failed to load settings.';
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
			setTimeout(() => {
				saved = false;
			}, 3000);
		} else {
			errorMsg = 'Failed to save settings.';
		}
		saving = false;
	}
</script>

<svelte:head><title>Settings - Admin</title></svelte:head>

<div class="card">
	<div class="card-header">
		<h4 class="card-title">Site Settings</h4>
	</div>
	<div class="card-body">
		{#if loading}
			<div class="py-4 text-center">
				<div class="spinner-border text-primary" role="status"></div>
			</div>
		{:else if errorMsg}
			<div class="alert alert-danger">{errorMsg}</div>
		{:else}
			<div class="row g-3" style="max-width:600px">
				{#each Object.keys(labels) as key}
					<div class="col-12">
						<label for={key} class="form-label">{labels[key].label}</label>
						<p class="text-muted small mb-1">{labels[key].description}</p>
						<input id={key} type="text" class="form-control" bind:value={settings[key]} />
					</div>
				{/each}

				{#if saved}
					<div class="col-12">
						<div class="alert alert-success mb-0 py-2">Settings saved successfully!</div>
					</div>
				{/if}

				<div class="col-12">
					<button class="btn btn-primary" onclick={save} disabled={saving}>
						{#if saving}
							<span class="spinner-border spinner-border-sm me-1"></span>Saving...
						{:else}
							Save Settings
						{/if}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
