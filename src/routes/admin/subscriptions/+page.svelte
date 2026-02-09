<script lang="ts">
	import { onMount } from 'svelte';

	let subs: any[] = [];
	let error = '';
	let toast = '';

	onMount(async () => {
		const res = await fetch('/api/admin/subscriptions');
		if (res.ok) subs = await res.json();
		else error = 'Not authorized.';
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
		} catch {
			return 'Invalid address';
		}
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
			// Update local state
			sub.last_fulfilled_at = new Date().toISOString();
			sub.next_delivery_date = data.next_delivery_date;
			subs = [...subs];
			showToast(`Marked fulfilled! Next delivery: ${formatDate(data.next_delivery_date)}`);
		} catch (e: any) {
			showToast(`Error: ${e.message}`);
		}
	}

	const statusColors: Record<string, string> = {
		active: 'bg-green-100 text-green-800',
		canceled: 'bg-red-100 text-red-800',
		past_due: 'bg-yellow-100 text-yellow-800'
	};

	const frequencyLabels: Record<string, string> = {
		weekly: 'Weekly',
		biweekly: 'Every 2 weeks',
		monthly: 'Monthly'
	};
</script>

<svelte:head><title>Subscriptions - Admin</title></svelte:head>

{#if toast}
	<div class="fixed top-4 right-4 z-50 rounded-lg px-4 py-2 text-sm text-white shadow-lg {toast.startsWith('Error') ? 'bg-red-600' : 'bg-green-600'}">{toast}</div>
{/if}

<section class="mx-auto max-w-screen-xl px-8 py-10">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold">Subscriptions</h1>
		<a href="/admin" class="text-sm text-gray-500 hover:text-black">&larr; Dashboard</a>
	</div>

	{#if error}<p class="mt-4 text-red-500">{error}</p>{/if}

	<div class="mt-6 space-y-4">
		{#each subs as sub}
			<div class="rounded-xl border p-5 {isOverdue(sub.next_delivery_date) && sub.status === 'active' ? 'border-red-300 bg-red-50' : ''}">
				<div class="flex items-start justify-between gap-4">
					<div class="flex-1">
						<div class="flex items-center gap-2">
							<p class="text-lg font-semibold">{sub.product_name || 'Unknown Product'}</p>
							{#if sub.variant}
								<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{sub.variant}</span>
							{/if}
						</div>
						<p class="mt-1 text-sm text-gray-600">
							{sub.customer_email}
							{#if sub.price_cents}
								<span class="mx-1">·</span>
								<span class="font-medium">${(sub.price_cents / 100).toFixed(2)}</span>
							{/if}
							<span class="mx-1">·</span>
							{frequencyLabels[sub.frequency] || sub.frequency}
						</p>

						<!-- Shipping Address -->
						<div class="mt-3 rounded bg-gray-50 p-3">
							<p class="text-xs font-medium uppercase tracking-wide text-gray-500">Ship To</p>
							{#if sub.shipping_name}
								<p class="mt-1 font-medium">{sub.shipping_name}</p>
							{/if}
							<p class="text-sm text-gray-700">{parseAddress(sub.shipping_address)}</p>
						</div>

						<!-- Delivery Dates -->
						<div class="mt-3 flex gap-6 text-sm">
							<div>
								<span class="text-gray-500">Next Delivery:</span>
								<span class="ml-1 font-medium {isOverdue(sub.next_delivery_date) ? 'text-red-600' : ''}">
									{formatDate(sub.next_delivery_date)}
									{#if isOverdue(sub.next_delivery_date) && sub.status === 'active'}
										<span class="text-red-600">(OVERDUE)</span>
									{/if}
								</span>
							</div>
							{#if sub.last_fulfilled_at}
								<div>
									<span class="text-gray-500">Last Fulfilled:</span>
									<span class="ml-1">{formatDate(sub.last_fulfilled_at)}</span>
								</div>
							{/if}
						</div>
					</div>

					<div class="flex flex-col items-end gap-2">
						<div class="flex items-center gap-2">
							<span class="rounded-full px-3 py-1 text-xs font-medium {statusColors[sub.status] || 'bg-gray-100'}">{sub.status}</span>
							{#if sub.cancel_at_period_end}
								<span class="text-xs text-red-400">canceling</span>
							{/if}
						</div>
						{#if sub.status === 'active'}
							<button
								on:click={() => markFulfilled(sub)}
								class="mt-2 rounded-full bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700"
							>
								Mark Fulfilled
							</button>
						{/if}
					</div>
				</div>
			</div>
		{/each}
		{#if subs.length === 0}<p class="text-gray-400">No subscriptions yet.</p>{/if}
	</div>
</section>
