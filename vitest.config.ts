import { defineConfig } from 'vitest/config';

/**
 * Server-side unit tests only.
 *
 * Deliberately does NOT load the SvelteKit plugin: these tests exercise plain
 * Node modules (`src/lib/server/*.ts`) that import only node builtins and
 * better-sqlite3, so there are no `$lib` / `$env` aliases to resolve. Keeping
 * the plugin out makes the suite fast and keeps it from needing a .env.
 *
 * Requires Node 20 — the same version the production container runs.
 * better-sqlite3's native binding is built for it. See `engines` in package.json.
 */
export default defineConfig({
	test: {
		include: ['src/lib/server/**/*.test.ts'],
		environment: 'node',
		// better-sqlite3 is synchronous and each test owns its own temp database,
		// but a single fork keeps SQLite file locking predictable.
		pool: 'forks',
		poolOptions: { forks: { singleFork: true } },
		coverage: {
			provider: 'v8',
			include: ['src/lib/server/reservations.ts'],
			reporter: ['text', 'json-summary'],
			// 100% on statements/functions/lines. Branches sit in the high 80s: the
			// remainder are defensive `??` fallbacks and an unreachable regex guard
			// in the timezone parser. Writing tests to reach those would be theatre,
			// so the gate is set where real coverage actually is.
			// Measured reality, so the gate fails on a regression rather than passing
			// vacuously. The shortfall from 100 is two deliberate defensive throws:
			// the Intl-offset parse guard (needs a broken ICU to reach) and, until
			// covered, nothing else. Branches also carry the `??` param defaults.
			thresholds: { branches: 85, functions: 100, lines: 97, statements: 97 }
		}
	}
});
