<script>
	import '../../app.css';
	import Footer from '$lib/components/Footer.svelte';
	import Header from '$lib/components/Header.svelte';
	let { children } = $props();
</script>

<Header></Header>
{@render children()}
<Footer></Footer>
