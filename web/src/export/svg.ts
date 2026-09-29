import { roundTo } from "./kotlin";

export function svgPath(cubics: ArrayLike<number>, scale = 100, digits = 2): string {
  const p = (v: number) => roundTo(v * scale, digits);
  if (cubics.length === 0) return "";
  let d = `M${p(cubics[0])} ${p(cubics[1])}`;
  for (let o = 0; o < cubics.length; o += 8) {
    d += `C${p(cubics[o + 2])} ${p(cubics[o + 3])} ${p(cubics[o + 4])} ${p(cubics[o + 5])} ${p(cubics[o + 6])} ${p(cubics[o + 7])}`;
  }
  return `${d}Z`;
}

export function svgFile(cubics: ArrayLike<number>, colour: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">\n  <path fill="${colour}" d="${svgPath(cubics)}"/>\n</svg>\n`;
}
