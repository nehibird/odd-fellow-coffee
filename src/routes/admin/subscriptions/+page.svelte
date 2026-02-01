<script lang="ts">
	import { onMount } from 'svelte';

	let subs: any[] = [];
	let error = '';

	onMount(async () => {
		const res = await fetch('/api/admin/subscriptions');
		if (res.ok) subs = await res.json();
		else error = 'Not authorized.';
	});
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
			<div class="rounded-xl border p-4">
				<p class="font-semibold">{sub.customer_email}</p>
				<p class="text-sm text-gray-500">{sub.frequency} &middot; {sub.status}</p>
			</div>
		{/each}
		{#if subs.length === 0}<p class="text-gray-400">No subscriptions yet.</p>{/if}
	</div>
</section>
