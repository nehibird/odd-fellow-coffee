<script lang="ts">
	import { cart } from './CartStore';
	import { onMount } from 'svelte';
	import ShippingModal from './ShippingModal.svelte';

	export let product: {
		id: number;
		name: string;
		category: string;
		description: string;
		price_cents: number;
		variants: string | null;
		subscribable?: number;
		image: string | null;
	};

	let selectedSize = '';
	let selectedGrind = '';
	let variants: {
		sizes?: Array<{ name: string; price_cents: number }> | string[];
		grinds?: string[]
	} | null = null;

	function checkHasSizePricing(v: typeof variants): boolean {
		return !!(v?.sizes?.length && typeof v.sizes[0] === 'object' && 'price_cents' in (v.sizes[0] as any));
	}

	onMount(() => {
		if (product.variants) {
			try {
				variants = JSON.parse(product.variants);
				if (variants?.sizes?.length) {
					const hasPricing = checkHasSizePricing(variants);
					if (hasPricing) {
						selectedSize = (variants.sizes[0] as { name: string }).name;
					} else {
						selectedSize = variants.sizes[0] as string;
					}
				}
				if (variants?.grinds?.length) {
					selectedGrind = variants.grinds[0];
				}
			} catch { variants = null; }
		}
	});

	$: hasSizePricing = checkHasSizePricing(variants);

	$: currentPrice = (() => {
		if (hasSizePricing && selectedSize) {
			const sizeOption = (variants?.sizes as Array<{ name: string; price_cents: number }>)?.find(s => s.name === selectedSize);
			return sizeOption?.price_cents || product.price_cents;
		}
		return product.price_cents;
	})();

	$: variantString = [selectedSize, selectedGrind].filter(Boolean).join(' - ') || undefined;

	// Subscription discount (10% off)
	const SUB_DISCOUNT = 0.10;
	$: subPrice = Math.round(currentPrice * (1 - SUB_DISCOUNT));

	let addedToCart = false;

	function addToCart() {
		cart.add({
			productId: product.id,
			name: product.name,
			price_cents: currentPrice,
			quantity: 1,
			variant: variantString,
			image: product.image || undefined
		});
		addedToCart = true;
		setTimeout(() => { addedToCart = false; }, 2000);
	}

	// Subscribe state
	let showSubscribe = false;
	let subFrequency = 'weekly';
	let subEmail = '';
	let subError = '';
	let showShippingModal = false;

	$: estimatedDelivery = (() => {
		const date = new Date();
		date.setDate(date.getDate() + 7);
		return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	})();

	function openShippingModal() {
		if (!subEmail) { subError = 'Email required'; return; }
		subError = '';
		showShippingModal = true;
	}

</script>

<div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
	<div class="mb-3 h-40 w-full overflow-hidden rounded-xl bg-gray-100">
		{#if product.image}
			<img src="/assets/images/products/{product.image}" alt={product.name} class="h-full w-full object-cover" />
		{:else}
			<div class="flex h-full items-center justify-center text-gray-400">
				<span class="text-4xl">&#9749;</span>
			</div>
		{/if}
	</div>
	<span class="text-xs font-medium uppercase tracking-wider text-medium-carmine">{product.category}</span>
	<h3 class="mt-1 text-lg font-semibold">{product.name}</h3>
	<p class="mt-1 text-sm text-gray-600">{product.description}</p>
	<p class="mt-2 text-xl font-bold">${(currentPrice / 100).toFixed(2)}</p>

	{#if variants?.sizes}
		<div class="mt-3 flex flex-wrap gap-2">
			{#if hasSizePricing}
				{#each variants.sizes as size}
					<button
						on:click={() => { selectedSize = size.name; }}
						class="rounded-full px-3 py-1 text-xs font-medium transition-colors {selectedSize === size.name ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
					>
						{size.name}
					</button>
				{/each}
			{:else}
				{#each variants.sizes as size}
					<button
						on:click={() => { selectedSize = size; }}
						class="rounded-full px-3 py-1 text-xs font-medium transition-colors {selectedSize === size ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
					>
						{size}
					</button>
				{/each}
			{/if}
		</div>
	{/if}

	{#if variants?.grinds}
		<div class="mt-2 flex flex-wrap gap-1">
			{#each variants.grinds as grind}
				<button
					on:click={() => { selectedGrind = grind; }}
					class="rounded-full px-2 py-0.5 text-xs transition-colors {selectedGrind === grind ? 'bg-medium-carmine text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
				>
					{grind}
				</button>
			{/each}
		</div>
	{/if}

	<button
		on:click={addToCart}
		class="mt-3 w-full rounded-full py-2 text-sm font-medium transition-colors {addedToCart ? 'bg-green-600 text-white' : 'bg-black text-white hover:bg-medium-carmine'}"
	>
		{addedToCart ? '&#10003; Added!' : 'Add to Cart'}
	</button>

	{#if product.subscribable}
		{#if !showSubscribe}
			<button
				on:click={() => (showSubscribe = true)}
				class="mt-2 w-full rounded-full bg-medium-carmine py-2 text-sm font-medium text-white transition-colors hover:bg-black"
			>
				Subscribe & Save 10%
			</button>
		{:else}
			<div class="mt-2 space-y-2 rounded-lg border border-medium-carmine bg-red-50 p-3">
				<div class="text-center">
					<span class="text-sm text-gray-500 line-through">${(currentPrice / 100).toFixed(2)}</span>
					<span class="ml-2 text-lg font-bold text-medium-carmine">${(subPrice / 100).toFixed(2)}</span>
					<span class="ml-1 text-xs font-medium text-green-600">Save 10%</span>
				</div>
				{#if variantString}
					<p class="text-center text-xs text-gray-600">{variantString}</p>
				{/if}
				<select bind:value={subFrequency} class="w-full rounded border px-2 py-1 text-sm">
					<option value="weekly">Weekly — ${(subPrice / 100).toFixed(2)}/week</option>
					<option value="biweekly">Every 2 Weeks — ${(subPrice / 100).toFixed(2)}/2 weeks</option>
					<option value="monthly">Monthly — ${(subPrice / 100).toFixed(2)}/month</option>
				</select>
				<input bind:value={subEmail} type="email" placeholder="Your email" class="w-full rounded border px-2 py-1 text-sm" />
				{#if subError}<p class="text-xs text-red-500">{subError}</p>{/if}
				<p class="rounded bg-white px-2 py-1.5 text-center text-xs text-gray-700">
					First delivery: <span class="font-semibold">{estimatedDelivery}</span>
				</p>
				<button
					on:click={openShippingModal}
					class="w-full rounded-full bg-medium-carmine py-2 text-sm font-medium text-white hover:bg-black"
				>
					Start Subscription
				</button>
				<p class="text-center text-xs text-gray-500">Cancel anytime</p>
				<button on:click={() => (showSubscribe = false)} class="w-full text-xs text-gray-400 hover:text-gray-600">Back</button>
			</div>
		{/if}
	{/if}
</div>

{#if showShippingModal}
	<ShippingModal
		productId={product.id}
		productName={product.name}
		variant={variantString}
		frequency={subFrequency}
		email={subEmail}
		priceCents={currentPrice}
		{subPrice}
		on:close={() => (showShippingModal = false)}
	/>
{/if}
