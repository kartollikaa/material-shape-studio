import type { Point, Transform } from "../document";

export type Box = [x: number, y: number, width: number, height: number];

export function forward([x, y]: Point, transforms: Transform[]): Point {
  for (const t of transforms) {
    if (t.type === "scale") [x, y] = [x * t.x, y * t.y];
    if (t.type === "rotate") {
      const a = (t.degrees * Math.PI) / 180;
      [x, y] = [Math.cos(a) * x - Math.sin(a) * y, Math.sin(a) * x + Math.cos(a) * y];
    }
  }
  return [x, y];
}

export function backward([x, y]: Point, transforms: Transform[]): Point {
  for (const t of [...transforms].reverse()) {
    if (t.type === "scale") [x, y] = [x / t.x, y / t.y];
    if (t.type === "rotate") {
      const a = (t.degrees * Math.PI) / 180;
      [x, y] = [Math.cos(a) * x + Math.sin(a) * y, -Math.sin(a) * x + Math.cos(a) * y];
    }
  }
  return [x, y];
}

export function squareAround(bounds: ArrayLike<number>, extra: Point[] = [], margin = 1.2): Box {
  let [x0, y0, x1, y1] = [bounds[0], bounds[1], bounds[2], bounds[3]];
  for (const [x, y] of extra) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  const size = Math.max(x1 - x0, y1 - y0, 1e-3) * margin;
  return [(x0 + x1) / 2 - size / 2, (y0 + y1) / 2 - size / 2, size, size];
}
