import { defineConfig } from 'vitest/config';

/** Shared bloom resource rows — avoid parallel test files mutating the same instances. */
export default defineConfig({
	test: {
		fileParallelism: false
	}
});
