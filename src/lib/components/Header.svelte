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
</script>

<section class="mx-auto max-w-screen-xl">
	<div
		class="flex items-center justify-between bg-white px-4 py-2 shadow-md md:gap-40 md:px-16 md:shadow-none"
	>
		<Logo />
		<button
			class="flex cursor-pointer flex-col justify-start gap-2 border border-none md:hidden"
			on:click={toggleMenu}
			aria-label="Open Menu"
		>
			<div class="h-0.5 w-3 bg-black"></div>
			<div class="h-0.5 w-6 bg-black"></div>
			<div class="ml-3 h-0.5 w-3 bg-black"></div>
		</button>
		<ul class=" hidden items-center gap-28 text-sm capitalize md:flex">
			<li>
				<a href="">about</a>
			</li>
			<li>
				<a href="">gallery</a>
			</li>
			<li>
				<a href="">blog</a>
			</li>
		</ul>
		<div class="hidden rounded-full bg-black px-6 py-1.5 font-normal text-white md:block">
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
					<a href="#" class="block hover:cursor-pointer">home</a>
				</li>
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
				<li>
					<a href="" class="block h-7 w-7 hover:cursor-pointer"
						><img src="/assets/icons/facebook.svg" alt="facebook" class="h-full w-full" /></a
					>
				</li>

				<li>
					<a href="" class="block h-7 w-7 hover:cursor-pointer"
						><img src="/assets/icons/instagram.svg" alt="instagram" class="h-full w-full" /></a
					>
				</li>
			</ul>
		</div>
	{/if}
</section>
