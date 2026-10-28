function visualShowcase(nums: number[], target: number): number {
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
