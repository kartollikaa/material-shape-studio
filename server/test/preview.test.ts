import { expect, it } from "vitest";
import { comparisonSvg } from "../src/preview";

it("escapes agent-supplied labels and uses only generated geometry", () => {
  const svg = comparisonSvg([{ cubics: [0, 0, 0, 0, 1, 1, 1, 1], bounds: [0, 0, 1, 1], label: `<script>alert("x")</script>`, presentation: { colour: "#6750a4", theme: "light", context: "avatar" } }]);
  expect(svg).not.toContain("<script>");
  expect(svg).toContain("&lt;script&gt;");
});

it("draws the avatar placeholder as a person silhouette clipped to the shape", () => {
  const svg = comparisonSvg([{ cubics: [0, 0, 0, 0, 1, 1, 1, 1], bounds: [0, 0, 1, 1], label: "Avatar", presentation: { colour: "#6750a4", theme: "light", context: "avatar" } }]);
  expect(svg).toMatch(/<g clip-path="url\(#clip-0\)" fill="white"[^>]*><circle /);
  expect(svg).not.toContain("stroke=");
});
