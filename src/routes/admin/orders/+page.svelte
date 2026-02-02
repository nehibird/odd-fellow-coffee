<script lang="ts">
	import { onMount } from 'svelte';

	let orders: any[] = [];
	let error = '';
	let busyId: number | null = null;
	let toast = '';

	onMount(async () => {
		const res = await fetch('/api/admin/orders');
		if (res.ok) orders = await res.json();
		else error = 'Not authorized. Please login at /admin first.';
	});

	function showToast(msg: string) {
		toast = msg;
		setTimeout(() => (toast = ''), 3000);
	}

	async function updateStatus(id: number, status: string) {
		busyId = id;
		try {
			const res = await fetch('/api/admin/orders', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id, status })
			});
			if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Update failed');
			orders = orders.map((o) => (o.id === id ? { ...o, status } : o));
			showToast(`Order #${id} marked ${status}`);
		} catch (e: any) {
			showToast(`Error: ${e.message}`);
		} finally {
			busyId = null;
		}
	}

	async function updateStage(id: number, stage: string) {
		busyId = id;
		try {
			const res = await fetch('/api/admin/orders', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id, stage })
			});
			if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Update failed');
			orders = orders.map((o) => (o.id === id ? { ...o, stage } : o));
			showToast(`Order #${id} moved to ${stage.replace('_', ' ')}`);
		} catch (e: any) {
			showToast(`Error: ${e.message}`);
		} finally {
			busyId = null;
		}
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

{#if toast}
	<div class="fixed top-4 right-4 z-50 rounded-lg px-4 py-2 text-sm text-white shadow-lg {toast.startsWith('Error') ? 'bg-red-600' : 'bg-green-600'}">{toast}</div>
{/if}

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
								<button class="text-xs text-blue-600 hover:underline disabled:opacity-50" disabled={busyId === order.id} on:click={() => updateStage(order.id, next)}>
									{busyId === order.id ? '...' : `\u2192 ${next.replace('_', ' ')}`}
								</button>
							{/if}
						{:else}
							{#if order.status === 'pending'}
								<button class="text-xs text-blue-600 hover:underline disabled:opacity-50" disabled={busyId === order.id} on:click={() => updateStatus(order.id, 'confirmed')}>
									{busyId === order.id ? '...' : 'Confirm'}
								</button>
							{/if}
							{#if order.status === 'confirmed'}
								<button class="text-xs text-green-600 hover:underline disabled:opacity-50" disabled={busyId === order.id} on:click={() => updateStatus(order.id, 'fulfilled')}>
									{busyId === order.id ? '...' : 'Fulfill'}
								</button>
							{/if}
						{/if}
					</div>
				</div>
			{/each}
			{#if orders.length === 0}<p class="text-gray-400">No orders yet.</p>{/if}
		</div>
	{/if}
</section>
