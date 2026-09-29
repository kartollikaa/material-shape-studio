/*
 * Copyright 2024 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { Point, Rounding, Shape } from "../document";

export type Corner = { point: Point; rounding: Rounding };

const MATERIAL_SLICE_CENTRE: Point = [0.5, 0.5];
const UNROUNDED: Rounding = { radius: 0 };

// Ported from androidx.compose.material3.MaterialShapes.doRepeat, in doubles.
export function expandRepeat(slice: Corner[], count: number, [cx, cy]: Point, mirror: boolean): Corner[] {
  const out: Corner[] = [];
  if (mirror) {
    const angles = slice.map(({ point: [x, y] }) => (Math.atan2(y - cy, x - cx) * 180) / Math.PI);
    const distances = slice.map(({ point: [x, y] }) => Math.hypot(x - cx, y - cy));
    const sections = count * 2;
    const sectionAngle = 360 / sections;
    for (let s = 0; s < sections; s++) {
      for (let index = 0; index < slice.length; index++) {
        const i = s % 2 === 0 ? index : slice.length - 1 - index;
        if (i > 0 || s % 2 === 0) {
          const degrees = sectionAngle * s + (s % 2 === 0 ? angles[i] : sectionAngle - angles[i] + 2 * angles[0]);
          const a = (degrees / 360) * 2 * Math.PI;
          out.push({ point: [Math.cos(a) * distances[i] + cx, Math.sin(a) * distances[i] + cy], rounding: slice[i].rounding });
        }
      }
    }
    return out;
  }
  for (let k = 0; k < slice.length * count; k++) {
    const { point: [x, y], rounding } = slice[k % slice.length];
    const a = ((Math.floor(k / slice.length) * 360) / count / 360) * 2 * Math.PI;
    const dx = x - cx;
    const dy = y - cy;
    out.push({ point: [dx * Math.cos(a) - dy * Math.sin(a) + cx, dx * Math.sin(a) + dy * Math.cos(a) + cy], rounding });
  }
  return out;
}

export function polygonCorners(shape: Extract<Shape, { kind: "polygon" }>): { corners: Corner[]; center?: Point } {
  const roundings = shape.perVertexRounding ?? shape.vertices.map(() => shape.rounding ?? UNROUNDED);
  const slice = shape.vertices.map((point, i) => ({ point, rounding: roundings[i] }));
  if (!shape.repeat) return { corners: slice, center: shape.center };
  const center = shape.center ?? MATERIAL_SLICE_CENTRE;
  return { corners: expandRepeat(slice, shape.repeat.count, center, shape.repeat.mirror), center };
}
