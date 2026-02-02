<script lang="ts">
	import { onMount } from 'svelte';

	let drops: any[] = [];
	let products: any[] = [];
	let error = '';
	let showCreate = false;
	let saving = false;
	let toast = '';

	// Create form
	let title = '';
	let drop_date = '';
	let opens_at = '';
	let closes_at = '';
	let pickup_start = '';
	let pickup_end = '';
	let newItems: { product_id: number; quantity_available: number; price_cents_override: string }[] = [];

	onMount(async () => {
		const [dRes, pRes] = await Promise.all([
			fetch('/api/admin/drops'),
			fetch('/api/products')
		]);
		if (dRes.ok) drops = await dRes.json();
		else error = 'Not authorized.';
		if (pRes.ok) products = await pRes.json();
	});

	function showToast(msg: string) {
		toast = msg;
		setTimeout(() => (toast = ''), 3000);
	}

	function addItem() {
		newItems = [...newItems, { product_id: products[0]?.id || 0, quantity_available: 1, price_cents_override: '' }];
	}

	function removeItem(i: number) {
		newItems = newItems.filter((_, idx) => idx !== i);
	}

	async function createDrop() {
		if (!title.trim()) { showToast('Error: Title is required'); return; }
		if (!drop_date) { showToast('Error: Drop date is required'); return; }
		if (!opens_at) { showToast('Error: Opens at time is required'); return; }
		if (newItems.length === 0) { showToast('Error: Add at least one item'); return; }

		saving = true;
		try {
			const body = {
				title, drop_date, opens_at,
				closes_at: closes_at || null,
				pickup_start: pickup_start || null,
				pickup_end: pickup_end || null,
				items: newItems.map((i) => ({
					product_id: i.product_id,
					quantity_available: i.quantity_available,
					price_cents_override: i.price_cents_override ? Math.round(parseFloat(i.price_cents_override) * 100) : null
				}))
			};
			const res = await fetch('/api/admin/drops', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Create failed');
			showCreate = false;
			title = ''; drop_date = ''; opens_at = ''; closes_at = ''; pickup_start = ''; pickup_end = ''; newItems = [];
			const r = await fetch('/api/admin/drops');
			if (r.ok) drops = await r.json();
			showToast('Drop created');
		} catch (e: any) {
			showToast(`Error: ${e.message}`);
		} finally {
			saving = false;
		}
	}

	async function closeDrop(id: number, name: string) {
		if (!confirm(`Close "${name}"? This cannot be undone.`)) return;
		try {
			const res = await fetch('/api/admin/drops', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});
			if (!res.ok) throw new Error('Close failed');
			drops = drops.map((d) => (d.id === id ? { ...d, status: 'closed' } : d));
			showToast(`"${name}" closed`);
		} catch (e: any) {
			showToast(`Error: ${e.message}`);
		}
	}

	const statusColors: Record<string, string> = {
		scheduled: 'bg-blue-100 text-blue-800',
		live: 'bg-green-100 text-green-800',
		sold_out: 'bg-red-100 text-red-800',
		closed: 'bg-gray-100 text-gray-800'
	};
</script>

<svelte:head><title>Drops - Admin</title></svelte:head>

