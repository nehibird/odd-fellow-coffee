<script lang="ts">
	import { onMount } from 'svelte';

	let subs: any[] = [];
	let error = '';

	onMount(async () => {
		const res = await fetch('/api/admin/subscriptions');
		if (res.ok) subs = await res.json();
		else error = 'Not authorized.';
	});

	const statusColors: Record<string, string> = {
		active: 'bg-green-100 text-green-800',
		canceled: 'bg-red-100 text-red-800',
		past_due: 'bg-yellow-100 text-yellow-800'
	};
</script>

<svelte:head><title>Subscriptions - Admin</title></svelte:head>

<section class="mx-auto max-w-screen-xl px-8 py-10">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold">Subscriptions</h1>
		<a href="/admin" class="text-sm text-gray-500 hover:text-black">&larr; Dashboard</a>
	</div>

	{#if error}<p class="mt-4 text-red-500">{error}</p>{/if}

	<div class="mt-6 space-y-3">
		{#each subs as sub}
			<div class="flex items-center justify-between rounded-xl border p-4">
				<div>
					<p class="font-semibold">{sub.product_name || 'Unknown Product'}</p>
					<p class="text-sm text-gray-500">{sub.customer_email} &middot; {sub.frequency}</p>
					{#if sub.current_period_end}
						<p class="text-xs text-gray-400">Period ends: {new Date(sub.current_period_end).toLocaleDateString()}</p>
					{/if}
				</div>
				<div class="flex items-center gap-2">
					<span class="rounded-full px-3 py-1 text-xs font-medium {statusColors[sub.status] || 'bg-gray-100'}">{sub.status}</span>
					{#if sub.cancel_at_period_end}
						<span class="text-xs text-red-400">canceling</span>
					{/if}
				</div>
			</div>
		{/each}
		{#if subs.length === 0}<p class="text-gray-400">No subscriptions yet.</p>{/if}
	</div>
</section>
