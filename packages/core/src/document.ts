export type Point = [number, number];

export type Rounding = { radius: number; smoothing?: number };

export type Repeat = { count: number; mirror: boolean };

export const SHAPE_KINDS = ["polygon", "ngon", "circle", "rectangle", "star", "pill", "pillStar", "features"] as const;

export type Shape =
  | { kind: "polygon"; vertices: Point[]; rounding?: Rounding; perVertexRounding?: Rounding[]; center?: Point; repeat?: Repeat }
  | { kind: "ngon"; vertices: number; radius?: number; center?: Point; rounding?: Rounding; perVertexRounding?: Rounding[] }
  | { kind: "circle"; vertices?: number; radius?: number; center?: Point }
  | { kind: "rectangle"; width?: number; height?: number; center?: Point; rounding?: Rounding; perVertexRounding?: Rounding[] }
  | {
      kind: "star";
      verticesPerRadius: number;
      radius?: number;
      innerRadius?: number;
      center?: Point;
      rounding?: Rounding;
      innerRounding?: Rounding;
      perVertexRounding?: Rounding[];
    }
  | { kind: "pill"; width?: number; height?: number; smoothing?: number; center?: Point }
  | {
      kind: "pillStar";
      width?: number;
      height?: number;
      verticesPerRadius?: number;
      innerRadiusRatio?: number;
      rounding?: Rounding;
      innerRounding?: Rounding;
      perVertexRounding?: Rounding[];
      vertexSpacing?: number;
      startLocation?: number;
      center?: Point;
    }
  | { kind: "features"; serialized: string; center?: Point };

export type Transform =
  | { type: "normalize" }
  | { type: "rotate"; degrees: number }
  | { type: "scale"; x: number; y: number }
  | { type: "translate"; x: number; y: number }
  | { type: "fillSquare" }
  | { type: "startAngle"; degrees: number };

export type ShapeDocument = { v: 1; name?: string; shape: Shape; transforms?: Transform[] };
