<script lang="ts">
	import { onMount } from 'svelte';

	let stats = $state({ orders: 0, products: 0, subscriptions: 0, pending: 0 });
	let recentOrders: any[] = $state([]);

	onMount(async () => {
		const [ordRes, prodRes, subRes] = await Promise.all([
			fetch('/api/admin/orders'),
			fetch('/api/admin/products'),
			fetch('/api/admin/subscriptions')
		]);

		if (ordRes.ok) {
			const orders = await ordRes.json();
			stats.orders = orders.length;
			stats.pending = orders.filter((o: any) => o.status === 'pending').length;
			recentOrders = orders.slice(0, 5);
		}
		if (prodRes.ok) {
			const products = await prodRes.json();
			stats.products = products.filter((p: any) => p.active !== 0).length;
		}
		if (subRes.ok) {
			const subs = await subRes.json();
			stats.subscriptions = subs.filter((s: any) => s.status === 'active').length;
		}
	});

	const statusBadge: Record<string, string> = {
		pending: 'bg-warning',
		confirmed: 'bg-info',
		fulfilled: 'bg-success'
	};
</script>

<svelte:head><title>Dashboard - Admin</title></svelte:head>

<div class="row">
	<div class="col-md-6 col-xl-3">
		<div class="card overflow-hidden">
			<div class="card-body">
				<div class="row">
					<div class="col-6">
						<div class="avatar-md bg-soft-primary rounded">
							<iconify-icon icon="solar:cart-5-bold-duotone" class="avatar-title fs-32 text-primary"></iconify-icon>
						</div>
					</div>
					<div class="col-6 text-end">
						<p class="text-muted mb-0 text-truncate">Total Orders</p>
						<h3 class="text-dark mt-1 mb-0">{stats.orders}</h3>
					</div>
				</div>
			</div>
			<div class="card-footer py-2 bg-light bg-opacity-50">
				<a href="/admin/orders" class="text-reset fw-semibold fs-12">View All Orders</a>
			</div>
		</div>
	</div>

	<div class="col-md-6 col-xl-3">
		<div class="card overflow-hidden">
			<div class="card-body">
				<div class="row">
					<div class="col-6">
						<div class="avatar-md bg-soft-success rounded">
							<iconify-icon icon="solar:t-shirt-bold-duotone" class="avatar-title fs-32 text-success"></iconify-icon>
						</div>
					</div>
					<div class="col-6 text-end">
						<p class="text-muted mb-0 text-truncate">Active Products</p>
						<h3 class="text-dark mt-1 mb-0">{stats.products}</h3>
					</div>
				</div>
			</div>
			<div class="card-footer py-2 bg-light bg-opacity-50">
				<a href="/admin/products" class="text-reset fw-semibold fs-12">Manage Products</a>
			</div>
		</div>
	</div>

	<div class="col-md-6 col-xl-3">
		<div class="card overflow-hidden">
			<div class="card-body">
				<div class="row">
					<div class="col-6">
						<div class="avatar-md bg-soft-info rounded">
							<iconify-icon icon="solar:repeat-bold-duotone" class="avatar-title fs-32 text-info"></iconify-icon>
						</div>
					</div>
					<div class="col-6 text-end">
						<p class="text-muted mb-0 text-truncate">Active Subscriptions</p>
						<h3 class="text-dark mt-1 mb-0">{stats.subscriptions}</h3>
					</div>
				</div>
			</div>
			<div class="card-footer py-2 bg-light bg-opacity-50">
				<a href="/admin/subscriptions" class="text-reset fw-semibold fs-12">View Subscriptions</a>
			</div>
		</div>
	</div>

	<div class="col-md-6 col-xl-3">
		<div class="card overflow-hidden">
			<div class="card-body">
				<div class="row">
					<div class="col-6">
						<div class="avatar-md bg-soft-warning rounded">
							<iconify-icon icon="solar:clock-circle-bold-duotone" class="avatar-title fs-32 text-warning"></iconify-icon>
						</div>
					</div>
					<div class="col-6 text-end">
						<p class="text-muted mb-0 text-truncate">Pending Orders</p>
						<h3 class="text-dark mt-1 mb-0">{stats.pending}</h3>
					</div>
				</div>
			</div>
			<div class="card-footer py-2 bg-light bg-opacity-50">
				<a href="/admin/orders" class="text-reset fw-semibold fs-12">Review Pending</a>
			</div>
		</div>
	</div>
</div>

<div class="row">
	<div class="col-12">
		<div class="card">
			<div class="card-header">
				<h4 class="card-title">Recent Orders</h4>
			</div>
			<div class="card-body p-0">
				<div class="table-responsive">
					<table class="table table-hover table-centered mb-0">
						<thead class="bg-light bg-opacity-50">
							<tr>
								<th>Order #</th>
								<th>Customer</th>
								<th>Total</th>
								<th>Status</th>
								<th>Date</th>
							</tr>
						</thead>
						<tbody>
							{#each recentOrders as order}
								<tr>
									<td><a href="/admin/orders" class="text-reset fw-medium">#{order.id}</a></td>
									<td>{order.customer_name || order.customer_email}</td>
									<td>${(order.total_cents / 100).toFixed(2)}</td>
									<td>
										<span class="badge {statusBadge[order.status] || 'bg-secondary'}">{order.status}</span>
									</td>
									<td>{new Date(order.created_at).toLocaleDateString()}</td>
								</tr>
							{/each}
							{#if recentOrders.length === 0}
								<tr>
									<td colspan="5" class="text-center text-muted py-4">No orders yet</td>
								</tr>
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</div>
