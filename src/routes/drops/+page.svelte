<script lang="ts">
	import { onMount } from 'svelte';
	import { cart } from '$lib/components/CartStore';

	let drops: any[] = [];
	let loading = true;

	onMount(async () => {
		const res = await fetch('/api/drops');
		if (res.ok) drops = await res.json();
		loading = false;
	});

	function remaining(item: any) {
		return item.quantity_available - item.quantity_sold;
	}

	function addDropItem(drop: any, item: any) {
		const qty = remaining(item);
		if (qty <= 0) return;
		cart.add({
			productId: item.product_id,
			name: item.name,
			price_cents: item.price_cents,
			quantity: 1,
			dropId: drop.id,
			dropItemId: item.id,
			image: item.image || undefined
		});
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
	}

	function formatTime(d: string) {
		return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	}
</script>

<svelte:head>
	<title>Drops - Odd Fellow Coffee</title>
</svelte:head>

<section class="mx-auto max-w-screen-xl px-8 py-10">
	<h1 class="text-4xl">
		<span class="text-medium-carmine">D</span>rops
	</h1>
	<p class="mt-2 text-gray-600">Limited bakes & specials. Grab 'em before they're gone.</p>

	{#if loading}
		<p class="mt-8 text-gray-400">Loading drops...</p>
	{:else if drops.length === 0}
		<div class="mt-8 rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
			<p class="text-lg text-gray-500">No drops right now.</p>
			<p class="mt-1 text-sm text-gray-400">Check back soon for Deb's next bake day!</p>
		</div>
	{:else}
		{#each drops as drop}
			<div class="mt-8 rounded-2xl border p-6">
				<div class="flex flex-wrap items-start justify-between gap-4">
					<div>
						<h2 class="text-2xl font-bold">{drop.title}</h2>
						<p class="text-gray-500">{formatDate(drop.drop_date)}</p>
					</div>
					{#if drop.pickup_start}
						<div class="rounded-full bg-gray-100 px-4 py-1 text-sm">
							Pickup: {formatTime(drop.pickup_start)}{#if drop.pickup_end} – {formatTime(drop.pickup_end)}{/if}
						</div>
					{/if}
				</div>

				<div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each drop.items as item}
						{@const qty = remaining(item)}
						<div class="rounded-xl border p-4 {qty <= 0 ? 'opacity-50' : ''}">
							{#if item.image}
								<div class="mb-3 h-32 w-full overflow-hidden rounded-lg bg-gray-100">
									<img src="/assets/images/products/{item.image}" alt={item.name} class="h-full w-full object-cover" />
								</div>
							{/if}
							<h3 class="font-semibold">{item.name}</h3>
							{#if item.description}<p class="mt-1 text-sm text-gray-600">{item.description}</p>{/if}
							<div class="mt-2 flex items-center justify-between">
								<span class="text-lg font-bold">${(item.price_cents / 100).toFixed(2)}</span>
								<span class="text-sm {qty <= 3 && qty > 0 ? 'text-medium-carmine font-medium' : 'text-gray-500'}">
									{qty <= 0 ? 'Sold out' : `${qty} left`}
								</span>
							</div>
							<button
								disabled={qty <= 0}
								on:click={() => addDropItem(drop, item)}
								class="mt-3 w-full rounded-full py-2 text-sm font-medium transition-colors
									{qty <= 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-medium-carmine'}"
							>
								{qty <= 0 ? 'Sold Out' : 'Add to Cart'}
							</button>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	{/if}
</section>
