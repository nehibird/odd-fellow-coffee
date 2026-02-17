<script>
	let { children } = $props();
</script>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="description" content="Odd Fellow Coffee Roasters" />
</svelte:head>

{@render children()}
