<script lang="ts">
	let date = '';
	let slots: any[] = [];
	let selectedSlot = '';
	let name = '';
	let email = '';
	let loading = false;
	let success = false;
	let errorMsg = '';

	// Min date = tomorrow
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	const minDate = tomorrow.toISOString().split('T')[0];

	async function loadSlots() {
		if (!date) return;
		const res = await fetch(`/api/slots?date=${date}`);
		slots = await res.json();
		selectedSlot = '';
	}

	async function book() {
		if (!date || !selectedSlot || !name || !email) {
			errorMsg = 'All fields required';
			return;
		}
		loading = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					items: [{ productId: 0, quantity: 1 }],
					email,
					name,
					reservationData: { date, timeSlot: selectedSlot }
				})
			});
			const data = await res.json();
			if (data.url) {
				window.location.href = data.url;
			} else {
				// Free reservation (no payment needed for now)
				success = true;
			}
		} catch {
			errorMsg = 'Something went wrong';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Reservations - Odd Fellow Coffee</title>
</svelte:head>

<section class="mx-auto max-w-screen-xl px-8 py-10">
	<h1 class="text-4xl">
		<span class="text-medium-carmine">R</span>eservations
	</h1>
	<p class="mt-2 text-gray-600">Book a pickup time for your order.</p>

	{#if success}
		<div class="mt-8 rounded-xl bg-green-50 p-6 text-center">
			<h2 class="text-2xl font-bold text-green-700">Reservation Confirmed!</h2>
			<p class="mt-2">See you on {date} at {selectedSlot}</p>
		</div>
	{:else}
		<div class="mt-8 max-w-md space-y-4">
			<div>
				<label for="date" class="block text-sm font-medium">Select Date</label>
				<input type="date" id="date" bind:value={date} min={minDate} on:change={loadSlots} class="mt-1 w-full rounded border px-4 py-2" />
			</div>

			{#if slots.length > 0}
				<div>
					<label class="block text-sm font-medium">Available Times</label>
					<div class="mt-2 grid grid-cols-2 gap-2">
						{#each slots as slot}
							{@const label = `${slot.start_time}-${slot.end_time}`}
							<button
								class="rounded-lg border p-2 text-sm transition-colors {selectedSlot === label ? 'border-medium-carmine bg-red-50 font-semibold' : 'hover:bg-gray-50'} {slot.available <= 0 ? 'cursor-not-allowed opacity-40' : ''}"
								disabled={slot.available <= 0}
								on:click={() => (selectedSlot = label)}
							>
								{label}
								<span class="block text-xs text-gray-400">{slot.available} spots</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<input bind:value={name} placeholder="Your name" class="w-full rounded border px-4 py-2" />
			<input bind:value={email} type="email" placeholder="Email" class="w-full rounded border px-4 py-2" />
			{#if errorMsg}<p class="text-sm text-red-500">{errorMsg}</p>{/if}
			<button
				on:click={book}
				disabled={loading || !selectedSlot}
				class="w-full rounded-full bg-black py-3 font-medium text-white hover:bg-medium-carmine disabled:opacity-50"
			>
				{loading ? 'Booking...' : 'Book Reservation'}
			</button>
		</div>
	{/if}
</section>
