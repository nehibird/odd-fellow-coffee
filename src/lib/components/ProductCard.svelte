<script lang="ts">
	import { cart } from './CartStore';

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

	let selectedVariant = '';
	let variants: { sizes?: string[]; grinds?: string[] } | null = null;

	$: if (product.variants) {
		try {
			variants = JSON.parse(product.variants);
			if (variants?.sizes?.length) selectedVariant = variants.sizes[0];
		} catch { variants = null; }
	}

	function addToCart() {
		cart.add({
			productId: product.id,
			name: product.name,
			price_cents: product.price_cents,
			quantity: 1,
			variant: selectedVariant || undefined,
			image: product.image || undefined
		});
	}

	// Subscribe state
	let showSubscribe = false;
	let subFrequency = 'weekly';
	let subEmail = '';
	let subLoading = false;
	let subError = '';

	async function subscribe() {
		if (!subEmail) { subError = 'Email required'; return; }
		subLoading = true;
		subError = '';
		try {
			const res = await fetch('/api/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ productId: product.id, frequency: subFrequency, email: subEmail })
			});
			const data = await res.json();
			if (data.url) {
				window.location.href = data.url;
			} else {
				subError = data.message || 'Failed to start subscription';
			}
		} catch {
			subError = 'Something went wrong';
		} finally {
			subLoading = false;
		}
	}
</script>

<div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
	<div class="mb-3 h-40 w-full overflow-hidden rounded-xl bg-gray-100">
		{#if product.image}
			<img src="/assets/images/products/{product.image}" alt={product.name} class="h-full w-full object-cover" />
		{:else}
			<div class="flex h-full items-center justify-center text-gray-400">
				<span class="text-4xl">☕</span>
			</div>
		{/if}
	</div>
	<span class="text-xs font-medium uppercase tracking-wider text-medium-carmine">{product.category}</span>
	<h3 class="mt-1 text-lg font-semibold">{product.name}</h3>
	<p class="mt-1 text-sm text-gray-600">{product.description}</p>
	<p class="mt-2 text-xl font-bold">${(product.price_cents / 100).toFixed(2)}</p>

	{#if variants?.sizes}
		<select bind:value={selectedVariant} class="mt-2 w-full rounded border px-2 py-1 text-sm">
			{#each variants.sizes as size}
				<option value={size}>{size}</option>
			{/each}
		</select>
	{/if}

	<button
		on:click={addToCart}
		class="mt-3 w-full rounded-full bg-black py-2 text-sm font-medium text-white transition-colors hover:bg-medium-carmine"
	>
		Add to Cart
	</button>

	{#if product.subscribable}
		{#if !showSubscribe}
			<button
				on:click={() => (showSubscribe = true)}
				class="mt-2 w-full rounded-full border border-medium-carmine py-2 text-sm font-medium text-medium-carmine transition-colors hover:bg-medium-carmine hover:text-white"
			>
				Subscribe
			</button>
		{:else}
			<div class="mt-2 space-y-2 rounded-lg border bg-gray-50 p-3">
				<select bind:value={subFrequency} class="w-full rounded border px-2 py-1 text-sm">
					<option value="weekly">Weekly</option>
					<option value="biweekly">Bi-weekly</option>
					<option value="monthly">Monthly</option>
				</select>
				<input bind:value={subEmail} type="email" placeholder="Your email" class="w-full rounded border px-2 py-1 text-sm" />
				{#if subError}<p class="text-xs text-red-500">{subError}</p>{/if}
				<button
					on:click={subscribe}
					disabled={subLoading}
					class="w-full rounded-full bg-medium-carmine py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
				>
					{subLoading ? 'Processing...' : 'Subscribe with Stripe'}
				</button>
				<button on:click={() => (showSubscribe = false)} class="w-full text-xs text-gray-400 hover:text-gray-600">Cancel</button>
			</div>
		{/if}
	{/if}
</div>
