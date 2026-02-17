<script lang="ts">
	import { onMount } from 'svelte';
	import AdminSidebar from '$lib/components/admin/AdminSidebar.svelte';
	import AdminTopbar from '$lib/components/admin/AdminTopbar.svelte';

	let { children } = $props();
	let loggedIn = $state(false);
	let checking = $state(true);
	let username = $state('');
	let password = $state('');
	let errorMsg = $state('');
	let loading = $state(false);

	onMount(async () => {
		const res = await fetch('/api/admin/orders');
		if (res.ok) loggedIn = true;
		checking = false;
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

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') login();
	}
</script>

<svelte:head>
	<link rel="stylesheet" href="/admin/css/vendor.min.css" />
	<link rel="stylesheet" href="/admin/css/icons.min.css" />
	<link rel="stylesheet" href="/admin/css/app.min.css" />
	<script src="/admin/js/vendor.js" defer></script>
	<script src="/admin/js/app.js" defer></script>
</svelte:head>

{#if checking}
	<div class="d-flex align-items-center justify-content-center" style="min-height:100vh">
		<div class="spinner-border text-primary" role="status">
			<span class="visually-hidden">Loading...</span>
		</div>
	</div>
{:else if !loggedIn}
	<div class="d-flex align-items-center justify-content-center" style="min-height:100vh; background:#f5f5f5">
		<div class="card" style="width:100%;max-width:400px">
			<div class="card-body p-4">
				<div class="text-center mb-4">
					<img src="/assets/logo-rounded.svg" alt="Odd Fellow Coffee" style="height:60px" />
					<h4 class="mt-3">Admin Login</h4>
				</div>
				<div class="mb-3">
					<label for="admin-user" class="form-label">Username</label>
					<input id="admin-user" type="text" class="form-control" bind:value={username} autocomplete="username" />
				</div>
				<div class="mb-3">
					<label for="admin-pass" class="form-label">Password</label>
					<input id="admin-pass" type="password" class="form-control" bind:value={password} autocomplete="current-password" onkeydown={handleKeydown} />
				</div>
				{#if errorMsg}
					<div class="alert alert-danger py-2">{errorMsg}</div>
				{/if}
				<button class="btn btn-primary w-100" onclick={login} disabled={loading}>
					{loading ? 'Logging in...' : 'Sign In'}
				</button>
			</div>
		</div>
	</div>
{:else}
	<div class="wrapper">
		<AdminTopbar />
		<AdminSidebar />

		<div class="page-content">
			<div class="container-fluid">
				{@render children()}
			</div>

			<footer class="footer">
				<div class="container-fluid">
					<div class="row">
						<div class="col-12 text-center">
							<span class="text-muted">Odd Fellow Coffee Roasters &mdash; Admin</span>
						</div>
					</div>
				</div>
			</footer>
		</div>
	</div>
{/if}
