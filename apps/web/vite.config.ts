import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		allowedHosts: ['.trycloudflare.com']
	},
	ssr: {
		noExternal: ['@async-frontier-mmo/db', '@async-frontier-mmo/domain', 'shared']
	},
	preview: {
		allowedHosts: ['.trycloudflare.com']
	}
});
