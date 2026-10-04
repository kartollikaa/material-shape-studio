import { expect, it } from "vitest";
import { ShapeJobs } from "../src/jobs";

it("terminates stalled geometry work and serves the next request", async () => {
  const jobs = new ShapeJobs(1, 1_000);
  await expect(jobs.run({ kind: "stall" })).rejects.toThrow("timed out");
  await expect(jobs.run({ kind: "create", document: { v: 1, shape: { kind: "ngon", vertices: 5 } } })).resolves.toMatchObject({ document: { shape: { vertices: 5 } } });
});
