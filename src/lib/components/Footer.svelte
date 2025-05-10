<script>
	let contactIcons = [
		{ id: 'c1', src: '/assets/icons/telephone.svg', alt: 'telephone', info: '1 580-628-1542' },
		{ id: 'c2', src: '/assets/icons/email.svg', alt: 'email', info: 'email@email.com' }
	];

	const socialLinks = [
		{ href: '', src: '/assets/icons/facebook-white.svg', alt: 'facebook' },
		{ href: '', src: '/assets/icons/instagram-white.svg', alt: 'instagram' }
	];
</script>

<section class="relative mx-auto max-w-screen-xl bg-black px-8 pt-10 md:px-10 md:pt-16 lg:px-16">
	<div class="grid grid-cols-2 justify-center md:grid-cols-4">
		<div class="">
			<img
				src="/assets/logo-rounded.svg"
				alt=""
				class="w-24 rounded-full shadow-2xl shadow-black md:block md:w-32"
			/>
			<ul class="ml-4 mt-6 flex items-center gap-6 text-sm text-white">
				{#each socialLinks as { href, src, alt }}
					<li>
						<a {href} class="block h-6 w-6 hover:cursor-pointer">
							<img {src} {alt} class="h-full w-full" />
						</a>
					</li>
				{/each}
			</ul>
		</div>
		<div class="">
			<h5 class="red-underline text-xl text-white">Contact Info</h5>
			<ul class="pt-7">
				{#each contactIcons as icon (icon.id)}
					<li class="flex h-7 w-7 items-center gap-2 pb-2">
						<img src={icon.src} alt={icon.alt} class="h-full w-full" />
						<span class="text-nowrap text-sm text-white/70">{icon.info}</span>
					</li>
				{/each}
			</ul>
		</div>
		<div class="pt-8 md:pt-0">
			<h5 class="red-underline text-xl text-white">Timings</h5>
			<p class="text-nowrap pt-6 text-sm text-white/70">
				Everyday: <span class="block">9:00 AM to 9:00 PM</span>
			</p>
		</div>
		<div class="pt-8 md:pt-0">
			<h5 class="red-underline text-xl text-white">Page Links</h5>
			<ul class="flex list-disc flex-col gap-2 pl-4 pt-6 text-sm text-white/70">
				<!-- <li class="capitalize">home</li>
				<li class="capitalize">gallery</li>
				<li class="capitalize">contact us</li> -->
				<li class="text-nowrap capitalize"><a href="">Terms & Conditions</a></li>
				<li class="text-nowrap capitalize"><a href="">Privacy Policy</a></li>
				<li class="text-nowrap capitalize"><a href="">Cookies</a></li>
			</ul>
		</div>
	</div>
	<p class="text-nowrap py-6 text-center text-xs text-white">
		© 2025 Odd Fellow Coffee Roasters. <span class="block md:inline">All rights reserved.</span>
	</p>
</section>

<style lang="postcss">
	.red-underline {
		position: relative;
	}
	.red-underline::after {
		content: '';
		@apply absolute left-0 top-9 h-1 w-10 rounded-full bg-medium-carmine;
	}
</style>
