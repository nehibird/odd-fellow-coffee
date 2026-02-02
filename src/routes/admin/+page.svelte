<script lang="ts">
	import { onMount } from 'svelte';

	let username = '';
	let password = '';
	let loggedIn = false;
	let errorMsg = '';
	let loading = false;

	onMount(async () => {
		const res = await fetch('/api/admin/orders');
		if (res.ok) loggedIn = true;
	});

	async function login() {
		errorMsg = '';
		loading = true;
		try {
			const res = await fetch('/api/admin/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password })
			});
			if (res.ok) {
				loggedIn = true;
			} else {
				const data = await res.json().catch(() => null);
				errorMsg = data?.message || 'Invalid credentials';
			}
		} catch {
			errorMsg = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Admin - Odd Fellow Coffee</title>
</svelte:head>

<section class="mx-auto max-w-screen-xl px-8 py-10">
	{#if !loggedIn}
		<div class="mx-auto max-w-sm">
			<h1 class="text-3xl font-bold">Admin Login</h1>
			<input type="text" bind:value={username} placeholder="Username" autocomplete="username" class="mt-4 w-full rounded border px-4 py-2" />
			<input type="password" bind:value={password} placeholder="Password" autocomplete="current-password" class="mt-3 w-full rounded border px-4 py-2" on:keydown={(e) => e.key === 'Enter' && login()} />
			{#if errorMsg}<p class="mt-2 text-sm text-red-500">{errorMsg}</p>{/if}
			<button on:click={login} disabled={loading} class="mt-3 w-full rounded-full bg-black py-2 text-white hover:bg-medium-carmine disabled:opacity-50">
				{loading ? 'Logging in...' : 'Login'}
			</button>
		</div>
	{:else}
		<h1 class="text-3xl font-bold">Dashboard</h1>
		<div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<a href="/admin/orders" class="rounded-xl border p-6 transition-shadow hover:shadow-md">
				<h2 class="text-xl font-semibold">Orders</h2>
				<p class="text-gray-500">View and manage orders</p>
			</a>
			<a href="/admin/products" class="rounded-xl border p-6 transition-shadow hover:shadow-md">
				<h2 class="text-xl font-semibold">Products</h2>
				<p class="text-gray-500">Manage products and pricing</p>
			</a>
			<a href="/admin/reservations" class="rounded-xl border p-6 transition-shadow hover:shadow-md">
				<h2 class="text-xl font-semibold">Reservations</h2>
				<p class="text-gray-500">View bookings</p>
			</a>
			<a href="/admin/slots" class="rounded-xl border p-6 transition-shadow hover:shadow-md">
				<h2 class="text-xl font-semibold">Time Slots</h2>
				<p class="text-gray-500">Manage availability</p>
			</a>
			<a href="/admin/subscriptions" class="rounded-xl border p-6 transition-shadow hover:shadow-md">
				<h2 class="text-xl font-semibold">Subscriptions</h2>
				<p class="text-gray-500">View active subscriptions</p>
			</a>
			<a href="/admin/drops" class="rounded-xl border p-6 transition-shadow hover:shadow-md">
				<h2 class="text-xl font-semibold">Drops</h2>
				<p class="text-gray-500">Manage bake day drops</p>
			</a>
		</div>
	{/if}
</section>
