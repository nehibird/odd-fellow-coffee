<script>
	import '../../app.css';
	import Footer from '$lib/components/Footer.svelte';
	import Header from '$lib/components/Header.svelte';
	let { children, data } = $props();
</script>

<Header drinksEnabled={data?.drinksEnabled ?? false}></Header>
{@render children()}
<Footer></Footer>
