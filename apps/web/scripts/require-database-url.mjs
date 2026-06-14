import { loadSmokeEnvFiles } from './smoke-env.mjs';

loadSmokeEnvFiles();

if (!process.env.DATABASE_URL) {
	console.error(
		'DATABASE_URL is required for browser path smoke.\n' +
			'Export it in the shell or put it in apps/web/.env or packages/db/.env\n' +
			'(see apps/web/.env.example and docs/testing/browser-smoke-setup.md).'
	);
	process.exit(1);
}
