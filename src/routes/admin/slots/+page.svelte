<script lang="ts">
	import { onMount } from 'svelte';

	let slots: any[] = [];
	let error = '';
	let showForm = false;
	let form = { day_of_week: 1, start_time: '07:00', end_time: '08:00', capacity: 5 };
	let saving = false;
	let toast = '';
	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	onMount(async () => {
		const res = await fetch('/api/admin/slots');
		if (res.ok) slots = await res.json();
		else error = 'Not authorized.';
	});

	function showToast(msg: string) {
		toast = msg;
		setTimeout(() => (toast = ''), 3000);
	}

	async function addSlot() {
		if (form.capacity < 1) { showToast('Error: Capacity must be at least 1'); return; }
		if (form.start_time >= form.end_time) { showToast('Error: Start time must be before end time'); return; }

		saving = true;
		try {
			const res = await fetch('/api/admin/slots', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(form)
			});
			if (!res.ok) throw new Error('Failed to add slot');
			showForm = false;
			const r = await fetch('/api/admin/slots');
			if (r.ok) slots = await r.json();
			showToast('Slot added');
		} catch (e: any) {
			showToast(`Error: ${e.message}`);
		} finally {
			saving = false;
		}
	}

	async function removeSlot(id: number) {
		if (!confirm('Remove this time slot?')) return;
		try {
			const res = await fetch('/api/admin/slots', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});
			if (!res.ok) throw new Error('Failed to remove slot');
			slots = slots.filter((s) => s.id !== id);
			showToast('Slot removed');
		} catch (e: any) {
			showToast(`Error: ${e.message}`);
		}
	}
</script>

<svelte:head><title>Time Slots - Admin</title></svelte:head>

{#if toast}
	<div class="fixed top-4 right-4 z-50 rounded-lg px-4 py-2 text-sm text-white shadow-lg {toast.startsWith('Error') ? 'bg-red-600' : 'bg-green-600'}">{toast}</div>
{/if}

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
			<input type="number" bind:value={form.capacity} placeholder="Capacity" min="1" class="w-full rounded border px-3 py-2" />
			<button on:click={addSlot} disabled={saving} class="rounded-full bg-black px-5 py-2 text-sm text-white hover:bg-medium-carmine disabled:opacity-50">
				{saving ? 'Saving...' : 'Save'}
			</button>
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
