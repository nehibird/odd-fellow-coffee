<script>
	let contactIcons = [
		{ id: 'c1', src: '/assets/icons/telephone.svg', alt: 'telephone', info: '1 580-628-1542' },
		{ id: 'c2', src: '/assets/icons/email.svg', alt: 'email', info: 'oddfellowcoffee@birdherd.media' }
	];

	const socialLinks = [
		{ href: 'https://www.facebook.com/profile.php?id=61567007641925', src: '/assets/icons/facebook-white.svg', alt: 'facebook' },
		{ href: 'https://www.instagram.com/oddfellowcoffeeroasters', src: '/assets/icons/instagram-white.svg', alt: 'instagram' }
	];
</script>

<section id="contact" class="relative bg-black px-8 pt-10 md:pt-16">
	<div class="mx-auto grid max-w-screen-xl grid-cols-1 justify-center gap-8 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
		<div class="flex items-center gap-4 sm:flex-col sm:items-start sm:gap-0">
			<img
				src="/assets/logo-rounded.svg"
				alt=""
				class="w-20 rounded-full shadow-2xl shadow-black sm:w-24 md:w-32"
			/>
			<ul class="flex items-center gap-6 text-sm text-white sm:ml-4 sm:mt-6">
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
					<li class="flex items-center gap-2 pb-2">
						<img src={icon.src} alt={icon.alt} class="h-7 w-7 shrink-0" />
						<span class="text-sm text-white/70 break-all">{icon.info}</span>
					</li>
				{/each}
			</ul>
		</div>
		<div class="md:pt-0">
			<h5 class="red-underline text-xl text-white">Timings</h5>
			<p class="pt-6 text-sm text-white/70">
				Everyday: <span class="block">9:00 AM to 9:00 PM</span>
			</p>
		</div>
		<div class="md:pt-0">
			<h5 class="red-underline text-xl text-white">Page Links</h5>
			<ul class="flex list-disc flex-col gap-2 pl-4 pt-6 text-sm text-white/70">
				<li class="capitalize"><a href="/terms">Terms & Conditions</a></li>
				<li class="capitalize"><a href="/privacy">Privacy Policy</a></li>
				<li class="capitalize"><a href="/cookies">Cookies</a></li>
			</ul>
		</div>
	</div>
	<p class="py-6 text-center text-xs text-white">
		© 2026 Odd Fellow Coffee Roasters. <span class="block md:inline">All rights reserved.</span>
	</p>
</section>

<style lang="postcss">
	.red-underline {
		position: relative;
	}
	.red-underline::after {
		content: '';
		@apply absolute left-0 top-9 h-1 w-10 rounded-full bg-medium-carmine transition-all duration-500 ease-in-out md:hover:w-20;
	}
</style>
