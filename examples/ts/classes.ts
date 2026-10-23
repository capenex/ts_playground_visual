class Counter {
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
