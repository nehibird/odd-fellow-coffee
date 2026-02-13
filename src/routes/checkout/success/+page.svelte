<script lang="ts">
	import { onMount } from 'svelte';
	import { cart } from '$lib/components/CartStore';
	import { page } from '$app/stores';

	let orderId = '';
	let sessionId = '';

	onMount(() => {
		orderId = $page.url.searchParams.get('order_id') || '';
		sessionId = $page.url.searchParams.get('session_id') || '';
		cart.clear();
	});
</script>

<svelte:head>
	<title>Order Confirmed - Odd Fellow Coffee</title>
</svelte:head>

<section class="mx-auto max-w-screen-xl px-8 py-20 text-center">
	<div class="mx-auto max-w-md">
		<div class="text-6xl">{'\u2713'}</div>
		<h1 class="mt-4 text-3xl font-bold">Thank You!</h1>
		<p class="mt-2 text-gray-600">Your order has been confirmed.</p>
		{#if orderId}
			<p class="mt-1 text-sm text-gray-400">Order #{orderId}</p>
		{/if}
		<p class="mt-4 text-gray-600">You'll receive a confirmation email shortly.</p>
		<a href="/shop" class="mt-6 inline-block rounded-full bg-black px-8 py-3 text-white hover:bg-medium-carmine">Continue Shopping</a>
	</div>
</section>
