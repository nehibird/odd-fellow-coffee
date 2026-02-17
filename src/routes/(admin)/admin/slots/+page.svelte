<script lang="ts">
	import { onMount } from 'svelte';

	let slots: any[] = $state([]);
	let error = $state('');
	let showForm = $state(false);
	let form = $state({ day_of_week: 1, start_time: '07:00', end_time: '08:00', capacity: 5 });
	let saving = $state(false);
	let toast = $state('');
	const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	onMount(async () => {
		const res = await fetch('/api/admin/slots');
		if (res.ok) slots = await res.json();
		else error = 'Failed to load slots.';
	});

	function showToast(msg: string) {
		toast = msg;
		setTimeout(() => (toast = ''), 3000);
	}

	async function addSlot() {
		if (form.capacity < 1) { showToast('Error: Capacity must be at least 1'); return; }
		if (form.start_time >= form.end_time) { showToast('Error: Start must be before end'); return; }
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
	<div class="position-fixed top-0 end-0 p-3" style="z-index:1080">
		<div class="toast show {toast.startsWith('Error') ? 'bg-danger' : 'bg-success'} text-white">
			<div class="toast-body">{toast}</div>
		</div>
	</div>
{/if}

{#if error}
	<div class="alert alert-danger">{error}</div>
{/if}

{#if showForm}
	<div class="card mb-3">
		<div class="card-header d-flex justify-content-between align-items-center">
			<h4 class="card-title mb-0">Add Time Slot</h4>
			<button class="btn btn-sm btn-light" onclick={() => (showForm = false)}>Cancel</button>
		</div>
		<div class="card-body">
			<div class="row g-3" style="max-width:500px">
				<div class="col-12">
					<label for="slot-day" class="form-label">Day of Week</label>
					<select id="slot-day" class="form-select" bind:value={form.day_of_week}>
						{#each days as day, i}<option value={i}>{day}</option>{/each}
					</select>
				</div>
				<div class="col-6">
					<label for="slot-start" class="form-label">Start Time</label>
					<input id="slot-start" type="time" class="form-control" bind:value={form.start_time} />
				</div>
				<div class="col-6">
					<label for="slot-end" class="form-label">End Time</label>
					<input id="slot-end" type="time" class="form-control" bind:value={form.end_time} />
				</div>
				<div class="col-12">
					<label for="slot-cap" class="form-label">Capacity</label>
					<input id="slot-cap" type="number" class="form-control" bind:value={form.capacity} min="1" />
				</div>
				<div class="col-12">
					<button class="btn btn-primary" onclick={addSlot} disabled={saving}>
						{saving ? 'Saving...' : 'Add Slot'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<div class="card">
	<div class="card-header d-flex justify-content-between align-items-center">
		<h4 class="card-title mb-0">Time Slots</h4>
		<button class="btn btn-primary btn-sm" onclick={() => (showForm = !showForm)}>
			<i class="bx bx-plus me-1"></i>Add Slot
		</button>
	</div>
	<div class="card-body p-0">
		<div class="table-responsive">
			<table class="table table-hover table-centered mb-0">
				<thead class="bg-light bg-opacity-50">
					<tr>
						<th>Day</th>
						<th>Time Range</th>
						<th>Capacity</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each slots as slot}
						<tr>
							<td class="fw-medium">{days[slot.day_of_week]}</td>
							<td>{slot.start_time} &ndash; {slot.end_time}</td>
							<td><span class="badge bg-soft-primary text-primary">{slot.capacity}</span></td>
							<td>
								<button class="btn btn-sm btn-soft-danger" onclick={() => removeSlot(slot.id)}>Remove</button>
							</td>
						</tr>
					{/each}
					{#if slots.length === 0}
						<tr><td colspan="4" class="text-center text-muted py-4">No time slots configured</td></tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
