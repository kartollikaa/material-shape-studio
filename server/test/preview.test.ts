import { expect, it } from "vitest";
import { comparisonSvg } from "../src/preview";

it("escapes agent-supplied labels and uses only generated geometry", () => {
  const svg = comparisonSvg([{ cubics: [0, 0, 0, 0, 1, 1, 1, 1], bounds: [0, 0, 1, 1], label: `<script>alert("x")</script>`, presentation: { colour: "#6750a4", theme: "light", context: "avatar" } }]);
  expect(svg).not.toContain("<script>");
  expect(svg).toContain("&lt;script&gt;");
});

it("draws the avatar placeholder as a single stroked letter A", () => {
  const svg = comparisonSvg([{ cubics: [0, 0, 0, 0, 1, 1, 1, 1], bounds: [0, 0, 1, 1], label: "Avatar", presentation: { colour: "#6750a4", theme: "light", context: "avatar" } }]);
  const letters = [...svg.matchAll(/<path d="([^"]+)" fill="none" stroke="white"/g)].map((match) => match[1]);
  expect(letters).toHaveLength(1);
  expect(letters[0].match(/M/g)).toHaveLength(2);
  expect(letters[0].match(/L/g)).toHaveLength(3);
});
