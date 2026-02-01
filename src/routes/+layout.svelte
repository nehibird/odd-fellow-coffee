<script>
	import '../app.css';
	import Footer from '$lib/components/Footer.svelte';
	import Header from '$lib/components/Header.svelte';
	let { children } = $props();
</script>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="description" content="Odd Fellow Coffee Roasters" />
</svelte:head>

<Header></Header>
{@render children()}
<Footer></Footer>
