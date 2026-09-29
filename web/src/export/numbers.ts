export function roundTo(x: number, digits: number): number {
  const p = 10 ** digits;
  const v = Math.round(x * p) / p;
  return Object.is(v, -0) ? 0 : v;
}
