export type PreviewFrame = [x: number, y: number, width: number, height: number];

export function previewFrame(bounds: [number, number, number, number]): PreviewFrame {
  const [minX, minY, maxX, maxY] = bounds;
  const size = Math.max(maxX - minX, maxY - minY, 0.1) * 1.15;
  return [(minX + maxX - size) / 2, (minY + maxY - size) / 2, size, size];
}
