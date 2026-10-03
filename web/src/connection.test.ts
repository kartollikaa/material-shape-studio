import { expect, it } from "vitest";
import { connectionInstructions } from "./connection.mjs";

it("does not advertise an unset or unsafe endpoint", () => {
  for (const input of [undefined, "http://example.com/mcp", "https://localhost/mcp", "https://user:secret@example.com/mcp", "https://example.com/mcp#fragment"]) {
    const instructions = connectionInstructions(input);
    expect(instructions.available).toBe(false);
    expect(instructions.prompt).toBe("");
    expect(instructions.text).toContain("unavailable");
  }
});

it("uses one validated endpoint in the prompt, command and text artifact", () => {
  const instructions = connectionInstructions("https://api.example.com/mcp");
  expect(instructions.available).toBe(true);
  expect(instructions.prompt).toContain(instructions.endpoint);
  expect(instructions.text).toContain(`claude mcp add --transport http material-shape-studio ${instructions.endpoint}`);
  expect(instructions.text).toContain("Merge the entry");
});
