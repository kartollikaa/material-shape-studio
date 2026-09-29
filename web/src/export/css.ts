import { roundTo } from "./kotlin";

export function cssRule(cubics: ArrayLike<number>): string {
  const at = (x: number, y: number) => `${roundTo(x * 100, 2)}% ${roundTo(y * 100, 2)}%`;
  const parts = [`from ${at(cubics[0], cubics[1])}`];
  for (let o = 0; o < cubics.length; o += 8) {
    parts.push(`curve to ${at(cubics[o + 6], cubics[o + 7])} with ${at(cubics[o + 2], cubics[o + 3])} / ${at(cubics[o + 4], cubics[o + 5])}`);
  }
  parts.push("close");
  return `.my-shape {\n  aspect-ratio: 1;\n  clip-path: shape(\n    ${parts.join(",\n    ")}\n  );\n}\n`;
}
