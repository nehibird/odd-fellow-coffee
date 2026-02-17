<script lang="ts">
	import ProductCard from '$lib/components/ProductCard.svelte';

	export let data;
	$: products = data.products;
	let activeCategory = 'all';
	const categories = ['all', 'coffee', 'bakery'];

	$: filtered = activeCategory === 'all' ? products : products.filter((p: any) => p.category === activeCategory);
</script>

<svelte:head>
	<title>Shop - Odd Fellow Coffee</title>
</svelte:head>

<section class="mx-auto max-w-screen-xl px-8 py-10">
	<h1 class="text-4xl">
		<span class="text-medium-carmine">S</span>hop
	</h1>
	<p class="mt-2 text-gray-600">Fresh roasted coffee and homemade sourdough — order for pickup or subscribe.</p>

	<div class="mt-6 flex gap-3">
		{#each categories as cat}
			<button
				class="rounded-full px-5 py-1.5 text-sm capitalize transition-colors {activeCategory === cat ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}"
				on:click={() => (activeCategory = cat)}
			>
				{cat === 'all' ? 'All' : cat}
			</button>
		{/each}
	</div>

	<div class="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
		{#each filtered as product (product.id)}
			<ProductCard {product} />
		{/each}
	</div>

	{#if filtered.length === 0}
		<p class="mt-12 text-center text-gray-400">No products found.</p>
	{/if}
</section>
