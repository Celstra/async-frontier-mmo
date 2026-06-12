/** Locked copy — FIRST_THUMP_SLICE_SPEC §3. Do not paraphrase. */
export const PROLOGUE_LINES = [
	"The settlement's fabricator went dark two weeks ago. No fabricator, no",
	'thumpers; no thumpers, no ore worth hauling. You have a scanner, two',
	"good legs, and the foreman's list. Start walking."
] as const;

export const PROLOGUE_TEXT = PROLOGUE_LINES.join('\n');