{#if toast}
	<div class="fixed top-4 right-4 z-50 rounded-lg px-4 py-2 text-sm text-white shadow-lg {toast.startsWith('Error') ? 'bg-red-600' : 'bg-green-600'}">{toast}</div>
{/if}

<section class="mx-auto max-w-screen-xl px-8 py-10">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold">Drops</h1>
		<div class="flex gap-3">
			<button on:click={() => { showCreate = !showCreate; if (!newItems.length) addItem(); }} class="rounded-full bg-black px-4 py-2 text-sm text-white hover:bg-medium-carmine">
				{showCreate ? 'Cancel' : 'New Drop'}
			</button>
			<a href="/admin" class="text-sm text-gray-500 hover:text-black">&larr; Dashboard</a>
		</div>
	</div>

	{#if error}<p class="mt-4 text-red-500">{error}</p>{/if}

	{#if showCreate}
		<div class="mt-6 rounded-xl border p-6 space-y-4">
			<h2 class="text-xl font-semibold">Create Drop</h2>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<label for="drop-title" class="block text-sm font-medium">Title</label>
					<input id="drop-title" bind:value={title} class="mt-1 w-full rounded border px-3 py-2" placeholder="Saturday Sourdough Bake" />
				</div>
				<div>
					<label for="drop-date" class="block text-sm font-medium">Drop Date</label>
					<input id="drop-date" bind:value={drop_date} type="date" class="mt-1 w-full rounded border px-3 py-2" />
				</div>
				<div>
					<label for="drop-opens" class="block text-sm font-medium">Opens At</label>
					<input id="drop-opens" bind:value={opens_at} type="datetime-local" class="mt-1 w-full rounded border px-3 py-2" />
				</div>
				<div>
					<label for="drop-closes" class="block text-sm font-medium">Closes At</label>
					<input id="drop-closes" bind:value={closes_at} type="datetime-local" class="mt-1 w-full rounded border px-3 py-2" />
				</div>
				<div>
					<label for="drop-pickup-start" class="block text-sm font-medium">Pickup Start</label>
					<input id="drop-pickup-start" bind:value={pickup_start} type="datetime-local" class="mt-1 w-full rounded border px-3 py-2" />
				</div>
				<div>
					<label for="drop-pickup-end" class="block text-sm font-medium">Pickup End</label>
					<input id="drop-pickup-end" bind:value={pickup_end} type="datetime-local" class="mt-1 w-full rounded border px-3 py-2" />
				</div>
			</div>

			<div>
				<h3 class="font-medium">Items</h3>
				{#each newItems as item, i}
					<div class="mt-2 flex gap-2 items-end">
						<select bind:value={item.product_id} class="flex-1 rounded border px-2 py-1 text-sm">
							{#each products as p}
								<option value={p.id}>{p.name}</option>
							{/each}
						</select>
						<input bind:value={item.quantity_available} type="number" min="1" class="w-20 rounded border px-2 py-1 text-sm" placeholder="Qty" />
						<input bind:value={item.price_cents_override} type="text" class="w-24 rounded border px-2 py-1 text-sm" placeholder="$ override" />
						<button on:click={() => removeItem(i)} class="text-red-500 text-sm">X</button>
					</div>
				{/each}
				<button on:click={addItem} class="mt-2 text-sm text-blue-600 hover:underline">+ Add item</button>
			</div>

			<button on:click={createDrop} disabled={saving} class="rounded-full bg-black px-6 py-2 text-white hover:bg-medium-carmine disabled:opacity-50">
				{saving ? 'Creating...' : 'Create Drop'}
			</button>
		</div>
	{/if}

	<div class="mt-6 space-y-4">
		{#each drops as drop}
			<div class="rounded-xl border p-4">
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-lg font-semibold">{drop.title}</h3>
						<p class="text-sm text-gray-500">{drop.drop_date}</p>
					</div>
					<div class="flex items-center gap-3">
						<span class="rounded-full px-3 py-1 text-xs font-medium {statusColors[drop.status] || 'bg-gray-100'}">{drop.status}</span>
						{#if drop.status !== 'closed'}
							<button on:click={() => closeDrop(drop.id, drop.title)} class="text-xs text-red-500 hover:underline">Close</button>
						{/if}
					</div>
				</div>
				{#if drop.items?.length}
					<div class="mt-3 space-y-1">
						{#each drop.items as item}
							<div class="flex justify-between text-sm">
								<span>{item.name}</span>
								<span class="text-gray-500">{item.quantity_sold}/{item.quantity_available} sold</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
		{#if drops.length === 0}<p class="text-gray-400">No drops yet.</p>{/if}
	</div>
</section>
