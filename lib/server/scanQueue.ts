type Job<T> = () => Promise<T>;
type Priority = "high" | "normal";

interface QueueEntry {
  job: Job<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  priority: Priority;
}

export class AsyncQueue {
  private readonly highQueue: QueueEntry[] = [];
  private readonly normalQueue: QueueEntry[] = [];
  private running = 0;
  private readonly concurrency: number;
  private readonly minIntervalMs: number;
  private lastStartTs = 0;

  constructor() {
    this.concurrency = Math.max(1, Number(process.env.SCAN_QUEUE_CONCURRENCY ?? 2));
    this.minIntervalMs = Math.max(0, Number(process.env.SCAN_QUEUE_MIN_INTERVAL_MS ?? 0));
  }

  get size(): number {
    return this.highQueue.length + this.normalQueue.length;
  }

  enqueue<T>(job: Job<T>, priority: Priority = "normal"): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const entry: QueueEntry = {
        job: job as Job<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        priority,
      };
      if (priority === "high") {
        this.highQueue.push(entry);
      } else {
        this.normalQueue.push(entry);
      }
      void this.process();
    });
  }

  private nextEntry(): QueueEntry | undefined {
    return this.highQueue.shift() ?? this.normalQueue.shift();
  }

  private async maybeThrottle(): Promise<void> {
    if (this.minIntervalMs <= 0) return;
    const elapsed = Date.now() - this.lastStartTs;
    const waitMs = this.minIntervalMs - elapsed;
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  private async process(): Promise<void> {
    while (this.running < this.concurrency && this.size > 0) {
      const next = this.nextEntry();
      if (!next) return;
      this.running += 1;

      void (async () => {
        try {
          await this.maybeThrottle();
          this.lastStartTs = Date.now();
          const result = await next.job();
          next.resolve(result);
        } catch (err) {
          next.reject(err);
        } finally {
          this.running -= 1;
          void this.process();
        }
      })();
    }
  }

  get status(): {
    concurrency: number;
    minIntervalMs: number;
    running: number;
    queuedHigh: number;
    queuedNormal: number;
  } {
    return {
      concurrency: this.concurrency,
      minIntervalMs: this.minIntervalMs,
      running: this.running,
      queuedHigh: this.highQueue.length,
      queuedNormal: this.normalQueue.length,
    };
  }
}

export const scanQueue = new AsyncQueue();

export type QueuePriority = Priority;
