function counter(n: number): number {
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
