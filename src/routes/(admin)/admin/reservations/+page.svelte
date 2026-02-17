<script lang="ts">
	import { onMount } from 'svelte';

	let reservations: any[] = $state([]);
	let error = $state('');

	onMount(async () => {
		const res = await fetch('/api/admin/reservations');
		if (res.ok) reservations = await res.json();
		else error = 'Failed to load reservations.';
	});

	const statusBadge: Record<string, string> = {
		confirmed: 'bg-success',
		pending: 'bg-warning',
		canceled: 'bg-danger'
	};
</script>

<svelte:head><title>Reservations - Admin</title></svelte:head>

{#if error}
	<div class="alert alert-danger">{error}</div>
{/if}

<div class="card">
	<div class="card-header">
		<h4 class="card-title">Reservations</h4>
	</div>
	<div class="card-body p-0">
		<div class="table-responsive">
			<table class="table table-hover table-centered mb-0">
				<thead class="bg-light bg-opacity-50">
					<tr>
						<th>Customer</th>
						<th>Date</th>
						<th>Time Slot</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{#each reservations as r}
						<tr>
							<td class="fw-medium">{r.customer_name || r.customer_email}</td>
							<td>{r.reservation_date}</td>
							<td>{r.time_slot}</td>
							<td><span class="badge {statusBadge[r.status] || 'bg-secondary'}">{r.status}</span></td>
						</tr>
					{/each}
					{#if reservations.length === 0}
						<tr><td colspan="4" class="text-center text-muted py-4">No reservations</td></tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
