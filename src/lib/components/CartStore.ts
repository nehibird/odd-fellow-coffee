import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface CartItem {
	productId: number;
	name: string;
	price_cents: number;
	quantity: number;
	variant?: string;
	image?: string;
	dropId?: number;
	dropItemId?: number;
	deliveryDate?: string;
	category?: string;
}

function itemKey(i: { productId: number; variant?: string; dropId?: number; deliveryDate?: string }): string {
	return `${i.productId}-${i.variant || ''}-${i.dropId || ''}-${i.deliveryDate || ''}`;
}

function createCartStore() {
	const stored = browser ? JSON.parse(localStorage.getItem('ofc_cart') || '[]') : [];
	const { subscribe, set, update } = writable<CartItem[]>(stored);

	function persist(items: CartItem[]) {
		if (browser) localStorage.setItem('ofc_cart', JSON.stringify(items));
	}

	return {
		subscribe,
		add(item: CartItem) {
			update((items) => {
				const key = itemKey(item);
				const existing = items.find((i) => itemKey(i) === key);
				if (existing) {
					existing.quantity += item.quantity;
				} else {
					items.push(item);
				}
				persist(items);
				return [...items];
			});
		},
		remove(productId: number, variant?: string, dropId?: number, deliveryDate?: string) {
			update((items) => {
				const key = itemKey({ productId, variant, dropId, deliveryDate });
				const filtered = items.filter((i) => itemKey(i) !== key);
				persist(filtered);
				return filtered;
			});
		},
		updateQuantity(productId: number, variant: string | undefined, quantity: number, dropId?: number, deliveryDate?: string) {
			update((items) => {
				const key = itemKey({ productId, variant, dropId, deliveryDate });
				const item = items.find((i) => itemKey(i) === key);
				if (item) item.quantity = Math.max(1, quantity);
				persist(items);
				return [...items];
			});
		},
		clear() {
			set([]);
			persist([]);
		},
		get count() {
			let c = 0;
			subscribe((items) => { c = items.reduce((sum, i) => sum + i.quantity, 0); })();
			return c;
		}
	};
}

export const cart = createCartStore();
