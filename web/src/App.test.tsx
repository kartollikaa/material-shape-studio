import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("placeholder page", () => {
  it("names the project and states that it is independent of Google", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: "Material Shape Studio" })).toBeTruthy();
    expect(
      screen.getByText(/An independent open-source project, not affiliated with or endorsed by Google\./),
    ).toBeTruthy();
  });
});
