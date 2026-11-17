<script lang="ts">
	import { tick, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { PUBLIC_STRIPE_PUBLISHABLE_KEY } from '$env/static/public';
	import { invalidateAll } from '$app/navigation';

	export let data;

	/** quantity per product id */
	let qty: Record<number, number> = {};
	let selectedDate = '';
	let selectedSlot = '';
	let name = '';
	let email = '';

	type Slot = {
		label: string;
		start_time: string;
		end_time: string;
		available_drinks: number;
		sold_out: boolean;
	};

	let slots: Slot[] = [];
	let slotsMessage: string | null = null;
	let loadingSlots = false;
	/** Guards against a slow earlier request overwriting a newer day's slots. */
	let slotsRequest = 0;

	let loading = false;
	let errorMsg = '';
	let showCheckout = false;
	let checkoutContainer: HTMLDivElement;
	/** Only the two methods this page uses, rather than reaching for `any`. */
	let stripeCheckout: { mount: (el: HTMLElement) => void; destroy: () => void } | null = null;

	/**
	 * The hold currently parked on the server.
	 *
	 * Capacity is taken before payment, so pressing Back and changing the order
	 * must not leave the old hold behind: with a daily cap in the low teens a
	 * customer could otherwise lock themselves out with their own abandoned
	 * attempts. Same order => reuse the session; different order => release the
	 * old one first.
	 */
	let activeSession: { id: string; clientSecret: string; signature: string } | null = null;

	$: totalDrinks = Object.values(qty).reduce((s, n) => s + (n || 0), 0);
	$: totalCents = data.drinks.reduce(
		(s: number, d: { id: number; price_cents: number }) => s + (qty[d.id] || 0) * d.price_cents,
		0
	);
	$: chosenSlot = slots.find((s) => s.label === selectedSlot);
	$: chosenDay = data.days.find((d: { date: string }) => d.date === selectedDate);
	$: allDaysClosed =
		data.days.length > 0 && data.days.every((d: { orderable: boolean }) => !d.orderable);
	$: emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
	/** What the server would be asked for. A change means the old hold is stale. */
	$: orderSignature = JSON.stringify({
		items: data.drinks
			.filter((d: { id: number }) => (qty[d.id] || 0) > 0)
			.map((d: { id: number }) => [d.id, qty[d.id]]),
		selectedDate,
		selectedSlot
	});

	$: canSubmit =
		totalDrinks > 0 &&
		totalDrinks <= data.maxDrinks &&
		!!selectedDate &&
		// The day list is rendered once; a page left open past the 8 PM cutoff
		// would otherwise keep offering a day that is now closed.
		chosenDay?.orderable === true &&
		!!selectedSlot &&
		!!chosenSlot &&
		!chosenSlot.sold_out &&
		totalDrinks <= chosenSlot.available_drinks &&
		!!name.trim() &&
		emailValid &&
		!loading;

	function step(id: number, delta: number) {
		const current = qty[id] || 0;
		const others = totalDrinks - current;
		// The server caps the ORDER, not each product, so clamp against what the
		// rest of the order already uses.
		const ceiling = Math.max(0, data.maxDrinks - others);
		qty = { ...qty, [id]: Math.max(0, Math.min(ceiling, current + delta)) };
	}

	/** Turn "14:45" into "2:45 PM". */
	function to12(hhmm: string): string {
		const [h, m] = hhmm.split(':').map(Number);
		if (!Number.isInteger(h) || !Number.isInteger(m)) return hhmm;
		const suffix = h >= 12 ? 'PM' : 'AM';
		const hour = h % 12 === 0 ? 12 : h % 12;
		return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
	}

	function windowLabel(s: { start_time: string; end_time: string }): string {
		return `${to12(s.start_time)} – ${to12(s.end_time)}`;
	}

	/** Hand back a hold the customer has walked away from. */
	async function releaseActiveHold() {
		const session = activeSession;
		activeSession = null;
		if (!session) return;
		try {
			await fetch('/api/reservations/release', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionId: session.id })
			});
		} catch {
			// The 30-minute Stripe expiry is the backstop.
		}
	}

	async function pickDate(date: string, orderable: boolean) {
		if (!orderable) return;
		selectedDate = date;
		selectedSlot = '';
		errorMsg = '';
		await loadSlots();
	}

	async function loadSlots() {
		if (!selectedDate) return;
		const date = selectedDate;
		const request = ++slotsRequest;
		loadingSlots = true;
		slots = [];
		slotsMessage = null;
		try {
			const res = await fetch(`/api/slots?type=drinks&date=${date}`);
			const body = await res.json();
			// Tapping day A then day B leaves two requests in flight; whichever
			// lands last would otherwise win and show A's windows under B's date.
			if (request !== slotsRequest || date !== selectedDate) return;
			slots = body.slots ?? [];
			slotsMessage = body.orderable ? null : body.message;
			const open = slots.filter((s) => !s.sold_out);
			if (open.length === 1) selectedSlot = open[0].label;
		} catch {
			if (request === slotsRequest)
				slotsMessage = 'We could not load pickup times. Please try again.';
		} finally {
			if (request === slotsRequest) loadingSlots = false;
		}
	}

	async function mountCheckout(clientSecret: string) {
		const { loadStripe } = await import('@stripe/stripe-js');
		const stripe = await loadStripe(PUBLIC_STRIPE_PUBLISHABLE_KEY);
		if (!stripe) {
			errorMsg = 'Failed to load the payment form.';
			return;
		}
		showCheckout = true;
		await tick();
		try {
			stripeCheckout = await stripe.initEmbeddedCheckout({ clientSecret });
			stripeCheckout.mount(checkoutContainer);
		} catch (e) {
			// Never orphan a mounted iframe: destroy before dropping the reference.
			stripeCheckout?.destroy();
			stripeCheckout = null;
			showCheckout = false;
			throw e;
		}
	}

	async function reserve() {
		if (!canSubmit) return;
		loading = true;
		errorMsg = '';
		try {
			// Same order as the hold we already have? Re-open it instead of taking
			// a second helping of a scarce day.
			if (activeSession && activeSession.signature === orderSignature) {
				await mountCheckout(activeSession.clientSecret);
				loading = false;
				return;
			}
			await releaseActiveHold();

			const items = data.drinks
				.filter((d: { id: number }) => (qty[d.id] || 0) > 0)
				.map((d: { id: number }) => ({ productId: d.id, quantity: qty[d.id] }));

			const res = await fetch('/api/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					items,
					email: email.trim(),
					name: name.trim(),
					reservationData: { date: selectedDate, timeSlot: selectedSlot }
				})
			});
			const body = await res.json().catch(() => ({}));

			// A failed request is a failure. This page used to treat any response
			// without a clientSecret as a successful free reservation and tell the
			// customer "Confirmed!" when nothing had been recorded.
			if (!res.ok) {
				errorMsg = body.message || 'We could not complete that reservation.';
				// 409 means the slot or day filled while they were deciding, so what
				// is on screen is stale.
				if (res.status === 409) {
					await loadSlots();
					await invalidateAll();
				}
				loading = false;
				return;
			}
			if (!body.clientSecret) {
				errorMsg = 'We could not start checkout. Please try again.';
				loading = false;
				return;
			}

			activeSession = {
				id: String(body.clientSecret).split('_secret_')[0],
				clientSecret: body.clientSecret,
				signature: orderSignature
			};
			await mountCheckout(body.clientSecret);
		} catch {
			errorMsg = 'Something went wrong. Please try again.';
			showCheckout = false;
		} finally {
			loading = false;
		}
	}

	function backToForm() {
		if (stripeCheckout) {
			stripeCheckout.destroy();
			stripeCheckout = null;
		}
		showCheckout = false;
		// The hold is kept so coming straight back reuses it; it is only released
		// if the order actually changes. Refresh the counts either way.
		loadSlots();
	}

	// Leaving the page with an unpaid hold should give the drinks back rather than
	// park them for the full session expiry. sendBeacon survives unload.
	function releaseOnUnload() {
		if (activeSession && browser && navigator.sendBeacon) {
			navigator.sendBeacon(
				'/api/reservations/release',
				new Blob([JSON.stringify({ sessionId: activeSession.id })], {
					type: 'application/json'
				})
			);
		}
	}

	onDestroy(() => {
		if (stripeCheckout) stripeCheckout.destroy();
		releaseOnUnload();
	});
