import * as z from "zod/v4";

const point = z.tuple([z.number().finite(), z.number().finite()]);
const rounding = z.object({ radius: z.number().finite(), smoothing: z.number().finite().optional() }).strict();
const centered = { center: point.optional() };
export const shapeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("polygon"), vertices: z.array(point), rounding: rounding.optional(), perVertexRounding: z.array(rounding).optional(), repeat: z.object({ count: z.number().int(), mirror: z.boolean() }).strict().optional(), ...centered }).strict(),
  z.object({ kind: z.literal("ngon"), vertices: z.number().int(), radius: z.number().finite().optional(), rounding: rounding.optional(), perVertexRounding: z.array(rounding).optional(), ...centered }).strict(),
  z.object({ kind: z.literal("circle"), vertices: z.number().int().optional(), radius: z.number().finite().optional(), ...centered }).strict(),
  z.object({ kind: z.literal("rectangle"), width: z.number().finite().optional(), height: z.number().finite().optional(), rounding: rounding.optional(), perVertexRounding: z.array(rounding).optional(), ...centered }).strict(),
  z.object({ kind: z.literal("star"), verticesPerRadius: z.number().int(), radius: z.number().finite().optional(), innerRadius: z.number().finite().optional(), rounding: rounding.optional(), innerRounding: rounding.optional(), perVertexRounding: z.array(rounding).optional(), ...centered }).strict(),
  z.object({ kind: z.literal("pill"), width: z.number().finite().optional(), height: z.number().finite().optional(), smoothing: z.number().finite().optional(), ...centered }).strict(),
  z.object({ kind: z.literal("pillStar"), width: z.number().finite().optional(), height: z.number().finite().optional(), verticesPerRadius: z.number().int().optional(), innerRadiusRatio: z.number().finite().optional(), rounding: rounding.optional(), innerRounding: rounding.optional(), perVertexRounding: z.array(rounding).optional(), vertexSpacing: z.number().finite().optional(), startLocation: z.number().finite().optional(), ...centered }).strict(),
  z.object({ kind: z.literal("features"), serialized: z.string(), ...centered }).strict(),
]);
const transform = z.discriminatedUnion("type", [
  z.object({ type: z.literal("normalize") }).strict(),
  z.object({ type: z.literal("rotate"), degrees: z.number().finite() }).strict(),
  z.object({ type: z.literal("scale"), x: z.number().finite(), y: z.number().finite() }).strict(),
  z.object({ type: z.literal("translate"), x: z.number().finite(), y: z.number().finite() }).strict(),
  z.object({ type: z.literal("fillSquare") }).strict(),
  z.object({ type: z.literal("startAngle"), degrees: z.number().finite() }).strict(),
]);
export const documentSchema = z.object({ v: z.literal(1), name: z.string().optional(), shape: shapeSchema, transforms: z.array(transform).optional() }).strict();
export const presentationSchema = z.object({ colour: z.string().regex(/^#[0-9a-fA-F]{6}$/), theme: z.enum(["light", "dark"]), context: z.enum(["photo", "button", "avatar"]) }).strict();
export const sharedSchema = z.object({ document: documentSchema, presentation: presentationSchema }).strict();
