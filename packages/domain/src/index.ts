import type { ResourceStatCode } from 'shared';

/** Map of stat code → value (1–1000 later). Placeholder shape for domain types. */
export type ResourceStatMap = Partial<Record<ResourceStatCode, number>>;

export {
	resolveThumperState,
	type ResolveThumperStateInput,
	type ResolveThumperStateResult
} from './thumper/resolveThumperState';