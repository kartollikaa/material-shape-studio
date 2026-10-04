import { previewFrame, svgPath, type ShapePresentation } from "@material-shape-studio/core";
import { Resvg } from "@resvg/resvg-js";

export type PreviewItem = { cubics: number[]; bounds: [number, number, number, number]; label: string; presentation: ShapePresentation };
const escapeXml = (text: string) => text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);

export function comparisonSvg(items: PreviewItem[]): string {
  const tile = 256;
  const cards = items.map((item, index) => {
    const x = index * tile;
    const [left, top, size] = previewFrame(item.bounds);
    const at = (u: number, v: number) => `${left + u * size} ${top + v * size}`;
    const dark = item.presentation.theme === "dark";
    const background = dark ? "#222127" : "#f7f5fa";
    const foreground = dark ? "#f4f0f7" : "#242129";
    const d = svgPath(item.cubics, 1, 4);
    const shape = `<path d="${d}" fill="${item.presentation.colour}"/>`;
    let picture = shape;
    if (item.presentation.context === "photo") {
      picture = `<defs><clipPath id="clip-${index}"><path d="${d}"/></clipPath></defs><g clip-path="url(#clip-${index})"><rect x="${left}" y="${top}" width="${size}" height="${size}" fill="#9bc8ed"/><circle cx="${left + size * 0.72}" cy="${top + size * 0.3}" r="${size * 0.12}" fill="#fff0a8"/><path d="M${at(0, 0.82)}L${at(0.3, 0.45)}L${at(0.52, 0.7)}L${at(0.72, 0.54)}L${at(1, 0.84)}L${at(1, 1)}L${at(0, 1)}Z" fill="#416c5d"/></g>`;
    } else if (item.presentation.context === "button") {
      picture += `<path d="M${at(0.5, 0.34)}L${at(0.5, 0.66)}M${at(0.34, 0.5)}L${at(0.66, 0.5)}" stroke="white" stroke-width="${size * 0.06}" stroke-linecap="round"/>`;
    } else {
      picture += `<defs><clipPath id="clip-${index}"><path d="${d}"/></clipPath></defs><g clip-path="url(#clip-${index})" fill="white" fill-opacity="0.9"><circle cx="${left + size * 0.5}" cy="${top + size * 0.38}" r="${size * 0.12}"/><path d="M${at(0.31, 0.71)}C${at(0.31, 0.53)} ${at(0.69, 0.53)} ${at(0.69, 0.71)}Z"/></g>`;
    }
    return `<g transform="translate(${x},0)"><rect x="8" y="8" width="240" height="240" rx="18" fill="${background}"/><svg x="48" y="32" width="160" height="160" viewBox="${left} ${top} ${size} ${size}">${picture}</svg><text x="128" y="220" fill="${foreground}" text-anchor="middle" font-size="16" font-family="sans-serif">${escapeXml(item.label)}</text></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tile * items.length}" height="256" viewBox="0 0 ${tile * items.length} 256">${cards}</svg>`;
}

export function comparisonPng(items: PreviewItem[]): Uint8Array {
  return new Resvg(comparisonSvg(items)).render().asPng();
}
