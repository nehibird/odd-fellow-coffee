<script lang="ts">
	let galleryImages = [
		{
			id: 1,
			src: '/assets/images/gallery/1.jpg',
			alt: 'first'
		},
		{
			id: 2,
			src: '/assets/images/gallery/2.jpg',
			alt: 'second'
		},
		{
			id: 3,
			src: '/assets/images/gallery/3.jpg',
			alt: 'third'
		},
		{
			id: 4,
			src: '/assets/images/gallery/4.jpg',
			alt: 'fourth'
		},
		{
			id: 5,
			src: '/assets/images/gallery/5.jpg',
			alt: 'fifth'
		}
	];
</script>

<section class="white-overlay-right relative mx-auto max-w-screen-xl px-8 pb-10">
	<h3 class="w-full pb-6 text-left text-4xl capitalize md:pb-10">
		Expore <span class="mt-2 block font-semibold text-medium-carmine">our gallery</span>
	</h3>

	<div class="relative flex items-center gap-4 overflow-x-auto md:grid md:grid-cols-3 md:gap-8">
		{#each galleryImages as image, index (image.id)}
			<img
				src={image.src}
				alt={image.alt}
				class="h-48 w-48 rounded-2xl md:{index === 2
					? 'col-span-3 '
					: index === 0
						? 'col-span-1'
						: index === 1
							? 'col-span-2'
							: index === 3
								? 'col-span-2'
								: 'col-span-1'} object-cover md:h-full md:w-full"
			/>
		{/each}
	</div>

	<div class="px-6 py-10 md:px-16 md:py-16">
		<h4 class="text-center text-4xl font-light">Get Started</h4>

		<p class="pt-8 text-center text-base md:pt-10">
			We’re proud to be part of Oklahoma’s growing community of makers, growers, and neighbors who
			value quality over convenience. Odd Fellow isn’t just about what we make—it’s about who we
			make it for. Whether you’re down the road or across the state, we’re honored to share a little
			bit of our home with yours
		</p>
	</div>
</section>

<style lang="postcss">
	::-webkit-scrollbar {
		all: unset;
	}
	.white-overlay-right::after {
		@apply pointer-events-none absolute bottom-0 right-0 top-0 z-10 h-full w-24 md:hidden;
		content: '';
		background-image: linear-gradient(to right, rgba(255, 255, 255, 0), rgba(255, 255, 255, 1));
	}
</style>
