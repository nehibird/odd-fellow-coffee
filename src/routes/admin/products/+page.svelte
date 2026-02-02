<script lang="ts">
	import { onMount } from 'svelte';

	let products: any[] = [];
	let error = '';
	let showForm = false;
	let editing: any = null;
	let form = { name: '', category: 'coffee', description: '', price_cents: 0, variants: '', subscribable: false, image: '' };
	let saving = false;
	let toast = '';

	onMount(async () => {
		const res = await fetch('/api/admin/products');
		if (res.ok) products = await res.json();
		else error = 'Not authorized.';
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
		if (!confirm(`Deactivate "${name}"? It will no longer appear in the shop.`)) return;
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
	<div class="fixed top-4 right-4 z-50 rounded-lg px-4 py-2 text-sm text-white shadow-lg {toast.startsWith('Error') ? 'bg-red-600' : 'bg-green-600'}">{toast}</div>
{/if}

<section class="mx-auto max-w-screen-xl px-8 py-10">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold">Products</h1>
		<div class="flex gap-3">
			<button on:click={newProduct} class="rounded-full bg-black px-5 py-1.5 text-sm text-white hover:bg-medium-carmine">+ New Product</button>
			<a href="/admin" class="text-sm text-gray-500 hover:text-black">&larr; Dashboard</a>
		</div>
	</div>

	{#if error}<p class="mt-4 text-red-500">{error}</p>{/if}

	{#if showForm}
		<div class="mt-6 max-w-md space-y-3 rounded-xl border p-6">
			<input bind:value={form.name} placeholder="Name" class="w-full rounded border px-3 py-2" />
			<select bind:value={form.category} class="w-full rounded border px-3 py-2">
				<option value="coffee">Coffee</option>
				<option value="bakery">Bakery</option>
				<option value="hotplate">Hot Plate</option>
			</select>
			<input bind:value={form.description} placeholder="Description" class="w-full rounded border px-3 py-2" />
			<input type="number" bind:value={form.price_cents} placeholder="Price (cents)" class="w-full rounded border px-3 py-2" />
			<input bind:value={form.variants} placeholder='Variants JSON (optional)' class="w-full rounded border px-3 py-2" />
			<input bind:value={form.image} placeholder="Image filename" class="w-full rounded border px-3 py-2" />
			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" bind:checked={form.subscribable} /> Subscribable
			</label>
			<div class="flex gap-2">
				<button on:click={save} disabled={saving} class="rounded-full bg-black px-5 py-2 text-sm text-white hover:bg-medium-carmine disabled:opacity-50">
					{saving ? 'Saving...' : 'Save'}
				</button>
				<button on:click={() => (showForm = false)} class="rounded-full border px-5 py-2 text-sm">Cancel</button>
			</div>
		</div>
	{/if}

	<div class="mt-6 space-y-3">
		{#each products as p}
			<div class="flex items-center justify-between rounded-xl border p-4">
				<div>
					<p class="font-semibold">{p.name} <span class="text-xs text-gray-400">({p.category})</span></p>
					<p class="text-sm text-gray-500">${(p.price_cents / 100).toFixed(2)} {p.active ? '' : '(inactive)'}</p>
				</div>
				<div class="flex gap-2">
					<button class="text-xs text-blue-600 hover:underline" on:click={() => editProduct(p)}>Edit</button>
					<button class="text-xs text-red-600 hover:underline" on:click={() => deactivate(p.id, p.name)}>Deactivate</button>
				</div>
			</div>
		{/each}
	</div>
</section>
