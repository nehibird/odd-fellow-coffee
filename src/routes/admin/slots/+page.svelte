<script lang="ts">
	import { onMount } from 'svelte';

	let slots: any[] = [];
	let error = '';
	let showForm = false;
	let form = { day_of_week: 1, start_time: '07:00', end_time: '08:00', capacity: 5 };
	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	onMount(async () => {
		const res = await fetch('/api/admin/slots');
		if (res.ok) slots = await res.json();
		else error = 'Not authorized.';
	});

	async function addSlot() {
		await fetch('/api/admin/slots', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(form)
		});
		showForm = false;
		const res = await fetch('/api/admin/slots');
		if (res.ok) slots = await res.json();
	}

	async function removeSlot(id: number) {
		await fetch('/api/admin/slots', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id })
		});
		slots = slots.filter((s) => s.id !== id);
	}
</script>

<svelte:head><title>Time Slots - Admin</title></svelte:head>

<section class="mx-auto max-w-screen-xl px-8 py-10">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold">Time Slots</h1>
		<div class="flex gap-3">
			<button on:click={() => (showForm = !showForm)} class="rounded-full bg-black px-5 py-1.5 text-sm text-white hover:bg-medium-carmine">+ Add Slot</button>
			<a href="/admin" class="text-sm text-gray-500 hover:text-black">&larr; Dashboard</a>
		</div>
	</div>

	{#if error}<p class="mt-4 text-red-500">{error}</p>{/if}

	{#if showForm}
		<div class="mt-6 max-w-md space-y-3 rounded-xl border p-6">
			<select bind:value={form.day_of_week} class="w-full rounded border px-3 py-2">
				{#each days as day, i}<option value={i}>{day}</option>{/each}
			</select>
			<input type="time" bind:value={form.start_time} class="w-full rounded border px-3 py-2" />
			<input type="time" bind:value={form.end_time} class="w-full rounded border px-3 py-2" />
			<input type="number" bind:value={form.capacity} placeholder="Capacity" class="w-full rounded border px-3 py-2" />
			<button on:click={addSlot} class="rounded-full bg-black px-5 py-2 text-sm text-white hover:bg-medium-carmine">Save</button>
		</div>
	{/if}

	<div class="mt-6 space-y-2">
		{#each slots as slot}
			<div class="flex items-center justify-between rounded-lg border p-3">
				<span>{days[slot.day_of_week]} {slot.start_time}–{slot.end_time} (cap: {slot.capacity})</span>
				<button class="text-xs text-red-600 hover:underline" on:click={() => removeSlot(slot.id)}>Remove</button>
			</div>
		{/each}
	</div>
</section>
