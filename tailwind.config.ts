import type { Config } from 'tailwindcss';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],

	theme: {
		extend: {
			colors: {
				'medium-carmine': '#B33935'
			},
			fontFamily: {
				sans: ['Nunito', 'system-ui', 'sans-serif'],
				display: ['Playfair Display', 'Georgia', 'serif']
			}
		}
	},

	plugins: []
} as Config;
