<script lang="ts">
	import { page } from '$app/stores';

	let email = '';
	let token = '';
	let subs: any[] = [];
	let loaded = false;
	let error = '';

	// Check for token in URL (provided after subscription checkout)
	$: {
		const urlEmail = $page.url.searchParams.get('email');
		const urlToken = $page.url.searchParams.get('token');
		if (urlEmail && urlToken) {
			email = urlEmail;
			token = urlToken;
		}
	}

	async function lookup() {
		if (!email || !token) { error = 'Email and verification token required.'; return; }
		error = '';
		const res = await fetch(`/api/subscriptions?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`);
		if (res.ok) {
			subs = await res.json();
			loaded = true;
		} else {
			const data = await res.json().catch(() => null);
			error = data?.message || 'Could not look up subscriptions.';
		}
	}

	async function pauseOrResume(sub: any, action: 'pause' | 'resume') {
		const label = action === 'pause' ? 'Pause' : 'Resume';
		if (!confirm(`${label} your ${sub.frequency} ${sub.product_name} subscription?`)) return;
		const res = await fetch('/api/subscriptions', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ subscriptionId: sub.id, email, token, action })
		});
		if (res.ok) {
			subs = subs.map((s) =>
				s.id === sub.id ? { ...s, status: action === 'pause' ? 'paused' : 'active' } : s
			);
		}
	}

	let cancelTarget: any = null;
	let cancelReason = '';
	const cancelReasons = [
		'Too expensive',
		"Don't need as much coffee",
		'Switching brands',
		'Other'
	];

	function startCancel(sub: any) {
		cancelTarget = sub;
		cancelReason = '';
	}

	async function confirmCancel() {
		if (!cancelTarget) return;
		const res = await fetch('/api/subscriptions', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ subscriptionId: cancelTarget.id, email, token, reason: cancelReason })
		});
		if (res.ok) {
			subs = subs.map((s) => (s.id === cancelTarget.id ? { ...s, cancel_at_period_end: 1 } : s));
		}
		cancelTarget = null;
	}

	const statusColors: Record<string, string> = {
		active: 'bg-green-100 text-green-800',
		paused: 'bg-gray-100 text-gray-800',
		past_due: 'bg-yellow-100 text-yellow-800',
		canceled: 'bg-red-100 text-red-800'
	};
</script>

<svelte:head>
	<title>My Subscriptions - Odd Fellow Coffee</title>
</svelte:head>

<section class="mx-auto max-w-screen-xl px-8 py-10">
	<h1 class="text-4xl">
		<span class="text-medium-carmine">M</span>y Subscriptions
	</h1>

	<div class="mt-6 max-w-md space-y-3">
		<div>
			<label for="sub-email" class="block text-sm font-medium text-gray-700">Email</label>
			<input id="sub-email" bind:value={email} type="email" placeholder="you@example.com" class="mt-1 w-full rounded border px-4 py-2" />
		</div>
		<div>
			<label for="sub-token" class="block text-sm font-medium text-gray-700">Verification token</label>
			<input id="sub-token" bind:value={token} type="text" placeholder="From your confirmation email" class="mt-1 w-full rounded border px-4 py-2" on:keydown={(e) => e.key === 'Enter' && lookup()} />
			<p class="mt-1 text-xs text-gray-400">Your token was included in your subscription confirmation email.</p>
		</div>
		<button on:click={lookup} class="w-full rounded-full bg-black py-2 text-white hover:bg-medium-carmine">Look Up</button>
		{#if error}<p class="text-sm text-red-500">{error}</p>{/if}
	</div>

	{#if loaded}
		{#if subs.length === 0}
			<p class="mt-8 text-gray-500">No active subscriptions found for {email}.</p>
		{:else}
			<div class="mt-8 space-y-3">
				{#each subs as sub}
					<div class="flex items-center justify-between rounded-xl border p-4">
						<div>
							<p class="font-semibold">{sub.product_name || 'Subscription'}</p>
							<p class="text-sm text-gray-500">{sub.frequency}</p>
							{#if sub.current_period_end}
								<p class="text-xs text-gray-400">
									{sub.cancel_at_period_end ? 'Ends' : 'Renews'}: {new Date(sub.current_period_end).toLocaleDateString()}
								</p>
							{/if}
						</div>
						<div class="flex items-center gap-3">
							<span class="rounded-full px-3 py-1 text-xs font-medium {statusColors[sub.status] || 'bg-gray-100'}">{sub.status}</span>
							{#if sub.status === 'active' && !sub.cancel_at_period_end}
								<button class="text-xs text-yellow-600 hover:underline" on:click={() => pauseOrResume(sub, 'pause')}>Pause</button>
								<button class="text-xs text-red-500 hover:underline" on:click={() => startCancel(sub)}>Cancel</button>
							{:else if sub.status === 'paused'}
								<button class="text-xs text-green-600 hover:underline" on:click={() => pauseOrResume(sub, 'resume')}>Resume</button>
							{:else if sub.cancel_at_period_end}
								<span class="text-xs text-gray-400">Canceling</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}

	{#if cancelTarget}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div class="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
				<h3 class="text-lg font-semibold">Cancel Subscription</h3>
				<p class="mt-1 text-sm text-gray-500">We're sorry to see you go! Mind telling us why?</p>
				<select bind:value={cancelReason} class="mt-3 w-full rounded border px-3 py-2">
					<option value="">Select a reason...</option>
					{#each cancelReasons as reason}
						<option value={reason}>{reason}</option>
					{/each}
				</select>
				<div class="mt-4 flex gap-2">
					<button class="flex-1 rounded-full border py-2 hover:bg-gray-50" on:click={() => (cancelTarget = null)}>
						Keep Subscription
					</button>
					<button
						class="flex-1 rounded-full bg-red-500 py-2 text-white hover:bg-red-600 disabled:opacity-50"
						disabled={!cancelReason}
						on:click={confirmCancel}
					>
						Confirm Cancel
					</button>
				</div>
			</div>
		</div>
	{/if}
</section>
