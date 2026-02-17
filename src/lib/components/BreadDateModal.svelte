<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let leadDays: number = 2;
	export let deliveryDays: number[] = [1, 5]; // Monday=1, Friday=5

	const dispatch = createEventDispatcher<{ select: string; close: void }>();

	function getNextAvailableDates(): string[] {
		const dates: string[] = [];
		const today = new Date();
		const cutoff = new Date(today);
		cutoff.setDate(cutoff.getDate() + leadDays);

		const scan = new Date(cutoff);
		while (dates.length < 4) {
			if (deliveryDays.includes(scan.getDay())) {
				dates.push(
					scan.toLocaleDateString('en-US', {
						weekday: 'short',
						month: 'short',
						day: 'numeric'
					})
				);
			}
			scan.setDate(scan.getDate() + 1);
		}
		return dates;
	}

	const availableDates = getNextAvailableDates();
	let selectedDate = '';

	function confirm() {
		if (selectedDate) dispatch('select', selectedDate);
	}
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" on:click|self={() => dispatch('close')}>
	<div class="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
		<h3 class="text-lg font-semibold">Choose Delivery Date</h3>
		<p class="mt-1 text-sm font-semibold text-medium-carmine">
			Local delivery &amp; pickup only — Tonkawa area (74653)
		</p>
		<p class="mt-1 text-sm text-gray-500">
			Bread is baked fresh and available for local delivery or pickup on Mondays and Fridays.
			Orders require at least {leadDays} days advance notice.
		</p>

		<div class="mt-4 space-y-2">
			{#each availableDates as date}
				<label
					class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors {selectedDate === date ? 'border-medium-carmine bg-red-50' : 'border-gray-200 hover:bg-gray-50'}"
				>
					<input type="radio" bind:group={selectedDate} value={date} class="accent-medium-carmine" />
					<span class="text-sm font-medium">{date}</span>
				</label>
			{/each}
		</div>

		<div class="mt-4 flex gap-2">
			<button
				class="flex-1 rounded-full border py-2 text-sm hover:bg-gray-50"
				on:click={() => dispatch('close')}
			>
				Cancel
			</button>
			<button
				class="flex-1 rounded-full bg-black py-2 text-sm font-medium text-white hover:bg-medium-carmine disabled:opacity-50"
				disabled={!selectedDate}
				on:click={confirm}
			>
				Add to Cart
			</button>
		</div>
	</div>
</div>