</script>

<svelte:window on:pagehide={releaseOnUnload} />

<svelte:head>
	<title>Reserve Iced Coffee - Odd Fellow Coffee</title>
	<meta
		name="description"
		content="Reserve iced coffee and iced lattes for pickup in Tonkawa. Order ahead, pay online, pick up at your window."
	/>
</svelte:head>

<section class="mx-auto max-w-screen-md px-5 pb-28 pt-8 sm:px-8 sm:pb-10">
	{#if showCheckout}
		<button
			on:click={backToForm}
			class="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black"
		>
			<span>&larr;</span> Back
		</button>
		<div bind:this={checkoutContainer}></div>
	{:else if !data.enabled}
		<h1 class="text-4xl"><span class="text-medium-carmine">D</span>rinks</h1>
		<div class="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-900">
			<p class="font-semibold">Drink ordering is not open yet.</p>
			<p class="mt-1 text-sm">
				We are getting the iced coffee line ready. Check back soon, or
				<a href="/shop" class="underline">shop whole bean coffee</a> in the meantime.
			</p>
		</div>
	{:else if data.drinks.length === 0 || data.days.length === 0}
		<h1 class="text-4xl"><span class="text-medium-carmine">D</span>rinks</h1>
		<div class="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-900">
			<p class="font-semibold">No pickup days are open right now.</p>
			<p class="mt-1 text-sm">Please check back — we add days as we can make them.</p>
		</div>
	{:else}
		<h1 class="text-4xl">
			<span class="text-medium-carmine">R</span>eserve a drink
		</h1>
		<p class="mt-2 text-gray-600">
			Order ahead, pay now, and pick it up at your window. Made fresh that day.
		</p>

		{#if allDaysClosed}
			<!-- Every listed day is closed. Without this the customer just sees a
			     grid of grey buttons and no explanation. -->
			<div class="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
				Ordering is closed for every day we have open right now. Please check back tomorrow.
			</div>
		{/if}

		<!-- 1. Drinks -->
		<h2 class="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
			1. Choose your drinks
		</h2>
		<div class="mt-3 space-y-3">
			{#each data.drinks as drink (drink.id)}
				<div class="flex items-center justify-between gap-4 rounded-xl border p-4">
					<div class="min-w-0">
						<h3 class="font-semibold">{drink.name}</h3>
						{#if drink.description}
							<p class="mt-0.5 text-sm text-gray-500">{drink.description}</p>
						{/if}
						<p class="mt-1 font-bold text-medium-carmine">
							${(drink.price_cents / 100).toFixed(2)}
						</p>
					</div>
					<div class="flex shrink-0 items-center gap-3">
						<button
							type="button"
							aria-label={`Remove one ${drink.name}`}
							class="h-11 w-11 rounded-full bg-gray-100 text-xl leading-none disabled:opacity-40"
							disabled={(qty[drink.id] || 0) === 0}
							on:click={() => step(drink.id, -1)}>&minus;</button
						>
						<span class="w-6 text-center text-lg font-semibold">{qty[drink.id] || 0}</span>
						<button
							type="button"
							aria-label={`Add one ${drink.name}`}
							class="h-11 w-11 rounded-full bg-gray-100 text-xl leading-none disabled:opacity-40"
							disabled={totalDrinks >= data.maxDrinks}
							on:click={() => step(drink.id, 1)}>+</button
						>
					</div>
				</div>
			{/each}
		</div>
		{#if totalDrinks >= data.maxDrinks}
			<p class="mt-2 text-sm text-gray-600">
				{data.maxDrinks} drinks is the most we can take in one order.
			</p>
		{/if}

		<!-- 2. Day -->
		<h2 class="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">2. Pick a day</h2>
		<div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
			{#each data.days as day (day.date)}
				<button
					type="button"
					disabled={!day.orderable}
					class="rounded-xl border p-3 text-left transition-colors {selectedDate === day.date
						? 'border-medium-carmine bg-red-50 font-semibold'
						: 'hover:bg-gray-50'} {!day.orderable ? 'cursor-not-allowed opacity-60' : ''}"
					on:click={() => pickDate(day.date, day.orderable)}
				>
					<span class="block text-sm">{day.label}</span>
					{#if !day.orderable}
						<!-- The reason is rendered, not hidden in a title attribute:
						     phones never surface tooltips. -->
						<span class="mt-0.5 block text-xs leading-tight text-gray-500">{day.reason}</span>
					{/if}
				</button>
			{/each}
		</div>

		<!-- 3. Pickup window.
		     The heading always renders, even before a day is chosen. Gating the
		     whole block made the steps read 1, 2, 4, which looks broken. -->
		<h2 class="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">3. Pickup time</h2>
		{#if !selectedDate}
			<p class="mt-3 text-sm text-gray-500">Pick a day above and we will show what is left.</p>
		{:else if loadingSlots}
			<p class="mt-3 text-sm text-gray-500">Checking what is left…</p>
		{:else if slotsMessage}
			<p class="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{slotsMessage}</p>
		{:else if slots.length === 0}
			<p class="mt-3 text-sm text-gray-500">No pickup times that day.</p>
		{:else}
			<div class="mt-3 space-y-2">
				{#each slots as slot (slot.label)}
					<button
						type="button"
						disabled={slot.sold_out}
						class="flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors {selectedSlot ===
						slot.label
							? 'border-medium-carmine bg-red-50 font-semibold'
							: 'hover:bg-gray-50'} {slot.sold_out ? 'cursor-not-allowed opacity-50' : ''}"
						on:click={() => (selectedSlot = slot.label)}
					>
						<span>{windowLabel(slot)}</span>
						<span class="text-sm {slot.sold_out ? 'text-gray-500' : 'text-gray-600'}">
							{slot.sold_out ? 'Sold out' : `${slot.available_drinks} left`}
						</span>
					</button>
				{/each}
			</div>
			{#if chosenSlot && totalDrinks > chosenSlot.available_drinks}
				<p class="mt-2 text-sm text-red-600">
					Only {chosenSlot.available_drinks} left in that window. Please lower the count or pick another
					time.
				</p>
			{/if}
		{/if}

		<!-- 4. Who it is for -->
		<h2 class="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
			4. Your details
		</h2>
		<div class="mt-3 space-y-3">
			<label class="block">
				<span class="text-sm font-medium">Name</span>
				<input
					bind:value={name}
					autocomplete="name"
					placeholder="Who should we look for?"
					class="mt-1 w-full rounded-lg border px-4 py-3"
				/>
			</label>
			<label class="block">
				<span class="text-sm font-medium">Email</span>
				<input
					bind:value={email}
					type="email"
					inputmode="email"
					autocomplete="email"
					placeholder="you@example.com"
					class="mt-1 w-full rounded-lg border px-4 py-3"
				/>
				<span class="mt-1 block text-xs text-gray-500">
					Your confirmation and pickup details go here.
				</span>
			</label>
		</div>

		<!-- Summary + pay -->
		<div class="mt-8 rounded-2xl bg-gray-50 p-5">
			<div class="flex items-baseline justify-between">
				<span class="text-sm text-gray-600">
					{totalDrinks} drink{totalDrinks === 1 ? '' : 's'}
				</span>
				<span class="text-2xl font-bold">${(totalCents / 100).toFixed(2)}</span>
			</div>

			{#if totalDrinks > 0 && chosenDay?.orderable && chosenSlot}
				<p class="mt-3 text-sm text-gray-700">
					Ready <strong>{windowLabel(chosenSlot)}</strong> on
					<strong>{chosenDay.weekday}, {chosenDay.label.split(', ')[1]}</strong>.
				</p>
				{#if data.pickupLocation}
					<p class="mt-1 text-sm text-gray-700">
						Pickup at <strong>{data.pickupLocation}</strong>.
					</p>
				{:else}
					<p class="mt-1 text-sm text-gray-600">
						We will email you the pickup spot before your order is ready.
					</p>
				{/if}
			{/if}

			{#if errorMsg}
				<p class="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMsg}</p>
			{/if}

			<button
				on:click={reserve}
				disabled={!canSubmit}
				class="mt-4 w-full rounded-full bg-black py-4 text-base font-medium text-white hover:bg-medium-carmine disabled:opacity-40"
			>
				{loading ? 'Starting checkout…' : 'Reserve and pay'}
			</button>
			<p class="mt-2 text-center text-xs text-gray-500">
				Paid now so it is made and waiting. Reply to your confirmation email to change or cancel.
			</p>
		</div>
	{/if}
</section>
