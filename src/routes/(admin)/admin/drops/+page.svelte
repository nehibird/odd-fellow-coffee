<script lang="ts">
	import { onMount } from 'svelte';

	let drops: any[] = $state([]);
	let products: any[] = $state([]);
	let error = $state('');
	let showCreate = $state(false);
	let saving = $state(false);
	let toast = $state('');

	let title = $state('');
	let drop_date = $state('');
	let opens_at = $state('');
	let closes_at = $state('');
	let pickup_start = $state('');
	let pickup_end = $state('');
	let newItems: { product_id: number; quantity_available: number; price_cents_override: string }[] = $state([]);

	onMount(async () => {
		const [dRes, pRes] = await Promise.all([
			fetch('/api/admin/drops'),
			fetch('/api/products')
		]);
		if (dRes.ok) drops = await dRes.json();
		else error = 'Failed to load drops.';
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
		if (!opens_at) { showToast('Error: Opens at is required'); return; }
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
		if (!confirm(`Close "${name}"?`)) return;
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

	const statusBadge: Record<string, string> = {
		scheduled: 'bg-info',
		live: 'bg-success',
		sold_out: 'bg-danger',
		closed: 'bg-secondary'
	};
</script>

<svelte:head><title>Drops - Admin</title></svelte:head>

{#if toast}
	<div class="position-fixed top-0 end-0 p-3" style="z-index:1080">
		<div class="toast show {toast.startsWith('Error') ? 'bg-danger' : 'bg-success'} text-white">
			<div class="toast-body">{toast}</div>
		</div>
	</div>
{/if}

{#if error}
	<div class="alert alert-danger">{error}</div>
{/if}

{#if showCreate}
	<div class="card mb-3">
		<div class="card-header d-flex justify-content-between align-items-center">
			<h4 class="card-title mb-0">Create Drop</h4>
			<button class="btn btn-sm btn-light" onclick={() => (showCreate = false)}>Cancel</button>
		</div>
		<div class="card-body">
			<div class="row g-3">
				<div class="col-md-6">
					<label for="drop-title" class="form-label">Title</label>
					<input id="drop-title" class="form-control" bind:value={title} placeholder="Saturday Sourdough Bake" />
				</div>
				<div class="col-md-6">
					<label for="drop-date" class="form-label">Drop Date</label>
					<input id="drop-date" type="date" class="form-control" bind:value={drop_date} />
				</div>
				<div class="col-md-6">
					<label for="drop-opens" class="form-label">Opens At</label>
					<input id="drop-opens" type="datetime-local" class="form-control" bind:value={opens_at} />
				</div>
				<div class="col-md-6">
					<label for="drop-closes" class="form-label">Closes At</label>
					<input id="drop-closes" type="datetime-local" class="form-control" bind:value={closes_at} />
				</div>
				<div class="col-md-6">
					<label for="drop-pickup-start" class="form-label">Pickup Start</label>
					<input id="drop-pickup-start" type="datetime-local" class="form-control" bind:value={pickup_start} />
				</div>
				<div class="col-md-6">
					<label for="drop-pickup-end" class="form-label">Pickup End</label>
					<input id="drop-pickup-end" type="datetime-local" class="form-control" bind:value={pickup_end} />
				</div>
			</div>

			<h6 class="mt-4 mb-2">Items</h6>
			{#each newItems as item, i}
				<div class="row g-2 mb-2 align-items-end">
					<div class="col">
						<select class="form-select form-select-sm" bind:value={item.product_id} aria-label="Product">
							{#each products as p}<option value={p.id}>{p.name}</option>{/each}
						</select>
					</div>
					<div class="col-auto" style="width:80px">
						<input type="number" class="form-control form-control-sm" bind:value={item.quantity_available} min="1" placeholder="Qty" aria-label="Quantity" />
					</div>
					<div class="col-auto" style="width:100px">
						<input type="text" class="form-control form-control-sm" bind:value={item.price_cents_override} placeholder="$ override" aria-label="Price override" />
					</div>
					<div class="col-auto">
						<button class="btn btn-sm btn-soft-danger" onclick={() => removeItem(i)} aria-label="Remove item">
							<i class="bx bx-x"></i>
						</button>
					</div>
				</div>
			{/each}
			<button class="btn btn-sm btn-light" onclick={addItem}><i class="bx bx-plus me-1"></i>Add Item</button>

			<div class="mt-3">
				<button class="btn btn-primary" onclick={createDrop} disabled={saving}>
					{saving ? 'Creating...' : 'Create Drop'}
				</button>
			</div>
		</div>
	</div>
{/if}

<div class="card">
	<div class="card-header d-flex justify-content-between align-items-center">
		<h4 class="card-title mb-0">Drops</h4>
		<button class="btn btn-primary btn-sm" onclick={() => { showCreate = !showCreate; if (!newItems.length) addItem(); }}>
			<i class="bx bx-plus me-1"></i>New Drop
		</button>
	</div>
	<div class="card-body p-0">
		<div class="table-responsive">
			<table class="table table-hover table-centered mb-0">
				<thead class="bg-light bg-opacity-50">
					<tr>
						<th>Title</th>
						<th>Date</th>
						<th>Items</th>
						<th>Status</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each drops as drop}
						<tr>
							<td class="fw-medium">{drop.title}</td>
							<td>{drop.drop_date}</td>
							<td>
								{#if drop.items?.length}
									{#each drop.items as item}
										<div class="small">{item.name}: {item.quantity_sold}/{item.quantity_available}</div>
									{/each}
								{:else}
									<span class="text-muted">--</span>
								{/if}
							</td>
							<td><span class="badge {statusBadge[drop.status] || 'bg-secondary'}">{drop.status}</span></td>
							<td>
								{#if drop.status !== 'closed'}
									<button class="btn btn-sm btn-soft-danger" onclick={() => closeDrop(drop.id, drop.title)}>Close</button>
								{/if}
							</td>
						</tr>
					{/each}
					{#if drops.length === 0}
						<tr><td colspan="5" class="text-center text-muted py-4">No drops yet</td></tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
