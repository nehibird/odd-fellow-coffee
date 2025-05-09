<script lang="ts">
	import { fly } from 'svelte/transition';
	import { browser } from '$app/environment';

	import Logo from './icons/logo.svelte';
	import Close from './icons/close.svelte';

	let isMenuOpen: boolean = false;
	const toggleMenu = () => {
		isMenuOpen = !isMenuOpen;
	};

	let windowWidth: number = 0;

	$: if (browser) {
		windowWidth = window.innerWidth;
		if (isMenuOpen) {
			document.body.classList.add('overflow-hidden');
		} else {
			document.body.classList.remove('overflow-hidden');
		}
	}
	const socialLinks = [
		{ href: '', src: '/assets/icons/facebook.svg', alt: 'facebook' },
		{ href: '', src: '/assets/icons/instagram.svg', alt: 'instagram' }
	];
</script>

<section class="mx-auto max-w-screen-xl">
	<div
		class="flex items-center justify-between bg-white px-4 py-2 shadow-md md:px-10 md:shadow-none lg:px-16"
	>
		<Logo />
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
			class=" hidden items-center gap-20 rounded-2xl bg-black/5 px-10 py-4 text-sm capitalize md:flex"
		>
			<li class="duration-300 ease-in-out hover:font-semibold">
				<a href="" class="block h-full">about</a>
			</li>
			<li>
				<a href="" class="duration-300 ease-in-out hover:font-semibold">gallery</a>
			</li>
		</ul>
		<div
			class="hidden rounded-full bg-black px-6 py-1.5 font-normal capitalize text-white md:block"
		>
			<a href="">contact</a>
		</div>
	</div>
	{#if isMenuOpen}
		<div
			transition:fly={{
				x: windowWidth >= 768 ? 1200 : 800,
				duration: 400
			}}
			class="absolute left-0 top-[125px] z-50 h-full w-full bg-white bg-cover bg-no-repeat py-8 md:hidden"
		>
			<ul
				class="flex flex-col gap-8 px-8 py-0 text-xl font-normal capitalize text-black md:items-center"
			>
				<li>
					<a href="#" class="block hover:cursor-pointer">about</a>
				</li>
				<li>
					<a href="#" class="block hover:cursor-pointer">gallery</a>
				</li>
				<li class="">
					<a href="#" class="block hover:cursor-pointer">contact</a>
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
