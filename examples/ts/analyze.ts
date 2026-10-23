function analyze(nums: number[], target: number): number[] {
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
