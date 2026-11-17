<script lang="ts">
	import { cart, type CartItem } from '$lib/components/CartStore';
	import { onMount, tick } from 'svelte';
	import { PUBLIC_STRIPE_PUBLISHABLE_KEY } from '$env/static/public';

	let items: CartItem[] = [];
	cart.subscribe((v) => (items = v));

	let loading = false;
	let errorMsg = '';
	let showCheckout = false;
	// Collected before the Stripe session is created so the correct shipping rate
	// can be set up front — Stripe no longer allows patching it in mid-checkout.
	let shippingZip = '';
	let checkoutContainer: HTMLDivElement;
	let stripeCheckout: any = null;

	$: total = items.reduce((sum, i) => sum + i.price_cents * i.quantity, 0);
	$: hasBakery = items.some((i) => i.category === 'bakery');

	async function checkout() {
		if (!/^\d{5}$/.test(shippingZip.trim())) {
			errorMsg = 'Please enter your 5-digit ZIP code so we can calculate shipping.';
			return;
		}
		loading = true;
		errorMsg = '';
		try {
			// Create checkout session on server
			const res = await fetch('/api/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					items: items.map((i) => ({
						productId: i.productId,
						quantity: i.quantity,
						variant: i.variant,
						price_cents: i.price_cents,
						dropItemId: i.dropItemId
					})),
					dropId: items[0]?.dropId || undefined,
					shippingZip: shippingZip.trim()
				})
			});
			const data = await res.json();
			if (!data.clientSecret) {
				errorMsg = data.message || 'Checkout failed';
				loading = false;
				return;
			}

			// Load Stripe and mount embedded checkout
			const { loadStripe } = await import('@stripe/stripe-js');
			const stripe = await loadStripe(PUBLIC_STRIPE_PUBLISHABLE_KEY);
			if (!stripe) {
				errorMsg = 'Failed to load payment processor';
				loading = false;
				return;
			}

			showCheckout = true;

			// Wait for Svelte to render the checkout container
			await tick();

			// No onShippingDetailsChange — the rate was already fixed from shippingZip.
			stripeCheckout = await stripe.initEmbeddedCheckout({
				clientSecret: data.clientSecret
			});

			stripeCheckout.mount(checkoutContainer);
		} catch (e) {
			errorMsg = 'Something went wrong';
			showCheckout = false;
		} finally {
			loading = false;
		}
	}

	function backToCart() {
		if (stripeCheckout) {
			stripeCheckout.destroy();
			stripeCheckout = null;
		}
		showCheckout = false;
	}

	onMount(() => {
		return () => {
			if (stripeCheckout) stripeCheckout.destroy();
		};
	});
</script>

<svelte:head>
	<title>Cart - Odd Fellow Coffee</title>
</svelte:head>

<section class="mx-auto max-w-screen-xl px-8 py-10">
	{#if showCheckout}
		<button
			on:click={backToCart}
			class="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black"
		>
			<span>&larr;</span> Back to cart
		</button>
		<div bind:this={checkoutContainer}></div>
	{:else}
		<h1 class="text-4xl">
			<span class="text-medium-carmine">C</span>art
		</h1>

		{#if items.length === 0}
			<p class="mt-8 text-gray-500">Your cart is empty.</p>
			<a href="/shop" class="mt-4 inline-block rounded-full bg-black px-6 py-2 text-white hover:bg-medium-carmine">Browse Shop</a>
		{:else}
			{#if hasBakery}
				<div class="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
					<strong>Bread orders are local only.</strong> Bakery items are available for delivery or pickup in the Tonkawa area (zip 74653) only. Non-local addresses will be rejected at checkout.
				</div>
			{/if}
			<div class="mt-6 space-y-4">
				{#each items as item}
					<div class="flex items-center justify-between rounded-xl border p-4">
						<div>
							<h3 class="font-semibold">{item.name}</h3>
							{#if item.variant}<p class="text-sm text-gray-500">{item.variant}</p>{/if}
							{#if item.deliveryDate}<p class="text-sm text-gray-500">Delivery: {item.deliveryDate}</p>{/if}
							<p class="text-medium-carmine font-bold">${(item.price_cents / 100).toFixed(2)}</p>
						</div>
						<div class="flex items-center gap-3">
							<button class="rounded bg-gray-100 px-3 py-1" on:click={() => cart.updateQuantity(item.productId, item.variant, item.quantity - 1, item.dropId, item.deliveryDate)}>-</button>
							<span class="w-8 text-center">{item.quantity}</span>
							<button class="rounded bg-gray-100 px-3 py-1" on:click={() => cart.updateQuantity(item.productId, item.variant, item.quantity + 1, item.dropId, item.deliveryDate)}>+</button>
							<button class="ml-4 text-red-500 hover:text-red-700" on:click={() => cart.remove(item.productId, item.variant, item.dropId, item.deliveryDate)}>Remove</button>
						</div>
					</div>
				{/each}
			</div>

			<div class="mt-6 border-t pt-4">
				<p class="text-right text-2xl font-bold">Total: ${(total / 100).toFixed(2)}</p>
			</div>

			<div class="mt-6 max-w-md space-y-3">
				<label class="block">
					<span class="text-sm font-medium">Delivery ZIP code</span>
					<input
						type="text"
						inputmode="numeric"
						maxlength="5"
						bind:value={shippingZip}
						placeholder="74653"
						class="mt-1 w-full rounded-lg border px-3 py-2"
					/>
					<span class="mt-1 block text-xs text-gray-500">
						{#if shippingZip.trim() === '74653'}
							Free local delivery or pickup in Tonkawa.
						{:else}
							Tonkawa (74653) gets free delivery or pickup. Everywhere else is $5.99 flat-rate shipping.
						{/if}
					</span>
				</label>
				{#if errorMsg}<p class="text-sm text-red-500">{errorMsg}</p>{/if}
				<button
					on:click={checkout}
					disabled={loading}
					class="w-full rounded-full bg-black py-3 font-medium text-white hover:bg-medium-carmine disabled:opacity-50"
				>
					{loading ? 'Loading checkout...' : 'Checkout with Stripe'}
				</button>
				<p class="text-center text-xs text-gray-400">Shipping calculated at checkout</p>
			</div>
		{/if}
	{/if}
</section>
