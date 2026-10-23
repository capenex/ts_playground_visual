function tourStructures(): number {
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
