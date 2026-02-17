<script lang="ts">
	import { onMount } from 'svelte';

	let subs: any[] = $state([]);
	let error = $state('');
	let toast = $state('');

	onMount(async () => {
		const res = await fetch('/api/admin/subscriptions');
		if (res.ok) subs = await res.json();
		else error = 'Failed to load subscriptions.';
	});

	function showToast(msg: string) {
		toast = msg;
		setTimeout(() => (toast = ''), 3000);
	}

	function parseAddress(addrJson: string | null): string {
		if (!addrJson) return 'No address';
		try {
			const a = JSON.parse(addrJson);
			return `${a.line1}${a.line2 ? ', ' + a.line2 : ''}, ${a.city}, ${a.state} ${a.postal_code}`;
		} catch { return 'Invalid address'; }
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'Not set';
		return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}

	function isOverdue(nextDelivery: string | null): boolean {
		if (!nextDelivery) return false;
		return new Date(nextDelivery) < new Date();
	}

	async function markFulfilled(sub: any) {
		try {
			const res = await fetch('/api/admin/subscriptions', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: sub.id, action: 'fulfill' })
			});
			if (!res.ok) throw new Error('Failed to mark fulfilled');
			const data = await res.json();
			sub.last_fulfilled_at = new Date().toISOString();
			sub.next_delivery_date = data.next_delivery_date;
			subs = [...subs];
			showToast(`Fulfilled! Next: ${formatDate(data.next_delivery_date)}`);
		} catch (e: any) {
			showToast(`Error: ${e.message}`);
		}
	}

	const statusBadge: Record<string, string> = {
		active: 'bg-success',
		canceled: 'bg-danger',
		past_due: 'bg-warning'
	};

	const frequencyLabels: Record<string, string> = {
		weekly: 'Weekly',
		biweekly: 'Bi-weekly',
		monthly: 'Monthly'
	};
</script>

<svelte:head><title>Subscriptions - Admin</title></svelte:head>

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

<div class="card">
	<div class="card-header">
		<h4 class="card-title">Subscriptions</h4>
	</div>
	<div class="card-body p-0">
		<div class="table-responsive">
			<table class="table table-hover table-centered mb-0">
				<thead class="bg-light bg-opacity-50">
					<tr>
						<th>Product</th>
						<th>Customer</th>
						<th>Frequency</th>
						<th>Price</th>
						<th>Next Delivery</th>
						<th>Ship To</th>
						<th>Status</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each subs as sub}
						<tr class={isOverdue(sub.next_delivery_date) && sub.status === 'active' ? 'table-danger' : ''}>
							<td>
								<span class="fw-medium">{sub.product_name || 'Unknown'}</span>
								{#if sub.variant}<br><small class="text-muted">{sub.variant}</small>{/if}
							</td>
							<td>{sub.customer_email}</td>
							<td>{frequencyLabels[sub.frequency] || sub.frequency}</td>
							<td>{sub.price_cents ? `$${(sub.price_cents / 100).toFixed(2)}` : '--'}</td>
							<td>
								<span class={isOverdue(sub.next_delivery_date) ? 'text-danger fw-bold' : ''}>
									{formatDate(sub.next_delivery_date)}
								</span>
								{#if isOverdue(sub.next_delivery_date) && sub.status === 'active'}
									<span class="badge bg-danger ms-1">OVERDUE</span>
								{/if}
							</td>
							<td>
								{#if sub.shipping_name}<strong>{sub.shipping_name}</strong><br>{/if}
								<small>{parseAddress(sub.shipping_address)}</small>
							</td>
							<td>
								<span class="badge {statusBadge[sub.status] || 'bg-secondary'}">{sub.status}</span>
								{#if sub.cancel_at_period_end}<br><small class="text-danger">canceling</small>{/if}
							</td>
							<td>
								{#if sub.status === 'active'}
									<button class="btn btn-sm btn-soft-success" onclick={() => markFulfilled(sub)}>
										Fulfill
									</button>
								{/if}
							</td>
						</tr>
					{/each}
					{#if subs.length === 0}
						<tr><td colspan="8" class="text-center text-muted py-4">No subscriptions yet</td></tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
