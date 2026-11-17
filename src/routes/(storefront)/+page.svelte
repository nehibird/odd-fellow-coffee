<script lang="ts">
	import About from '$lib/components/About.svelte';
	import Gallery from '$lib/components/Gallery.svelte';
	import Hero from '$lib/components/Hero.svelte';

	export let data;
</script>

<Hero />

{#if data?.drinksEnabled}
	<!-- Drink ordering is the fastest path to a sale, so it gets a banner
	     above the slower-moving about/gallery content. Hidden entirely when
	     drink ordering is off. -->
	<section class="mx-auto max-w-screen-xl px-5 pt-10 sm:px-8">
		<div
			class="flex flex-col items-start gap-4 rounded-2xl bg-black p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8"
		>
			<div>
				<h2 class="text-2xl font-semibold sm:text-3xl">Iced coffee, ready when you are</h2>
				<p class="mt-1 text-sm text-white/80">
					Reserve ahead and pick it up at your window. Made fresh that day.
				</p>
			</div>
			<a
				href="/reservations"
				class="inline-block shrink-0 rounded-full bg-white px-7 py-3 font-medium text-black transition-colors hover:bg-medium-carmine hover:text-white"
			>
				Reserve a drink
			</a>
		</div>
	</section>
{/if}

<About />
<Gallery />
