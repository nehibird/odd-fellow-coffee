<script lang="ts">
	let { pageTitle = 'Dashboard' }: { pageTitle?: string } = $props();

	function toggleTheme() {
		const html = document.documentElement;
		const current = html.getAttribute('data-bs-theme');
		html.setAttribute('data-bs-theme', current === 'dark' ? 'light' : 'dark');
	}

	async function logout() {
		await fetch('/api/admin/login', { method: 'DELETE' });
		window.location.href = '/admin';
	}
</script>

<header class="topbar">
	<div class="container-fluid">
		<div class="navbar-header">
			<div class="d-flex align-items-center">
				<div class="topbar-item">
					<button type="button" class="button-toggle-menu me-2" aria-label="Toggle sidebar">
						<iconify-icon icon="solar:hamburger-menu-broken" class="fs-24 align-middle"></iconify-icon>
					</button>
				</div>

				<div class="topbar-item">
					<h4 class="fw-bold topbar-button pe-none text-uppercase mb-0">{pageTitle}</h4>
				</div>
			</div>

			<div class="d-flex align-items-center gap-1">
				<div class="topbar-item">
					<button type="button" class="topbar-button" id="light-dark-mode" onclick={toggleTheme} aria-label="Toggle theme">
						<iconify-icon icon="solar:moon-bold-duotone" class="fs-24 align-middle"></iconify-icon>
					</button>
				</div>

				<div class="dropdown topbar-item">
					<a type="button" class="topbar-button" id="page-header-user-dropdown" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false" aria-label="User menu">
						<span class="d-flex align-items-center">
							<iconify-icon icon="solar:user-circle-bold-duotone" class="fs-32 align-middle"></iconify-icon>
						</span>
					</a>
					<div class="dropdown-menu dropdown-menu-end">
						<h6 class="dropdown-header">Admin</h6>
						<a class="dropdown-item" href="/" target="_blank">
							<i class="bx bx-store text-muted fs-18 align-middle me-1"></i><span class="align-middle">View Store</span>
						</a>
						<a class="dropdown-item" href="/admin/settings">
							<i class="bx bx-cog text-muted fs-18 align-middle me-1"></i><span class="align-middle">Settings</span>
						</a>
						<div class="dropdown-divider my-1"></div>
						<button class="dropdown-item text-danger" onclick={logout}>
							<i class="bx bx-log-out fs-18 align-middle me-1"></i><span class="align-middle">Logout</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</header>
