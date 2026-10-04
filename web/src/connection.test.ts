import { expect, it } from "vitest";
import { connectionInstructions } from "./connection.mjs";

it("does not advertise an unset or invalid package version", () => {
  for (const input of [undefined, "latest", "1.0.0;rm -rf ~", "v1.0.0", "1.0"]) {
    const instructions = connectionInstructions(input);
    expect(instructions.available).toBe(false);
    expect(instructions.prompt).toBe("");
    expect(instructions.text).toContain("not published yet");
  }
});

it("uses one pinned package in the prompt, command and text artifact", () => {
  const instructions = connectionInstructions("0.1.0");
  expect(instructions.available).toBe(true);
  expect(instructions.prompt).toContain(instructions.packageSpec);
  expect(instructions.text).toContain(`claude mcp add --transport stdio material-shape-studio -- npx --yes ${instructions.packageSpec}`);
  expect(instructions.text).toContain("Merge this entry");
});
