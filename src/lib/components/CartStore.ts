import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface CartItem {
	productId: number;
	name: string;
	price_cents: number;
	quantity: number;
	variant?: string;
	image?: string;
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
				const key = `${item.productId}-${item.variant || ''}`;
				const existing = items.find((i) => `${i.productId}-${i.variant || ''}` === key);
				if (existing) {
					existing.quantity += item.quantity;
				} else {
					items.push(item);
				}
				persist(items);
				return [...items];
			});
		},
		remove(productId: number, variant?: string) {
			update((items) => {
				const key = `${productId}-${variant || ''}`;
				const filtered = items.filter((i) => `${i.productId}-${i.variant || ''}` !== key);
				persist(filtered);
				return filtered;
			});
		},
		updateQuantity(productId: number, variant: string | undefined, quantity: number) {
			update((items) => {
				const key = `${productId}-${variant || ''}`;
				const item = items.find((i) => `${i.productId}-${i.variant || ''}` === key);
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
