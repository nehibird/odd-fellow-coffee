<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let productId: number;
	export let productName: string;
	export let variant: string | undefined;
	export let frequency: string;
	export let priceCents: number;
	export let subPrice: number;
	export let category: string = '';

	const dispatch = createEventDispatcher();

	let email = '';
	let shippingName = '';
	let line1 = '';
	let line2 = '';
	let city = '';
	let state = '';
	let zip = '';
	let submitting = false;
	let submitError = '';

	$: isLocal = zip.trim() === '74653';
	$: shippingCost = isLocal ? 0 : 599;
	$: totalCents = subPrice + shippingCost;

	const frequencyLabel = frequency === 'weekly' ? 'Weekly' : frequency === 'biweekly' ? 'Every 2 Weeks' : 'Monthly';

	const US_STATES = [
		'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
		'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
		'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
		'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
		'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
	];

	$: isBakery = category === 'bakery';

	function validate(): string | null {
		if (!email.trim()) return 'Email is required';
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address';
		if (!shippingName.trim()) return 'Full name is required';
		if (!line1.trim()) return 'Address is required';
		if (!city.trim()) return 'City is required';
		if (!state) return 'State is required';
		if (!/^\d{5}$/.test(zip.trim())) return 'Enter a valid 5-digit zip code';
		if (isBakery && zip.trim() !== '74653') return 'Bread subscriptions are available for local delivery only (Tonkawa 74653)';
		return null;
	}

	async function submit() {
		const err = validate();
		if (err) { submitError = err; return; }

		submitting = true;
		submitError = '';

		try {
			const res = await fetch('/api/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					productId,
					frequency,
					email: email.trim(),
					variant,
					price_cents: priceCents,
					shipping: {
						name: shippingName.trim(),
						line1: line1.trim(),
						line2: line2.trim(),
						city: city.trim(),
						state,
						zip: zip.trim()
					}
				})
			});
			const data = await res.json();
			if (data.url) {
				window.location.href = data.url;
			} else {
				submitError = data.message || 'Failed to start subscription';
			}
		} catch {
			submitError = 'Something went wrong';
		} finally {
			submitting = false;
		}
	}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" on:click|self={() => dispatch('close')}>
	<div class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-bold">Shipping Address</h2>
			<button on:click={() => dispatch('close')} class="text-2xl leading-none text-gray-400 hover:text-gray-600">&times;</button>
		</div>

		{#if isBakery}
			<div class="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-center text-sm font-medium text-amber-800">
				Bread subscriptions are local delivery only — Tonkawa area (74653)
			</div>
		{/if}

		<!-- Order Summary -->
		<div class="mb-4 rounded-lg bg-gray-50 p-3 text-sm">
			<p class="font-semibold">{productName}</p>
			{#if variant}<p class="text-gray-500">{variant}</p>{/if}
			<p class="text-gray-600">{frequencyLabel} subscription</p>
			<div class="mt-2 flex justify-between border-t pt-2">
				<span>Subtotal</span>
				<span>${(subPrice / 100).toFixed(2)}</span>
			</div>
			<div class="flex justify-between">
				<span>Shipping</span>
				<span class="{isLocal ? 'text-green-600 font-medium' : ''}">
					{#if !zip.trim()}TBD{:else if isLocal}FREE{:else}$5.99{/if}
				</span>
			</div>
			{#if zip.trim()}
				<div class="flex justify-between border-t pt-1 font-bold">
					<span>Total</span>
					<span>${(totalCents / 100).toFixed(2)}/{frequency === 'weekly' ? 'wk' : frequency === 'biweekly' ? '2wk' : 'mo'}</span>
				</div>
			{/if}
		</div>

		<form on:submit|preventDefault={submit} class="space-y-3">
			<div>
				<label for="ship-email" class="block text-xs font-medium text-gray-700">Email</label>
				<input id="ship-email" type="email" bind:value={email} autocomplete="email" placeholder="your@email.com" class="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
			</div>
			<div>
				<label for="ship-name" class="block text-xs font-medium text-gray-700">Full Name</label>
				<input id="ship-name" type="text" bind:value={shippingName} autocomplete="name" class="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
			</div>
			<div>
				<label for="ship-line1" class="block text-xs font-medium text-gray-700">Address</label>
				<input id="ship-line1" type="text" bind:value={line1} autocomplete="address-line1" class="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
			</div>
			<div>
				<label for="ship-line2" class="block text-xs font-medium text-gray-700">Apt / Suite <span class="text-gray-400">(optional)</span></label>
				<input id="ship-line2" type="text" bind:value={line2} autocomplete="address-line2" class="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
			</div>
			<div class="grid grid-cols-5 gap-2">
				<div class="col-span-2">
					<label for="ship-city" class="block text-xs font-medium text-gray-700">City</label>
					<input id="ship-city" type="text" bind:value={city} autocomplete="address-level2" class="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
				</div>
				<div class="col-span-1">
					<label for="ship-state" class="block text-xs font-medium text-gray-700">State</label>
					<select id="ship-state" bind:value={state} autocomplete="address-level1" class="mt-1 w-full rounded-lg border px-2 py-2 text-sm">
						<option value="">--</option>
						{#each US_STATES as st}
							<option value={st}>{st}</option>
						{/each}
					</select>
				</div>
				<div class="col-span-2">
					<label for="ship-zip" class="block text-xs font-medium text-gray-700">Zip</label>
					<input id="ship-zip" type="text" inputmode="numeric" maxlength="5" bind:value={zip} autocomplete="postal-code" class="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
				</div>
			</div>

			{#if zip.trim()}
				<p class="text-center text-sm {isLocal ? 'text-green-600 font-medium' : 'text-gray-500'}">
					{isLocal ? 'Free local delivery!' : 'Flat rate shipping: $5.99'}
				</p>
			{/if}

			{#if submitError}<p class="text-sm text-red-500">{submitError}</p>{/if}

			<button
				type="submit"
				disabled={submitting}
				class="w-full rounded-full bg-medium-carmine py-3 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
			>
				{submitting ? 'Processing...' : 'Complete Subscription'}
			</button>
		</form>
	</div>
</div>
