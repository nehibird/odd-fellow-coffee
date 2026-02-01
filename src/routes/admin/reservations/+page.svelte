<script lang="ts">
	import { onMount } from 'svelte';

	let reservations: any[] = [];
	let error = '';

	onMount(async () => {
		const res = await fetch('/api/admin/reservations');
		if (res.ok) reservations = await res.json();
		else error = 'Not authorized.';
	});
</script>

<svelte:head><title>Reservations - Admin</title></svelte:head>

<section class="mx-auto max-w-screen-xl px-8 py-10">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold">Reservations</h1>
		<a href="/admin" class="text-sm text-gray-500 hover:text-black">&larr; Dashboard</a>
	</div>

	{#if error}<p class="mt-4 text-red-500">{error}</p>{/if}

	<div class="mt-6 space-y-3">
		{#each reservations as r}
			<div class="rounded-xl border p-4">
				<p class="font-semibold">{r.customer_name || r.customer_email}</p>
				<p class="text-sm text-gray-500">{r.reservation_date} &middot; {r.time_slot} &middot; {r.status}</p>
			</div>
		{/each}
		{#if reservations.length === 0}<p class="text-gray-400">No reservations.</p>{/if}
	</div>
</section>
