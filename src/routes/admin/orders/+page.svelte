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

	async function updateStage(id: number, stage: string) {
		await fetch('/api/admin/orders', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, stage })
		});
		orders = orders.map((o) => (o.id === id ? { ...o, stage } : o));
	}

	const statusColors: Record<string, string> = {
		pending: 'bg-yellow-100 text-yellow-800',
		confirmed: 'bg-blue-100 text-blue-800',
		fulfilled: 'bg-green-100 text-green-800'
	};

	const stageColors: Record<string, string> = {
		ordered: 'bg-blue-100 text-blue-800',
		baking: 'bg-yellow-100 text-yellow-800',
		ready: 'bg-green-100 text-green-800',
		picked_up: 'bg-gray-100 text-gray-800'
	};

	const stageFlow = ['ordered', 'baking', 'ready', 'picked_up'];
	function nextStage(current: string) {
		const idx = stageFlow.indexOf(current);
		return idx >= 0 && idx < stageFlow.length - 1 ? stageFlow[idx + 1] : null;
	}
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
						<p class="font-semibold">
							Order #{order.id} — {order.customer_name || order.customer_email}
							{#if order.drop_id}<span class="ml-2 text-xs text-medium-carmine">(Drop #{order.drop_id})</span>{/if}
						</p>
						<p class="text-sm text-gray-500">${(order.total_cents / 100).toFixed(2)} &middot; {new Date(order.created_at).toLocaleDateString()}</p>
					</div>
					<div class="flex items-center gap-2">
						<span class="rounded-full px-3 py-1 text-xs font-medium {statusColors[order.status] || 'bg-gray-100'}">{order.status}</span>
						{#if order.stage}
							<span class="rounded-full px-3 py-1 text-xs font-medium {stageColors[order.stage] || 'bg-gray-100'}">{order.stage.replace('_', ' ')}</span>
							{@const next = nextStage(order.stage)}
							{#if next}
								<button class="text-xs text-blue-600 hover:underline" on:click={() => updateStage(order.id, next)}>
									&rarr; {next.replace('_', ' ')}
								</button>
							{/if}
						{:else}
							{#if order.status === 'pending'}
								<button class="text-xs text-blue-600 hover:underline" on:click={() => updateStatus(order.id, 'confirmed')}>Confirm</button>
							{/if}
							{#if order.status === 'confirmed'}
								<button class="text-xs text-green-600 hover:underline" on:click={() => updateStatus(order.id, 'fulfilled')}>Fulfill</button>
							{/if}
						{/if}
					</div>
				</div>
			{/each}
			{#if orders.length === 0}<p class="text-gray-400">No orders yet.</p>{/if}
		</div>
	{/if}
</section>
