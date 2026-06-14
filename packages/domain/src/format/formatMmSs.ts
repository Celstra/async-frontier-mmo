/** Wall-clock style m:ss from a float second count — floors fractional seconds. */
export function formatMmSs(totalSeconds: number): string {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = Math.floor(totalSeconds % 60);
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
