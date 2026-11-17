<script lang="ts">
	import { onMount } from 'svelte';

	interface Reservation {
		id: number;
		customer_name: string;
		customer_email: string;
		drink_count: number;
		total_cents: number;
		status: string;
		picked_up_at: string | null;
		no_show: number;
		drinks: Record<string, number>;
	}

	interface Slot {
		label: string;
		capacity_drinks: number | null;
		confirmed_drinks: number;
		pending_drinks: number;
		tally: Record<string, number>;
		reservations: Reservation[];
	}

	let date = $state('');
	let sheet = $state<{
		date: string;
		pickup_location: string;
		day_total_drinks: number;
		day_pending_drinks: number;
		day_revenue_cents: number;
		slots: Slot[];
	} | null>(null);
	let loading = $state(true);
	let errorMsg = $state('');
	let busyId = $state(0);

	async function load() {
		loading = true;
		errorMsg = '';
		try {
			const res = await fetch(`/api/admin/drinks${date ? `?date=${date}` : ''}`);
			if (!res.ok) throw new Error('Failed to load the run sheet.');
			sheet = await res.json();
			date = sheet!.date;
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : 'Failed to load the run sheet.';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	function shiftDay(delta: number) {
		// `date` is empty until the first load resolves, and the arrows render
		// immediately — Date.UTC(NaN) then throws out of the click handler.
		if (!date) return;
		const [y, m, d] = date.split('-').map(Number);
		const dt = new Date(Date.UTC(y, m - 1, d + delta));
		date = dt.toISOString().slice(0, 10);
		load();
	}

	async function mark(id: number, action: 'picked_up' | 'no_show' | 'reset') {
		busyId = id;
		try {
			const res = await fetch('/api/admin/reservations', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id, action })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				// A sheet left open all morning most often fails with an expired
				// admin cookie; saying so beats a generic message.
				throw new Error(
					res.status === 401
						? 'Your admin session expired. Please sign in again.'
						: body.message || 'Could not update that reservation.'
				);
			}
			await load();
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : 'Could not update that reservation.';
		} finally {
			busyId = 0;
		}
	}

	/** "14:45-15:15" -> "2:45 – 3:15 PM" */
	function windowLabel(label: string): string {
		const [a, b] = label.split('-');
		const to12 = (hhmm: string) => {
			const [h, m] = hhmm.split(':').map(Number);
			if (!Number.isInteger(h) || !Number.isInteger(m)) return { text: hhmm, suffix: '' };
			return {
				text: `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')}`,
				suffix: h >= 12 ? 'PM' : 'AM'
			};
		};
		if (!a || !b) return label;
		const s = to12(a);
		const e = to12(b);
		return s.suffix === e.suffix
			? `${s.text} – ${e.text} ${e.suffix}`
			: `${s.text} ${s.suffix} – ${e.text} ${e.suffix}`;
	}

	function prettyDate(d: string): string {
		const [y, m, dd] = d.split('-').map(Number);
		if (!Number.isInteger(y)) return d;
		return new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			timeZone: 'UTC'
		});
	}
</script>

<svelte:head><title>Drink Run Sheet - Admin</title></svelte:head>

<!-- Controls: on screen only. The printed sheet is what Deborah carries. -->
<div class="d-flex align-items-center no-print mb-3 flex-wrap gap-2">
	<button class="btn btn-light" disabled={loading || !date} onclick={() => shiftDay(-1)}
		>&larr; Previous</button
	>
	<input type="date" class="form-control" style="width:auto" bind:value={date} onchange={load} />
	<button class="btn btn-light" disabled={loading || !date} onclick={() => shiftDay(1)}
		>Next &rarr;</button
	>
	<button class="btn btn-light" onclick={load}>Refresh</button>
	<button class="btn btn-primary ms-auto" onclick={() => window.print()}>Print run sheet</button>
</div>

