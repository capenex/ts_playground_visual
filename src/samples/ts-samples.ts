/* ================================================================
   Built-in TypeScript samples & expected lines (src/samples/ts-samples.ts)
   ================================================================ */

export const SAMPLES: Record<string, string> = {
  showcase: `function visualShowcase(nums: number[], target: number): number {
  const tree = {
    val: 8,
    left: { val: 4, left: { val: 2, left: null, right: null }, right: { val: 6, left: null, right: null } },
    right: { val: 12, left: { val: 10, left: null, right: null }, right: { val: 14, left: null, right: null } }
  };
  const graph = {
    nodes: [{ id: 0, label: "S" }, { id: 1, label: "A" }, { id: 2, label: "B" }, { id: 3, label: "T" }],
    edges: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 3]]
  };
  const map = new Map<number, number>();
  const stack: number[] = [];
  let l = 0, sum = 0, best = 0;
  for (let r = 0; r < nums.length; r++) {
    const x = nums[r];
    sum = sum + x;
    const count = (map.get(x) || 0) + 1;
    map.set(x, count);
    while (stack.length > 0 && nums[stack[stack.length - 1]] < x) {
      stack.pop();
    }
    stack.push(r);
    if (r - l + 1 > 3) {
      sum = sum - nums[l];
      l = l + 1;
    }
    if (sum >= target) {
      best = Math.max(best, sum);
      checkpoint(sum >= target, "窗口达标");
    }
  }
  return best + tree.val + graph.nodes.length;
}

visualShowcase([3, 6, 2, 8, 5, 4, 7], 12)
`,
  mergesort: `const nums: number[] = [8, 3, 5, 1, 9, 2, 7, 4];

function mergeSort(l: number, r: number): number[] {
  if (l >= r) {
    return nums;
  }
  const mid: number = (l + r) >> 1;
  mergeSort(l, mid);
  mergeSort(mid + 1, r);
  const tmp: number[] = [];
  let i: number = l;
  let j: number = mid + 1;
  while (i <= mid && j <= r) {
    if (nums[i] <= nums[j]) {
      tmp.push(nums[i]);
      i = i + 1;
    } else {
      tmp.push(nums[j]);
      j = j + 1;
    }
  }
  while (i <= mid) {
    tmp.push(nums[i]);
    i = i + 1;
  }
  while (j <= r) {
    tmp.push(nums[j]);
    j = j + 1;
  }
  for (let k = 0; k < tmp.length; k++) {
    nums[l + k] = tmp[k];
  }
  return nums;
}

mergeSort(0, 7)
`,
  debug_crash: `function debugCrashDemo(nums: number[], limit: number): number {
  let acc = 0;
  const history: number[] = [];
  for (let i = 0; i < nums.length; i++) {
    const x = nums[i];
    acc = acc + x;
    history.push(acc);
    checkpoint(acc > 10, "检查累加值");
    if (acc > limit) {
      throw new Error("运行时异常: 累加值 acc(" + acc + ") 超过安全阈值 " + limit);
    }
  }
  return acc;
}

debugCrashDemo([4, 7, 5, 9, 3], 18)
`,
  lcs: `function lcs(a: string, b: string): number {
  const n: number = a.length;
  const m: number = b.length;
  const dp: number[][] = [];
  for (let i = 0; i <= n; i++) {
    dp.push(Array(m + 1).fill(0));
  }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[n][m];
}

lcs("ABCBDAB", "BDCABA")
`,
  analyze: `function analyze(nums: number[], target: number): number[] {
  const map = new Map<number, number>();
  const stack: number[] = [];
  const seen = new Set<number>();
  let sum = 0, hits = 0;
  for (let i = 0; i < nums.length; i++) {
    const x = nums[i];
    const c = map.get(x) || 0;
    map.set(x, c + 1);
    while (stack.length > 0 && nums[stack[stack.length - 1]] < x) {
      stack.pop();
    }
    stack.push(i);
    if (seen.has(x) === false) {
      seen.add(x);
      sum = sum + x;
    }
    if (x === target) {
      hits = hits + 1;
    }
  }
  return [sum, hits];
}

analyze([3,1,4,1,5,9,2,6], 4)
`,
  window: `function minSubArrayLen(target: number, nums: number[]): number {
  let l = 0;
  let sum = 0;
  let best = 999;
  for (let r = 0; r < nums.length; r++) {
    sum = sum + nums[r];
    while (sum >= target) {
      const len = r - l + 1;
      if (len < best) {
        best = len;
      }
      sum = sum - nums[l];
      l = l + 1;
    }
  }
  return best === 999 ? 0 : best;
}

minSubArrayLen(7, [2,3,1,2,4,3])
`,
  structures: `function tourStructures(): number {
  const heap: number[] = [1, 3, 2, 7, 6, 4, 5];
  const queue: number[] = [10, 20, 30];
  const parent: number[] = [0, 0, 1, 3, 3];
  const list = { val: 1, next: { val: 2, next: { val: 3, next: null } } };
  const tree = {
    val: 4,
    left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } },
    right: { val: 6, left: { val: 5, left: null, right: null }, right: { val: 7, left: null, right: null } }
  };
  const graph = {
    nodes: [{ id: 0, label: "A" }, { id: 1, label: "B" }, { id: 2, label: "C" }, { id: 3, label: "D" }],
    edges: [[0, 1], [1, 2], [2, 3], [0, 2]]
  };
  queue.push(40);
  parent[3] = 0;
  return heap[0] + queue.length;
}

tourStructures()
`,
  counter: `function counter(n: number): number {
  let acc = 0;
  const log: number[] = [];
  for (let i = 1; i <= n; i++) {
    acc = acc + i;
    log.push(acc);
    if (acc > 10) {
      acc = acc - 1;
    }
  }
  return acc;
}

counter(8)
`,
  classes: `class Counter {
  total: number = 0;
  history: number[] = [];

  add(n: number): number {
    this.total = this.total + n;
    this.history.push(this.total);
    return this.total;
  }
}

function runCounter(start: number, times: number): number {
  const c = new Counter();
  for (let i = 0; i < times; i++) {
    c.add(start + i);
  }
  return c.total;
}

runCounter(1, 3)
`,
  async_loop: `function sleep<T>(ms: number, value: T): Promise<T> {
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
  checkpoint(score > 0, "异步等待完成");
  return timeline.join(" -> ");
}

runAsyncDemo()
`,
};

export const SAMPLE_DEFAULT_STEP: Record<string, number> = {
  showcase: 35,
  mergesort: 8,
  debug_crash: 0,
  lcs: 24,
  analyze: 18,
  window: 12,
  structures: 7,
  counter: 8,
  classes: 8,
  async_loop: 10,
};

export const EXPECTED_LINES: Record<string, string[]> = Object.fromEntries(
  Object.entries(SAMPLES).map(([k, v]) => [k, v.trim().split('\n')])
);
