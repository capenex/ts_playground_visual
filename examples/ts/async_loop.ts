function sleep<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(value);
    }, ms);
  });
}

async function fetchScore(userId: number, delayMs: number): Promise<number> {
  const base: number = await sleep(delayMs, userId * 10);
  return base + 5;
}

async function runAsyncDemo(): Promise<string> {
  const timeline: string[] = ["1:sync-start"];

  setTimeout(() => {
    timeline.push("5:timeout-10ms");
  }, 10);

  Promise.resolve("micro").then((tag: string) => {
    timeline.push("3:promise-then-" + tag);
  });

  queueMicrotask(() => {
    timeline.push("4:queueMicrotask");
  });

  timeline.push("2:before-await");
  const score: number = await fetchScore(3, 20);
  timeline.push("6:after-await-" + score);
  checkpoint(timeline, score);
  return timeline.join(" -> ");
}

runAsyncDemo()
