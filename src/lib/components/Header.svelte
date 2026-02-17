<script lang="ts">
	import { fly } from 'svelte/transition';
	import { browser } from '$app/environment';
	import Logo from './icons/logo.svelte';
	import { cart } from './CartStore';

	let isMenuOpen: boolean = false;
	const toggleMenu = () => {
		isMenuOpen = !isMenuOpen;
	};

	let windowWidth: number = 0;
	let cartCount = 0;
	cart.subscribe((items) => { cartCount = items.reduce((s, i) => s + i.quantity, 0); });

	$: if (browser) {
		windowWidth = window.innerWidth;
		if (isMenuOpen) {
			document.body.classList.add('overflow-hidden');
		} else {
			document.body.classList.remove('overflow-hidden');
		}
	}
	const socialLinks = [
		{ href: 'https://www.facebook.com/profile.php?id=61567007641925', src: '/assets/icons/facebook.svg', alt: 'facebook' },
		{ href: 'https://www.instagram.com/oddfellowcoffeeroasters', src: '/assets/icons/instagram.svg', alt: 'instagram' }
	];
</script>

<section class="sticky top-0 z-10 bg-white md:relative">
	<div
		class="mx-auto flex max-w-screen-xl items-center justify-between bg-white px-4 py-2 shadow-md md:px-8 md:shadow-none"
	>
		<a href="/"><Logo /></a>
		<button
			class="flex cursor-pointer flex-col justify-start gap-2 border border-none md:hidden"
			on:click={toggleMenu}
			aria-label="Open Menu"
		>
			<div
				class="h-0.5 {isMenuOpen
					? 'w-6 -translate-y-0.5 rotate-45 bg-medium-carmine'
					: 'w-3 bg-black'} duration-300 ease-in-out"
			></div>
			<div
				class="h-0.5 w-6 bg-black {isMenuOpen ? 'hidden' : 'block'} duration-300 ease-in-out"
			></div>
			<div
				class="ml-3 h-0.5 w-3 {isMenuOpen
					? 'w-6 -translate-x-3 -translate-y-3 -rotate-45 bg-medium-carmine'
					: 'w-3 bg-black'} transform duration-300 ease-in-out"
			></div>
		</button>
		<ul
			class="hidden items-center gap-10 rounded-2xl bg-black/5 px-10 py-4 text-sm capitalize md:flex"
		>
			<li class="duration-300 ease-in-out hover:font-semibold">
				<a href="/#about" class="block h-full">about</a>
			</li>
			<li>
				<a href="/shop" class="duration-300 ease-in-out hover:font-semibold">shop</a>
			</li>
			<li class="relative">
				<a href="/cart" class="duration-300 ease-in-out hover:font-semibold">cart</a>
				{#if cartCount > 0}
					<span class="absolute -right-4 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-medium-carmine text-xs text-white">{cartCount}</span>
				{/if}
			</li>
		</ul>
		<div
			class="hidden rounded-full bg-black px-6 py-1.5 font-normal capitalize text-white md:block"
		>
			<a href="/#contact">contact</a>
		</div>
	</div>
	{#if isMenuOpen}
		<div
			transition:fly={{
				x: windowWidth >= 768 ? 1200 : 800,
				duration: 400
			}}
			class="fixed left-0 top-[125px] z-50 h-full w-full bg-white bg-cover bg-no-repeat py-8 md:hidden"
		>
			<ul
				class="flex flex-col gap-8 px-8 py-0 text-xl font-normal capitalize text-black md:items-center"
			>
				<li>
					<a href="/#about" class="block hover:cursor-pointer" on:click={() => (isMenuOpen = false)}>about</a>
				</li>
				<li>
					<a href="/shop" class="block hover:cursor-pointer" on:click={() => (isMenuOpen = false)}>shop</a>
				</li>
				<li>
					<a href="/cart" class="block hover:cursor-pointer" on:click={() => (isMenuOpen = false)}>
						cart {#if cartCount > 0}<span class="text-medium-carmine">({cartCount})</span>{/if}
					</a>
				</li>
				<li>
					<a href="/#contact" class="block hover:cursor-pointer" on:click={() => (isMenuOpen = false)}>contact</a>
				</li>
			</ul>
			<ul class="flex items-center gap-5 px-8 pt-10">
				{#each socialLinks as { href, src, alt }}
					<li>
						<a {href} class="block h-7 w-7 hover:cursor-pointer">
							<img {src} {alt} class="h-full w-full" />
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</section>

<!-- Mobile bottom navigation -->
<nav class="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white pb-safe md:hidden">
	<div class="flex items-center justify-around py-2">
		<a href="/" class="flex flex-col items-center px-4 py-1 text-gray-600 hover:text-black">
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
			</svg>
			<span class="text-xs">Home</span>
		</a>
		<a href="/shop" class="flex flex-col items-center px-4 py-1 text-gray-600 hover:text-black">
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
			</svg>
			<span class="text-xs">Shop</span>
		</a>
		<a href="/cart" class="relative flex flex-col items-center px-4 py-1 text-gray-600 hover:text-black">
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
			</svg>
			{#if cartCount > 0}
				<span class="absolute -top-1 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-medium-carmine text-xs font-bold text-white">{cartCount}</span>
			{/if}
			<span class="text-xs">Cart</span>
		</a>
		<button on:click={toggleMenu} class="flex flex-col items-center px-4 py-1 text-gray-600 hover:text-black">
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
			<span class="text-xs">Menu</span>
		</button>
	</div>
</nav>
