<script lang="ts">
	const socialLinks = [
		{ href: '', src: '/assets/icons/facebook.svg', alt: 'facebook' },
		{ href: '', src: '/assets/icons/instagram.svg', alt: 'instagram' }
	];
</script>

<section class="relative mx-auto px-8 md:px-10 md:pt-16 lg:px-16">
	<div class="grid max-w-screen-xl grid-cols-1 gap-4 md:grid-cols-2">
		<div class="col-span-1">
			<h1 class=" py-8 text-4xl capitalize md:py-0 lg:text-5xl">
				odd fellow <span class="mt-2 block font-semibold text-medium-carmine">coffee roasters</span>
			</h1>
			<h2 class="py-8 text-sm font-bold lg:text-base">Beans for the brew and bread for the soul</h2>
			<ul class="list-inside list-disc pb-10 text-sm font-normal lg:text-base">
				<li>Freshly prepared homemmade sourdough bread</li>
				<li class="pt-6">Freshly roasted coffee beans</li>
			</ul>
			<div
				class="relative mx-4 w-[120px] rounded-full bg-black px-5 py-3 text-white duration-200 ease-in-out hover:bg-medium-carmine"
			>
				<a href="" class="block text-sm">Explore</a>
				<div
					class="absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-white"
				></div>
				<p></p>
			</div>
		</div>
		<div
			class="col-span-1 mt-6 flex transform cursor-pointer items-start justify-center gap-3 md:mt-0"
		>
			<div class="h-80 w-28 self-end rounded-full md:h-full md:w-36">
				<img
					src="/assets/images/hero/banner-3.jpg"
					alt="banner 1"
					class="h-full w-full rounded-full object-cover"
				/>
			</div>
			<div
				class="relative h-80 w-28 -translate-y-12 transform rounded-full duration-500 ease-in-out hover:translate-y-12 md:h-full md:w-36"
			>
				<img
					src="/assets/images/hero/banner-1.jpg"
					alt="banner 1"
					class="h-full w-full rounded-full object-cover"
				/>
				<!-- <div class="absolute -top-32 right-0 hidden md:block">
					<p class="rounded-full border border-black px-5 py-2 text-sm capitalize text-black/70">
						coffee beans
					</p>
					<p
						class="my-4 rounded-full border border-black bg-black px-5 py-2 text-sm capitalize text-white"
					>
						artisan bread
					</p>
				</div> -->
				<div
					class="absolute -bottom-10 left-1/2 h-2 w-6 -translate-x-1/2 transform rounded-full bg-medium-carmine"
				></div>
			</div>
			<div class="h-80 w-28 self-end rounded-full md:h-full md:w-36">
				<img
					src="/assets/images/hero/banner-2.jpg"
					alt="banner 1"
					class="h-full w-full rounded-full object-cover"
				/>
				<!-- md:rounded-none md:object-fill -->
			</div>
		</div>

		<!-- social icons -->
		<ul
			class="relative mt-10 flex items-center justify-end gap-5 py-8 md:absolute md:right-0 md:top-1/2 md:flex md:-translate-y-1/2 md:flex-col md:gap-2 md:rounded-l-2xl md:bg-white md:px-1.5 md:py-3 md:shadow-2xl md:shadow-black"
		>
			{#each socialLinks as { href, src, alt }}
				<li>
					<a {href} class="block h-7 w-7 hover:cursor-pointer">
						<img {src} {alt} class="h-full w-full" />
					</a>
				</li>
			{/each}
		</ul>
		<!-- <ul
			class="absolute right-0 top-1/2 hidden -translate-y-1/2 flex-col gap-2 rounded-l-2xl bg-white px-1.5 py-3 shadow-2xl shadow-black md:flex"
		>
			{#each socialLinks as { href, src, alt }}
				<li>
					<a {href} class="block h-7 w-7 hover:cursor-pointer">
						<img {src} {alt} class="h-full w-full" />
					</a>
				</li>
			{/each}
		</ul> -->
	</div>
</section>
