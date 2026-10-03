import { Worker } from "node:worker_threads";
import type { ShapeJob } from "./worker";

type Pending = { job: ShapeJob; resolve: (value: unknown) => void; reject: (reason: Error) => void; signal?: AbortSignal };

export class ShapeJobs {
  private active = 0;
  private queue: Pending[] = [];
  constructor(private readonly concurrency = 2, private readonly deadlineMs = 5_000) {}

  run(job: ShapeJob, signal?: AbortSignal): Promise<unknown> {
    if (this.queue.length >= 8) return Promise.reject(new Error("shape service is busy"));
    return new Promise((resolve, reject) => {
      this.queue.push({ job, resolve, reject, signal });
      this.drain();
    });
  }

  private drain() {
    while (this.active < this.concurrency && this.queue.length) {
      const pending = this.queue.shift()!;
      if (pending.signal?.aborted) { pending.reject(new Error("request cancelled")); continue; }
      this.active++;
      const worker = new Worker(new URL("../dist/worker.mjs", import.meta.url));
      let settled = false;
      const finish = (error?: Error, value?: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        pending.signal?.removeEventListener("abort", cancel);
        void worker.terminate();
        this.active--;
        if (error) pending.reject(error); else pending.resolve(value);
        this.drain();
      };
      const cancel = () => finish(new Error("request cancelled"));
      const timer = setTimeout(() => finish(new Error("shape job timed out")), this.deadlineMs);
      pending.signal?.addEventListener("abort", cancel, { once: true });
      worker.once("message", (result: { ok: boolean; value?: unknown; error?: string }) => result.ok ? finish(undefined, result.value) : finish(new Error(result.error ?? "shape job failed")));
      worker.once("error", (error) => finish(error instanceof Error ? error : new Error(String(error))));
      worker.once("exit", (code) => { if (code !== 0) finish(new Error("shape worker stopped")); });
      worker.postMessage(pending.job);
    }
  }
}
