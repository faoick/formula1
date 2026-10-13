/** One reversible disassembly clock. No component reassembles during the tour. */
export function ease5(t: number) {
  t = Math.max(0, Math.min(1, t));
  return t * t * t * (t * (t * 6 - 15) + 10);
}
export function trajectoryAmount(clock: number, start: number, end: number) {
  return ease5((clock - start) / Math.max(1e-6, end - start));
}
const beats = [
  [0, 0],
  [0.07, 0],
  [0.13, 0.16],
  [0.19, 0.46],
  [0.245, 0.61],
  [0.33, 0.88],
  [0.78, 1],
  [0.9, 1],
  [1, 0],
];
export function storyAssembly(progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  for (let i = 1; i < beats.length; i++) {
    const [end, b] = beats[i],
      [start, a] = beats[i - 1];
    if (p <= end) return a + (b - a) * ease5((p - start) / (end - start));
  }
  return 0;
}
