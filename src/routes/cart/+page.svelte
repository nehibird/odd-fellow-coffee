<script lang="ts">
	import { cart, type CartItem } from '$lib/components/CartStore';

	let items: CartItem[] = [];
	cart.subscribe((v) => (items = v));

	let email = '';
	let name = '';
	let loading = false;
	let errorMsg = '';

	$: total = items.reduce((sum, i) => sum + i.price_cents * i.quantity, 0);

	async function checkout() {
		if (!email) { errorMsg = 'Email is required'; return; }
		loading = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, variant: i.variant })),
					email,
					name
				})
			});
			const data = await res.json();
			if (data.url) {
				window.location.href = data.url;
			} else {
				errorMsg = data.message || 'Checkout failed';
			}
		} catch (e) {
			errorMsg = 'Something went wrong';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Cart - Odd Fellow Coffee</title>
</svelte:head>

<section class="mx-auto max-w-screen-xl px-8 py-10">
	<h1 class="text-4xl">
		<span class="text-medium-carmine">C</span>art
	</h1>

	{#if items.length === 0}
		<p class="mt-8 text-gray-500">Your cart is empty.</p>
		<a href="/shop" class="mt-4 inline-block rounded-full bg-black px-6 py-2 text-white hover:bg-medium-carmine">Browse Shop</a>
	{:else}
		<div class="mt-6 space-y-4">
			{#each items as item}
				<div class="flex items-center justify-between rounded-xl border p-4">
					<div>
						<h3 class="font-semibold">{item.name}</h3>
						{#if item.variant}<p class="text-sm text-gray-500">{item.variant}</p>{/if}
						<p class="text-medium-carmine font-bold">${(item.price_cents / 100).toFixed(2)}</p>
					</div>
					<div class="flex items-center gap-3">
						<button class="rounded bg-gray-100 px-3 py-1" on:click={() => cart.updateQuantity(item.productId, item.variant, item.quantity - 1)}>-</button>
						<span class="w-8 text-center">{item.quantity}</span>
						<button class="rounded bg-gray-100 px-3 py-1" on:click={() => cart.updateQuantity(item.productId, item.variant, item.quantity + 1)}>+</button>
						<button class="ml-4 text-red-500 hover:text-red-700" on:click={() => cart.remove(item.productId, item.variant)}>Remove</button>
					</div>
				</div>
			{/each}
		</div>

		<div class="mt-6 border-t pt-4">
			<p class="text-right text-2xl font-bold">Total: ${(total / 100).toFixed(2)}</p>
		</div>

		<div class="mt-6 max-w-md space-y-3">
			<input bind:value={name} placeholder="Your name" class="w-full rounded border px-4 py-2" />
			<input bind:value={email} type="email" placeholder="Email address" class="w-full rounded border px-4 py-2" required />
			{#if errorMsg}<p class="text-sm text-red-500">{errorMsg}</p>{/if}
			<button
				on:click={checkout}
				disabled={loading}
				class="w-full rounded-full bg-black py-3 font-medium text-white hover:bg-medium-carmine disabled:opacity-50"
			>
				{loading ? 'Processing...' : 'Checkout with Stripe'}
			</button>
		</div>
	{/if}
</section>
