<script lang="ts">
	import { page } from '$app/stores';

	const navItems = [
		{ href: '/admin', label: 'Dashboard', icon: 'solar:widget-5-bold-duotone' },
		{ href: '/admin/orders', label: 'Orders', icon: 'solar:bag-smile-bold-duotone' },
		{ href: '/admin/products', label: 'Products', icon: 'solar:t-shirt-bold-duotone' },
		{ href: '/admin/subscriptions', label: 'Subscriptions', icon: 'solar:repeat-bold-duotone' },
		{ href: '/admin/drops', label: 'Drops', icon: 'solar:fire-bold-duotone' },
		{ href: '/admin/reservations', label: 'Reservations', icon: 'solar:calendar-bold-duotone' },
		{ href: '/admin/slots', label: 'Time Slots', icon: 'solar:clock-circle-bold-duotone' },
		{ href: '/admin/settings', label: 'Settings', icon: 'solar:settings-bold-duotone' },
	];

	function isActive(href: string, pathname: string): boolean {
		if (href === '/admin') return pathname === '/admin';
		return pathname.startsWith(href);
	}
</script>

<div class="main-nav">
	<div class="logo-box">
		<a href="/admin" class="logo-dark">
			<img src="/assets/logo-rounded.svg" class="logo-sm" alt="OFC" style="height:32px">
			<img src="/assets/logo-rounded.svg" class="logo-lg" alt="Odd Fellow Coffee" style="height:36px">
		</a>
		<a href="/admin" class="logo-light">
			<img src="/assets/logo-rounded.svg" class="logo-sm" alt="OFC" style="height:32px">
			<img src="/assets/logo-rounded.svg" class="logo-lg" alt="Odd Fellow Coffee" style="height:36px">
		</a>
	</div>

	<button type="button" class="button-sm-hover" aria-label="Show Full Sidebar">
		<iconify-icon icon="solar:double-alt-arrow-right-bold-duotone" class="button-sm-hover-icon"></iconify-icon>
	</button>

	<div class="scrollbar" data-simplebar>
		<ul class="navbar-nav" id="navbar-nav">
			<li class="menu-title">General</li>

			{#each navItems as item}
				<li class="nav-item">
					<a class="nav-link {isActive(item.href, $page.url.pathname) ? 'active' : ''}" href={item.href}>
						<span class="nav-icon">
							<iconify-icon icon={item.icon}></iconify-icon>
						</span>
						<span class="nav-text">{item.label}</span>
					</a>
				</li>
			{/each}

			<li class="menu-title mt-2">Quick Links</li>
			<li class="nav-item">
				<a class="nav-link" href="/" target="_blank">
					<span class="nav-icon">
						<iconify-icon icon="solar:shop-bold-duotone"></iconify-icon>
					</span>
					<span class="nav-text">View Store</span>
				</a>
			</li>
		</ul>
	</div>
</div>