{#if errorMsg}
	<div class="alert alert-danger no-print">{errorMsg}</div>
{/if}

{#if loading}
	<p class="text-muted">Loading…</p>
{:else if sheet}
	<div class="run-sheet">
		<div class="card mb-3">
			<div class="card-body">
				<div class="d-flex justify-content-between align-items-start flex-wrap gap-3">
					<div>
						<h3 class="mb-1">{prettyDate(sheet.date)}</h3>
						{#if sheet.pickup_location}
							<p class="text-muted mb-0">Pickup at {sheet.pickup_location}</p>
						{:else}
							<p class="text-danger mb-0">No pickup location set.</p>
						{/if}
					</div>
					<div class="text-end">
						<div class="display-5 fw-bold lh-1">{sheet.day_total_drinks}</div>
						<div class="text-muted">drinks to make</div>
						{#if sheet.day_pending_drinks > 0}
							<div class="text-warning small mt-1">
								+{sheet.day_pending_drinks} unpaid, not counted
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		{#if sheet.slots.length === 0}
			<div class="alert alert-info">No drink windows configured for this day.</div>
		{/if}

		{#each sheet.slots as slot (slot.label)}
			<div class="card mb-3">
				<div class="card-header d-flex justify-content-between align-items-center">
					<h4 class="card-title mb-0">{windowLabel(slot.label)}</h4>
					<span class="fs-5 fw-semibold">
						{slot.confirmed_drinks}{#if slot.capacity_drinks}<span class="text-muted fw-normal"
								>&nbsp;of {slot.capacity_drinks}</span
							>{/if}
						{#if slot.pending_drinks > 0}
							<!-- Unpaid holds consume the SAME capacity on the storefront, so a
							     window can read sold out there while showing "0 of 12" here. -->
							<span class="text-warning fw-normal fs-6 ms-2">
								+{slot.pending_drinks} held
							</span>
						{/if}
					</span>
				</div>
				<div class="card-body">
					{#if Object.keys(slot.tally).length > 0}
						<!-- The number that matters at 6am: how many of each. -->
						<div class="d-flex mb-3 flex-wrap gap-4">
							{#each Object.entries(slot.tally) as [name, qty] (name)}
								<div>
									<span class="fs-3 fw-bold">{qty}</span>
									<span class="ms-1">{name}</span>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-muted mb-0">Nothing booked yet.</p>
					{/if}

					{#if slot.reservations.length > 0}
						<div class="table-responsive">
							<table class="table-sm table-centered mb-0 table">
								<thead class="bg-light bg-opacity-50">
									<tr>
										<th>Customer</th>
										<th>Drinks</th>
										<th>Paid</th>
										<th>Status</th>
										<th class="no-print">Mark</th>
									</tr>
								</thead>
								<tbody>
									{#each slot.reservations as r (r.id)}
										<tr class={r.status === 'pending' ? 'table-warning' : ''}>
											<td>
												<span class="fw-medium">{r.customer_name || '(no name)'}</span>
												<div class="text-muted small">{r.customer_email}</div>
											</td>
											<td>
												{#each Object.entries(r.drinks) as [n, q] (n)}
													<div>{q} &times; {n}</div>
												{/each}
											</td>
											<td>${(r.total_cents / 100).toFixed(2)}</td>
											<td>
												{#if r.status !== 'confirmed'}
													<span class="badge bg-warning">{r.status}</span>
												{:else if r.no_show}
													<span class="badge bg-danger">No-show</span>
												{:else if r.picked_up_at}
													<span class="badge bg-success">Picked up</span>
												{:else}
													<span class="badge bg-secondary">Waiting</span>
												{/if}
											</td>
											<td class="no-print">
												{#if r.status === 'confirmed'}
													{#if r.picked_up_at || r.no_show}
														<button
															class="btn btn-sm btn-light"
															disabled={busyId === r.id}
															onclick={() => mark(r.id, 'reset')}>Undo</button
														>
													{:else}
														<button
															class="btn btn-sm btn-success me-1"
															disabled={busyId === r.id}
															onclick={() => mark(r.id, 'picked_up')}>Picked up</button
														>
														<button
															class="btn btn-sm btn-outline-danger"
															disabled={busyId === r.id}
															onclick={() => mark(r.id, 'no_show')}>No-show</button
														>
													{/if}
												{:else}
													<span class="text-muted small">unpaid</span>
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}

<style>
	/* The printed sheet is the deliverable: one page, no chrome, no controls.
	   The admin shell renders a fixed sidebar and topbar that would otherwise
	   eat most of the page and push the table off the edge. */
	@media print {
		/* The Larkon theme already hides `.footer, .main-nav, .page-title-box,
		   .topbar` on print, so these are belt-and-braces against a theme change —
		   but the names are now the ones that actually match the rendered DOM. An
		   earlier guess of `.app-topbar` matched nothing at all.

		   `.no-print` is the part the theme does NOT cover: the date controls and
		   the per-row Mark buttons, which are useless on paper. */
		:global(.main-nav),
		:global(.topbar),
		:global(.footer),
		:global(footer),
		.no-print {
			display: none !important;
		}
		:global(.page-content),
		:global(.wrapper) {
			margin: 0 !important;
			padding: 0 !important;
		}
		.run-sheet :global(.card) {
			border: 1px solid #000 !important;
			box-shadow: none !important;
			break-inside: avoid;
			page-break-inside: avoid;
			margin-bottom: 10px !important;
		}
		.run-sheet {
			font-size: 12pt;
		}
		:global(body) {
			background: #fff !important;
		}
	}
</style>
