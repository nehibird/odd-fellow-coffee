<script lang="ts">
	import { onMount } from 'svelte';

	let orders: any[] = $state([]);
	let error = $state('');
	let busyId: number | null = $state(null);
	let toast = $state('');

	onMount(async () => {
		const res = await fetch('/api/admin/orders');
		if (res.ok) orders = await res.json();
		else error = 'Failed to load orders.';
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

	const statusBadge: Record<string, string> = {
		pending: 'bg-warning',
		confirmed: 'bg-info',
		fulfilled: 'bg-success'
	};

	const stageBadge: Record<string, string> = {
		ordered: 'bg-info',
		baking: 'bg-warning',
		ready: 'bg-success',
		picked_up: 'bg-secondary',
		shipped: 'bg-primary',
		delivered: 'bg-secondary',
		confirmed: 'bg-info'
	};

	const pickupStageFlow = ['ordered', 'baking', 'ready', 'picked_up'];
	const shippingStageFlow = ['confirmed', 'shipped', 'delivered'];

	function nextStage(order: any) {
		const flow = order.shipping_method ? shippingStageFlow : pickupStageFlow;
		const idx = flow.indexOf(order.stage);
		return idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;
	}

	function parseAddress(json: string) {
		try { return JSON.parse(json); } catch { return null; }
	}

	let pendingCount = $derived(orders.filter(o => o.status === 'pending').length);
	let confirmedCount = $derived(orders.filter(o => o.status === 'confirmed').length);
	let fulfilledCount = $derived(orders.filter(o => o.status === 'fulfilled').length);
</script>

<svelte:head><title>Orders - Admin</title></svelte:head>

{#if toast}
	<div class="position-fixed top-0 end-0 p-3" style="z-index:1080">
		<div class="toast show {toast.startsWith('Error') ? 'bg-danger' : 'bg-success'} text-white">
			<div class="toast-body">{toast}</div>
		</div>
	</div>
{/if}

<div class="row">
	<div class="col-md-4">
		<div class="card">
			<div class="card-body">
				<div class="d-flex align-items-center justify-content-between">
					<div>
						<h4 class="card-title mb-2">Pending</h4>
						<p class="text-muted fw-medium fs-22 mb-0">{pendingCount}</p>
					</div>
					<div class="avatar-md bg-warning bg-opacity-10 rounded">
						<iconify-icon icon="solar:clock-circle-bold-duotone" class="fs-32 text-warning avatar-title"></iconify-icon>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="col-md-4">
		<div class="card">
			<div class="card-body">
				<div class="d-flex align-items-center justify-content-between">
					<div>
						<h4 class="card-title mb-2">Confirmed</h4>
						<p class="text-muted fw-medium fs-22 mb-0">{confirmedCount}</p>
					</div>
					<div class="avatar-md bg-info bg-opacity-10 rounded">
						<iconify-icon icon="solar:check-circle-bold-duotone" class="fs-32 text-info avatar-title"></iconify-icon>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="col-md-4">
		<div class="card">
			<div class="card-body">
				<div class="d-flex align-items-center justify-content-between">
					<div>
						<h4 class="card-title mb-2">Fulfilled</h4>
						<p class="text-muted fw-medium fs-22 mb-0">{fulfilledCount}</p>
					</div>
					<div class="avatar-md bg-success bg-opacity-10 rounded">
						<iconify-icon icon="solar:bag-check-bold-duotone" class="fs-32 text-success avatar-title"></iconify-icon>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

{#if error}
	<div class="alert alert-danger">{error}</div>
{:else}
	<div class="card">
		<div class="card-header">
			<h4 class="card-title">All Orders</h4>
		</div>
		<div class="card-body p-0">
			<div class="table-responsive">
				<table class="table table-hover table-centered mb-0">
					<thead class="bg-light bg-opacity-50">
						<tr>
							<th>#</th>
							<th>Customer</th>
							<th>Total</th>
							<th>Status</th>
							<th>Stage</th>
							<th>Date</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each orders as order}
							<tr>
								<td class="fw-medium">
									{order.id}
									{#if order.drop_id}<span class="badge bg-soft-danger text-danger ms-1">Drop</span>{/if}
								</td>
								<td>
									{order.customer_name || order.customer_email}
									{#if order.shipping_address}
										{@const addr = parseAddress(order.shipping_address)}
										{#if addr}
											<br><small class="text-muted">{addr.city}, {addr.state}</small>
										{/if}
									{/if}
								</td>
								<td>
									${(order.total_cents / 100).toFixed(2)}
									{#if order.shipping_cents}
										<br><small class="text-muted">+${(order.shipping_cents / 100).toFixed(2)} ship</small>
									{/if}
								</td>
								<td><span class="badge {statusBadge[order.status] || 'bg-secondary'}">{order.status}</span></td>
								<td>
									{#if order.stage}
										<span class="badge {stageBadge[order.stage] || 'bg-secondary'}">{order.stage.replace('_', ' ')}</span>
									{:else}
										<span class="text-muted">--</span>
									{/if}
									{#if order.shipping_method}
										<span class="badge bg-soft-primary text-primary ms-1">{order.shipping_method}</span>
									{/if}
								</td>
								<td>{new Date(order.created_at).toLocaleDateString()}</td>
								<td>
									{#if order.stage}
										{@const next = nextStage(order)}
										{#if next}
											<button class="btn btn-sm btn-soft-primary" disabled={busyId === order.id} onclick={() => updateStage(order.id, next)}>
												{busyId === order.id ? '...' : next.replace('_', ' ')}
											</button>
										{/if}
									{:else}
										{#if order.status === 'pending'}
											<button class="btn btn-sm btn-soft-info" disabled={busyId === order.id} onclick={() => updateStatus(order.id, 'confirmed')}>
												{busyId === order.id ? '...' : 'Confirm'}
											</button>
										{/if}
										{#if order.status === 'confirmed'}
											<button class="btn btn-sm btn-soft-success" disabled={busyId === order.id} onclick={() => updateStatus(order.id, 'fulfilled')}>
												{busyId === order.id ? '...' : 'Fulfill'}
											</button>
										{/if}
									{/if}
								</td>
							</tr>
						{/each}
						{#if orders.length === 0}
							<tr><td colspan="7" class="text-center text-muted py-4">No orders yet</td></tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	</div>
{/if}
