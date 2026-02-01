<script lang="ts">
	import { onMount } from 'svelte';

	let orders: any[] = [];
	let error = '';

	onMount(async () => {
		const res = await fetch('/api/admin/orders');
		if (res.ok) orders = await res.json();
		else error = 'Not authorized. Please login at /admin first.';
	});

	async function updateStatus(id: number, status: string) {
		await fetch('/api/admin/orders', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, status })
		});
		orders = orders.map((o) => (o.id === id ? { ...o, status } : o));
	}

	const statusColors: Record<string, string> = {
		pending: 'bg-yellow-100 text-yellow-800',
		confirmed: 'bg-blue-100 text-blue-800',
		fulfilled: 'bg-green-100 text-green-800'
	};
</script>

<svelte:head><title>Orders - Admin</title></svelte:head>

<section class="mx-auto max-w-screen-xl px-8 py-10">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold">Orders</h1>
		<a href="/admin" class="text-sm text-gray-500 hover:text-black">&larr; Dashboard</a>
	</div>

	{#if error}
		<p class="mt-4 text-red-500">{error}</p>
	{:else}
		<div class="mt-6 space-y-3">
			{#each orders as order}
				<div class="flex items-center justify-between rounded-xl border p-4">
					<div>
						<p class="font-semibold">Order #{order.id} — {order.customer_name || order.customer_email}</p>
						<p class="text-sm text-gray-500">${(order.total_cents / 100).toFixed(2)} &middot; {new Date(order.created_at).toLocaleDateString()}</p>
					</div>
					<div class="flex items-center gap-2">
						<span class="rounded-full px-3 py-1 text-xs font-medium {statusColors[order.status] || 'bg-gray-100'}">{order.status}</span>
						{#if order.status === 'pending'}
							<button class="text-xs text-blue-600 hover:underline" on:click={() => updateStatus(order.id, 'confirmed')}>Confirm</button>
						{/if}
						{#if order.status === 'confirmed'}
							<button class="text-xs text-green-600 hover:underline" on:click={() => updateStatus(order.id, 'fulfilled')}>Fulfill</button>
						{/if}
					</div>
				</div>
			{/each}
			{#if orders.length === 0}<p class="text-gray-400">No orders yet.</p>{/if}
		</div>
	{/if}
</section>
