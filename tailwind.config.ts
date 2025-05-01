import type { Config } from 'tailwindcss';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],

	theme: {
		extend: {
			colors: {
				'medium-carmine': '#B33935'
			}
		}
	},

	plugins: []
} as Config;
