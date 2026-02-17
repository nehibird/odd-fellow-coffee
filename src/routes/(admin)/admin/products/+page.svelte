<script lang="ts">
	import { onMount } from 'svelte';

	let products: any[] = $state([]);
	let error = $state('');
	let showForm = $state(false);
	let editing: any = $state(null);
	let form = $state({ name: '', category: 'coffee', description: '', price_cents: 0, variants: '', subscribable: false, image: '' });
	let saving = $state(false);
	let toast = $state('');

	onMount(async () => {
		const res = await fetch('/api/admin/products');
		if (res.ok) products = await res.json();
		else error = 'Failed to load products.';
	});

	function showToast(msg: string) {
		toast = msg;
		setTimeout(() => (toast = ''), 3000);
	}

	function editProduct(p: any) {
		editing = p;
		form = { ...p, subscribable: !!p.subscribable, price_cents: p.price_cents };
		showForm = true;
	}

	function newProduct() {
		editing = null;
		form = { name: '', category: 'coffee', description: '', price_cents: 0, variants: '', subscribable: false, image: '' };
		showForm = true;
	}

	async function save() {
		if (!form.name.trim()) { showToast('Error: Name is required'); return; }
		if (form.price_cents <= 0) { showToast('Error: Price must be greater than 0'); return; }
		saving = true;
		try {
			const method = editing ? 'PUT' : 'POST';
			const body = editing ? { ...form, id: editing.id, active: true } : form;
			const res = await fetch('/api/admin/products', {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Save failed');
			showForm = false;
			const r = await fetch('/api/admin/products');
			if (r.ok) products = await r.json();
			showToast(editing ? 'Product updated' : 'Product created');
		} catch (e: any) {
			showToast(`Error: ${e.message}`);
		} finally {
			saving = false;
		}
	}

	async function deactivate(id: number, name: string) {
		if (!confirm(`Deactivate "${name}"?`)) return;
		try {
			const res = await fetch('/api/admin/products', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});
			if (!res.ok) throw new Error('Deactivate failed');
			products = products.filter((p) => p.id !== id);
			showToast(`"${name}" deactivated`);
		} catch (e: any) {
			showToast(`Error: ${e.message}`);
		}
	}
</script>

<svelte:head><title>Products - Admin</title></svelte:head>

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
			<h4 class="card-title mb-0">{editing ? 'Edit Product' : 'New Product'}</h4>
			<button class="btn btn-sm btn-light" onclick={() => (showForm = false)}>Cancel</button>
		</div>
		<div class="card-body">
			<div class="row g-3">
				<div class="col-md-6">
					<label for="prod-name" class="form-label">Name</label>
					<input id="prod-name" class="form-control" bind:value={form.name} />
				</div>
				<div class="col-md-3">
					<label for="prod-cat" class="form-label">Category</label>
					<select id="prod-cat" class="form-select" bind:value={form.category}>
						<option value="coffee">Coffee</option>
						<option value="bakery">Bakery</option>
					</select>
				</div>
				<div class="col-md-3">
					<label for="prod-price" class="form-label">Price (cents)</label>
					<input id="prod-price" type="number" class="form-control" bind:value={form.price_cents} />
				</div>
				<div class="col-12">
					<label for="prod-desc" class="form-label">Description</label>
					<input id="prod-desc" class="form-control" bind:value={form.description} />
				</div>
				<div class="col-md-6">
					<label for="prod-variants" class="form-label">Variants JSON</label>
					<input id="prod-variants" class="form-control" bind:value={form.variants} placeholder='Optional' />
				</div>
				<div class="col-md-4">
					<label for="prod-image" class="form-label">Image filename</label>
					<input id="prod-image" class="form-control" bind:value={form.image} />
				</div>
				<div class="col-md-2 d-flex align-items-end">
					<div class="form-check">
						<input class="form-check-input" type="checkbox" bind:checked={form.subscribable} id="subscribable" />
						<label class="form-check-label" for="subscribable">Subscribable</label>
					</div>
				</div>
			</div>
			<button class="btn btn-primary mt-3" onclick={save} disabled={saving}>
				{saving ? 'Saving...' : 'Save Product'}
			</button>
		</div>
	</div>
{/if}

<div class="card">
	<div class="card-header d-flex justify-content-between align-items-center">
		<h4 class="card-title mb-0">Products</h4>
		<button class="btn btn-primary btn-sm" onclick={newProduct}>
			<i class="bx bx-plus me-1"></i>Add Product
		</button>
	</div>
	<div class="card-body p-0">
		<div class="table-responsive">
			<table class="table table-hover table-centered mb-0">
				<thead class="bg-light bg-opacity-50">
					<tr>
						<th>Product</th>
						<th>Category</th>
						<th>Price</th>
						<th>Status</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each products as p}
						<tr>
							<td>
								<div class="d-flex align-items-center gap-2">
									{#if p.image}
										<img src="/assets/images/{p.image}" alt="" class="rounded" style="width:40px;height:40px;object-fit:cover" />
									{:else}
										<div class="avatar-sm bg-soft-primary rounded d-flex align-items-center justify-content-center">
											<iconify-icon icon="solar:t-shirt-bold-duotone" class="text-primary fs-20"></iconify-icon>
										</div>
									{/if}
									<div>
										<h6 class="mb-0">{p.name}</h6>
										{#if p.description}<small class="text-muted">{p.description}</small>{/if}
									</div>
								</div>
							</td>
							<td><span class="badge bg-soft-primary text-primary">{p.category}</span></td>
							<td>${(p.price_cents / 100).toFixed(2)}</td>
							<td>
								{#if p.active !== 0}
									<span class="badge bg-success">Active</span>
								{:else}
									<span class="badge bg-secondary">Inactive</span>
								{/if}
								{#if p.subscribable}
									<span class="badge bg-soft-info text-info ms-1">Sub</span>
								{/if}
							</td>
							<td>
								<button class="btn btn-sm btn-soft-primary me-1" onclick={() => editProduct(p)}>Edit</button>
								<button class="btn btn-sm btn-soft-danger" onclick={() => deactivate(p.id, p.name)}>Deactivate</button>
							</td>
						</tr>
					{/each}
					{#if products.length === 0}
						<tr><td colspan="5" class="text-center text-muted py-4">No products yet</td></tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
