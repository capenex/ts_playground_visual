/* ================================================================
   Pure Adaptive SVG Tree & Graph Layout Engine (src/viz/svg-layout.ts)
   Layer 6 (0-DOM pure computation module)
   ================================================================ */
import type { Frame } from '../types';

export interface TreeLayoutOptions {
  nodeRadius?: number;
  minHGap?: number;
  levelHeight?: number;
  paddingX?: number;
  paddingY?: number;
  minWidth?: number;
  minHeight?: number;
}

export interface TreeLayoutNode {
  index: number;
  x: number;
  y: number;
  depth: number;
  val: unknown;
  left: number | null;
  right: number | null;
}

export interface TreeLayoutEdge {
  from: number;
  to: number;
  side: 'left' | 'right';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TreeLayoutResult {
  nodes: TreeLayoutNode[];
  edges: TreeLayoutEdge[];
  width: number;
  height: number;
  viewBox: string;
  maxDepth: number;
  rootIndex: number | null;
}

interface InternalTreeNode {
  index: number;
  depth: number;
  val: unknown;
  left: InternalTreeNode | null;
  right: InternalTreeNode | null;
  width: number;
  x: number;
  y: number;
}

function roundCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

function readChildIndex(ref: unknown, totalNodes: number): number | null {
  if (typeof ref === 'number' && Number.isInteger(ref) && ref >= 0 && ref < totalNodes) {
    return ref;
  }
  return null;
}

export function computeTreeLayout(
  rawNodes: readonly Frame[] | null | undefined,
  rootIdx = 0,
  options: TreeLayoutOptions = {},
): TreeLayoutResult {
  const nodeRadius = options.nodeRadius ?? 14;
  const minHGap = Math.max(options.minHGap ?? 40, nodeRadius * 2 + 12);
  const levelHeight = Math.max(options.levelHeight ?? 46, nodeRadius * 2 + 16);
  const paddingX = options.paddingX ?? 22;
  const paddingY = options.paddingY ?? 22;
  const minWidth = options.minWidth ?? 160;
  const minHeight = options.minHeight ?? 84;

  if (!rawNodes || rawNodes.length === 0) {
    return {
      nodes: [],
      edges: [],
      width: minWidth,
      height: minHeight,
      viewBox: `0 0 ${minWidth} ${minHeight}`,
      maxDepth: 0,
      rootIndex: null,
    };
  }

  const startIdx = Number.isInteger(rootIdx) && rootIdx >= 0 && rootIdx < rawNodes.length ? rootIdx : 0;
  if (!rawNodes[startIdx]) {
    return {
      nodes: [],
      edges: [],
      width: minWidth,
      height: minHeight,
      viewBox: `0 0 ${minWidth} ${minHeight}`,
      maxDepth: 0,
      rootIndex: null,
    };
  }

  const visited = new Set<number>();
  const flatNodes: InternalTreeNode[] = [];
  let maxDepth = 0;

  function buildTree(idx: number, depth: number): InternalTreeNode | null {
    if (visited.has(idx)) return null;
    const raw = rawNodes ? rawNodes[idx] : undefined;
    if (!raw) return null;
    visited.add(idx);
    if (depth > maxDepth) maxDepth = depth;

    const leftIdx = readChildIndex(raw.left, rawNodes ? rawNodes.length : 0);
    const rightIdx = readChildIndex(raw.right, rawNodes ? rawNodes.length : 0);

    const node: InternalTreeNode = {
      index: idx,
      depth,
      val: raw.val !== undefined ? raw.val : (raw.value !== undefined ? raw.value : raw.id),
      left: null,
      right: null,
      width: minHGap,
      x: 0,
      y: paddingY + nodeRadius + depth * levelHeight,
    };
    flatNodes.push(node);

    if (leftIdx !== null) {
      node.left = buildTree(leftIdx, depth + 1);
    }
    if (rightIdx !== null) {
      node.right = buildTree(rightIdx, depth + 1);
    }
    return node;
  }

  const root = buildTree(startIdx, 0);
  if (!root) {
    return {
      nodes: [],
      edges: [],
      width: minWidth,
      height: minHeight,
      viewBox: `0 0 ${minWidth} ${minHeight}`,
      maxDepth: 0,
      rootIndex: null,
    };
  }

  const skewStep = minHGap * 0.55;

  function measureSubtreeWidth(node: InternalTreeNode): number {
    if (node.left && node.right) {
      node.width = measureSubtreeWidth(node.left) + measureSubtreeWidth(node.right);
    } else if (node.left) {
      node.width = measureSubtreeWidth(node.left) + skewStep;
    } else if (node.right) {
      node.width = measureSubtreeWidth(node.right) + skewStep;
    } else {
      node.width = minHGap;
    }
    return node.width;
  }

  function assignX(node: InternalTreeNode, xStart: number): void {
    if (node.left && node.right) {
      assignX(node.left, xStart);
      assignX(node.right, xStart + node.left.width);
      node.x = (node.left.x + node.right.x) / 2;
    } else if (node.left) {
      assignX(node.left, xStart);
      node.x = node.left.x + skewStep;
    } else if (node.right) {
      assignX(node.right, xStart + skewStep);
      node.x = node.right.x - skewStep;
    } else {
      node.x = xStart + minHGap / 2;
    }
  }

  const treeSpanWidth = measureSubtreeWidth(root);
  const contentWidth = Math.ceil(treeSpanWidth + paddingX * 2);
  const width = Math.max(minWidth, contentWidth);
  const offsetX = paddingX + (width - contentWidth) / 2;
  assignX(root, offsetX);

  const height = Math.max(
    minHeight,
    Math.ceil(paddingY * 2 + maxDepth * levelHeight + nodeRadius * 2),
  );

  const nodes: TreeLayoutNode[] = flatNodes.map((n) => ({
    index: n.index,
    x: roundCoord(n.x),
    y: roundCoord(n.y),
    depth: n.depth,
    val: n.val,
    left: n.left ? n.left.index : null,
    right: n.right ? n.right.index : null,
  }));

  const edges: TreeLayoutEdge[] = [];
  for (const n of flatNodes) {
    if (n.left) {
      edges.push({
        from: n.index,
        to: n.left.index,
        side: 'left',
        x1: roundCoord(n.x),
        y1: roundCoord(n.y),
        x2: roundCoord(n.left.x),
        y2: roundCoord(n.left.y),
      });
    }
    if (n.right) {
      edges.push({
        from: n.index,
        to: n.right.index,
        side: 'right',
        x1: roundCoord(n.x),
        y1: roundCoord(n.y),
        x2: roundCoord(n.right.x),
        y2: roundCoord(n.right.y),
      });
    }
  }

  return {
    nodes,
    edges,
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    maxDepth,
    rootIndex: root.index,
  };
}

export interface GraphLayoutOptions {
  nodeRadius?: number;
  minNodeDist?: number;
  padding?: number;
  minWidth?: number;
  minHeight?: number;
  directed?: boolean;
}

export interface GraphLayoutNode {
  index: number;
  id: number | string;
  label: string;
  x: number;
  y: number;
  r: number;
}

export interface GraphLayoutEdge {
  index: number;
  from: number | string;
  to: number | string;
  fromIndex: number;
  toIndex: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  path: string;
  isSelfLoop: boolean;
  isCurved: boolean;
  label?: string;
}

export interface GraphLayoutResult {
  nodes: GraphLayoutNode[];
  edges: GraphLayoutEdge[];
  width: number;
  height: number;
  viewBox: string;
  directed: boolean;
}

interface ParsedGraphEdge {
  index: number;
  from: number | string;
  to: number | string;
  fromIndex: number;
  toIndex: number;
  label?: string;
}

function resolveNodeId(n: Frame, idx: number): number | string {
  if (typeof n.id === 'number' || typeof n.id === 'string') return n.id;
  return idx;
}

function resolveNodeLabel(n: Frame, id: number | string): string {
  if (n.label !== undefined && n.label !== null) return String(n.label);
  if (n.val !== undefined && n.val !== null) return String(n.val);
  return String(id);
}

function separateOverlappingNodes(
  xs: number[],
  ys: number[],
  minDist: number,
  passes: number,
): void {
  const n = xs.length;
  for (let pass = 0; pass < passes; pass++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const xi = xs[i] ?? 0;
        const yi = ys[i] ?? 0;
        const xj = xs[j] ?? 0;
        const yj = ys[j] ?? 0;
        let dx = xj - xi;
        let dy = yj - yi;
        let dist = Math.hypot(dx, dy);
        if (dist < minDist) {
          if (dist < 1e-6) {
            const angle = ((i * 7 + j * 13) % 12) * (Math.PI / 6);
            dx = Math.cos(angle);
            dy = Math.sin(angle);
            dist = 1;
          }
          const push = (minDist - dist) * 0.52;
          const ux = dx / dist;
          const uy = dy / dist;
          xs[i] = xi - ux * push;
          ys[i] = yi - uy * push;
          xs[j] = xj + ux * push;
          ys[j] = yj + uy * push;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
}

function runDeterministicForceLayout(
  xs: number[],
  ys: number[],
  edges: readonly ParsedGraphEdge[],
  minDist: number,
): void {
  const n = xs.length;
  if (n <= 1) {
    xs[0] = 0;
    ys[0] = 0;
    return;
  }
  if (n === 2) {
    const half = minDist * 0.8;
    xs[0] = -half;
    ys[0] = 0;
    xs[1] = half;
    ys[1] = 0;
    return;
  }

  const radius = Math.max(minDist * 0.95, (n * minDist * 1.15) / (2 * Math.PI));
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    xs[i] = radius * Math.cos(angle);
    ys[i] = radius * Math.sin(angle);
  }

  // Unique undirected edges for spring attraction
  const springPairs: Array<[number, number]> = [];
  const seenPair = new Set<string>();
  for (const e of edges) {
    if (e.fromIndex === e.toIndex) continue;
    const a = Math.min(e.fromIndex, e.toIndex);
    const b = Math.max(e.fromIndex, e.toIndex);
    const key = `${a}:${b}`;
    if (!seenPair.has(key)) {
      seenPair.add(key);
      springPairs.push([a, b]);
    }
  }

  const k = Math.max(minDist * 1.35, 64);
  const iterations = Math.min(110, 40 + n * 4);
  const dispX = new Array<number>(n).fill(0);
  const dispY = new Array<number>(n).fill(0);

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < n; i++) {
      dispX[i] = 0;
      dispY[i] = 0;
    }

    // Repulsion between all pairs
    for (let i = 0; i < n; i++) {
      const xi = xs[i] ?? 0;
      const yi = ys[i] ?? 0;
      for (let j = i + 1; j < n; j++) {
        const xj = xs[j] ?? 0;
        const yj = ys[j] ?? 0;
        let dx = xi - xj;
        let dy = yi - yj;
        let dist = Math.hypot(dx, dy);
        if (dist < 1e-4) {
          dx = (i - j) * 0.05;
          dy = ((i + j) % 2 === 0 ? 1 : -1) * 0.05;
          dist = Math.hypot(dx, dy);
        }
        const force = (k * k) / dist;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        dispX[i] = (dispX[i] ?? 0) + fx;
        dispY[i] = (dispY[i] ?? 0) + fy;
        dispX[j] = (dispX[j] ?? 0) - fx;
        dispY[j] = (dispY[j] ?? 0) - fy;
      }
    }

    // Attraction along edges
    for (const [u, v] of springPairs) {
      const dx = (xs[u] ?? 0) - (xs[v] ?? 0);
      const dy = (ys[u] ?? 0) - (ys[v] ?? 0);
      const dist = Math.hypot(dx, dy);
      if (dist > 1e-4) {
        const force = (dist * dist) / k;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        dispX[u] = (dispX[u] ?? 0) - fx;
        dispY[u] = (dispY[u] ?? 0) - fy;
        dispX[v] = (dispX[v] ?? 0) + fx;
        dispY[v] = (dispY[v] ?? 0) + fy;
      }
    }

    // Mild gravity toward origin to keep disconnected components compact
    for (let i = 0; i < n; i++) {
      dispX[i] = (dispX[i] ?? 0) - (xs[i] ?? 0) * 0.08;
      dispY[i] = (dispY[i] ?? 0) - (ys[i] ?? 0) * 0.08;
    }

    const temp = k * 0.42 * (1 - iter / iterations) + 0.5;
    for (let i = 0; i < n; i++) {
      const dx = dispX[i] ?? 0;
      const dy = dispY[i] ?? 0;
      const len = Math.hypot(dx, dy);
      if (len > 1e-6) {
        const step = Math.min(len, temp);
        xs[i] = (xs[i] ?? 0) + (dx / len) * step;
        ys[i] = (ys[i] ?? 0) + (dy / len) * step;
      }
    }
  }

  separateOverlappingNodes(xs, ys, minDist, 32);
}

export function computeGraphLayout(
  rawNodes: readonly Frame[] | null | undefined,
  rawEdges: readonly ([number | string, number | string] | Frame)[] | null | undefined,
  options: GraphLayoutOptions = {},
): GraphLayoutResult {
  const r = options.nodeRadius ?? 14;
  const minNodeDist = Math.max(options.minNodeDist ?? 54, r * 2 + 18);
  const padding = options.padding ?? 28;
  const minWidth = options.minWidth ?? 200;
  const minHeight = options.minHeight ?? 136;
  const directed = options.directed ?? true;

  if (!rawNodes || rawNodes.length === 0) {
    return {
      nodes: [],
      edges: [],
      width: minWidth,
      height: minHeight,
      viewBox: `0 0 ${minWidth} ${minHeight}`,
      directed,
    };
  }

  const nCount = rawNodes.length;
  const idToIndex = new Map<number | string, number>();
  const ids: Array<number | string> = [];
  const labels: string[] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  let allHavePresetCoords = true;

  for (let i = 0; i < nCount; i++) {
    const raw = rawNodes[i];
    if (!raw) continue;
    const id = resolveNodeId(raw, i);
    const label = resolveNodeLabel(raw, id);
    idToIndex.set(id, ids.length);
    ids.push(id);
    labels.push(label);
    if (typeof raw.x === 'number' && Number.isFinite(raw.x) && typeof raw.y === 'number' && Number.isFinite(raw.y)) {
      xs.push(raw.x);
      ys.push(raw.y);
    } else {
      allHavePresetCoords = false;
      xs.push(0);
      ys.push(0);
    }
  }

  const actualCount = ids.length;
  if (actualCount === 0) {
    return {
      nodes: [],
      edges: [],
      width: minWidth,
      height: minHeight,
      viewBox: `0 0 ${minWidth} ${minHeight}`,
      directed,
    };
  }

  const parsedEdges: ParsedGraphEdge[] = [];
  const edgeList = rawEdges || [];
  for (let i = 0; i < edgeList.length; i++) {
    const rawEdge = edgeList[i];
    if (!rawEdge) continue;
    const fromVal = Array.isArray(rawEdge) ? rawEdge[0] : (rawEdge.from ?? 0);
    const toVal = Array.isArray(rawEdge) ? rawEdge[1] : (rawEdge.to ?? 0);
    const fromKey: number | string = typeof fromVal === 'number' || typeof fromVal === 'string' ? fromVal : 0;
    const toKey: number | string = typeof toVal === 'number' || typeof toVal === 'string' ? toVal : 0;
    const fromIndex = idToIndex.get(fromKey);
    const toIndex = idToIndex.get(toKey);
    if (fromIndex === undefined || toIndex === undefined) continue;
    const edgeLabel = !Array.isArray(rawEdge) && rawEdge.label !== undefined
      ? String(rawEdge.label)
      : (!Array.isArray(rawEdge) && rawEdge.weight !== undefined ? String(rawEdge.weight) : undefined);
    parsedEdges.push({
      index: parsedEdges.length,
      from: fromKey,
      to: toKey,
      fromIndex,
      toIndex,
      label: edgeLabel,
    });
  }

  if (allHavePresetCoords) {
    if (actualCount > 1) {
      let minPairDist = Infinity;
      for (let i = 0; i < actualCount; i++) {
        for (let j = i + 1; j < actualCount; j++) {
          const d = Math.hypot((xs[i] ?? 0) - (xs[j] ?? 0), (ys[i] ?? 0) - (ys[j] ?? 0));
          if (d < minPairDist) minPairDist = d;
        }
      }
      const requiredGap = r * 2 + 8;
      if (minPairDist > 1e-4 && minPairDist < requiredGap) {
        const scale = Math.min(3.5, requiredGap / minPairDist);
        let cx = 0;
        let cy = 0;
        for (let i = 0; i < actualCount; i++) {
          cx += xs[i] ?? 0;
          cy += ys[i] ?? 0;
        }
        cx /= actualCount;
        cy /= actualCount;
        for (let i = 0; i < actualCount; i++) {
          xs[i] = cx + ((xs[i] ?? 0) - cx) * scale;
          ys[i] = cy + ((ys[i] ?? 0) - cy) * scale;
        }
      }
      separateOverlappingNodes(xs, ys, requiredGap, 20);
    }
  } else {
    runDeterministicForceLayout(xs, ys, parsedEdges, minNodeDist);
  }

  // Compute centroid for outward self-loop orientation
  let centroidX = 0;
  let centroidY = 0;
  for (let i = 0; i < actualCount; i++) {
    centroidX += xs[i] ?? 0;
    centroidY += ys[i] ?? 0;
  }
  centroidX /= actualCount;
  centroidY /= actualCount;

  const selfLoopNodes = new Set<number>();
  for (const e of parsedEdges) {
    if (e.fromIndex === e.toIndex) selfLoopNodes.add(e.fromIndex);
  }

  const loopReach = r + 32;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < actualCount; i++) {
    const nx = xs[i] ?? 0;
    const ny = ys[i] ?? 0;
    minX = Math.min(minX, nx - r);
    maxX = Math.max(maxX, nx + r);
    minY = Math.min(minY, ny - r);
    maxY = Math.max(maxY, ny + r);
    if (selfLoopNodes.has(i)) {
      const dx = nx - centroidX;
      const dy = ny - centroidY;
      const outAngle = Math.hypot(dx, dy) > 1e-4 ? Math.atan2(dy, dx) : -Math.PI / 2;
      const peakX = nx + Math.cos(outAngle) * loopReach;
      const peakY = ny + Math.sin(outAngle) * loopReach;
      minX = Math.min(minX, peakX - 6);
      maxX = Math.max(maxX, peakX + 6);
      minY = Math.min(minY, peakY - 6);
      maxY = Math.max(maxY, peakY + 6);
    }
  }

  const rawSpanX = Math.max(1, maxX - minX);
  const rawSpanY = Math.max(1, maxY - minY);
  const width = Math.max(minWidth, Math.ceil(rawSpanX + padding * 2));
  const height = Math.max(minHeight, Math.ceil(rawSpanY + padding * 2));
  const shiftX = (width - rawSpanX) / 2 - minX;
  const shiftY = (height - rawSpanY) / 2 - minY;

  for (let i = 0; i < actualCount; i++) {
    xs[i] = roundCoord((xs[i] ?? 0) + shiftX);
    ys[i] = roundCoord((ys[i] ?? 0) + shiftY);
  }
  const shiftedCentroidX = centroidX + shiftX;
  const shiftedCentroidY = centroidY + shiftY;

  const nodes: GraphLayoutNode[] = [];
  for (let i = 0; i < actualCount; i++) {
    const id = ids[i];
    const label = labels[i];
    if (id === undefined || label === undefined) continue;
    nodes.push({
      index: i,
      id,
      label,
      x: xs[i] ?? 0,
      y: ys[i] ?? 0,
      r,
    });
  }

  // Group edges by undirected node pair to curve bidirectional / parallel edges
  const pairBuckets = new Map<string, number[]>();
  for (let i = 0; i < parsedEdges.length; i++) {
    const e = parsedEdges[i];
    if (!e || e.fromIndex === e.toIndex) continue;
    const a = Math.min(e.fromIndex, e.toIndex);
    const b = Math.max(e.fromIndex, e.toIndex);
    const key = `${a}:${b}`;
    const list = pairBuckets.get(key) || [];
    list.push(i);
    pairBuckets.set(key, list);
  }

  const endGap = directed ? r + 4 : r;
  const loopCounts = new Map<number, number>();
  const layoutEdges: GraphLayoutEdge[] = [];

  for (let i = 0; i < parsedEdges.length; i++) {
    const e = parsedEdges[i];
    if (!e) continue;
    const xA = xs[e.fromIndex] ?? 0;
    const yA = ys[e.fromIndex] ?? 0;
    const xB = xs[e.toIndex] ?? 0;
    const yB = ys[e.toIndex] ?? 0;

    if (e.fromIndex === e.toIndex) {
      const seenLoops = loopCounts.get(e.fromIndex) ?? 0;
      loopCounts.set(e.fromIndex, seenLoops + 1);
      const dx = xA - shiftedCentroidX;
      const dy = yA - shiftedCentroidY;
      const baseAngle = Math.hypot(dx, dy) > 1e-4 ? Math.atan2(dy, dx) : -Math.PI / 2;
      const outAngle = baseAngle + seenLoops * 0.7;
      const spread = 0.48;
      const startAngle = outAngle - spread;
      const endAngle = outAngle + spread;
      const sx = roundCoord(xA + Math.cos(startAngle) * r);
      const sy = roundCoord(yA + Math.sin(startAngle) * r);
      const ex = roundCoord(xA + Math.cos(endAngle) * endGap);
      const ey = roundCoord(yA + Math.sin(endAngle) * endGap);
      const ctrlDist = r + 36 + seenLoops * 10;
      const cx1 = roundCoord(xA + Math.cos(outAngle - 0.65) * ctrlDist);
      const cy1 = roundCoord(yA + Math.sin(outAngle - 0.65) * ctrlDist);
      const cx2 = roundCoord(xA + Math.cos(outAngle + 0.65) * ctrlDist);
      const cy2 = roundCoord(yA + Math.sin(outAngle + 0.65) * ctrlDist);
      layoutEdges.push({
        index: e.index,
        from: e.from,
        to: e.to,
        fromIndex: e.fromIndex,
        toIndex: e.toIndex,
        x1: sx,
        y1: sy,
        x2: ex,
        y2: ey,
        path: `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${ex} ${ey}`,
        isSelfLoop: true,
        isCurved: true,
        label: e.label,
      });
      continue;
    }

    const a = Math.min(e.fromIndex, e.toIndex);
    const b = Math.max(e.fromIndex, e.toIndex);
    const bucket = pairBuckets.get(`${a}:${b}`) || [i];
    const dist = Math.hypot(xB - xA, yB - yA);
    if (dist < 1e-4) continue;
    const ux = (xB - xA) / dist;
    const uy = (yB - yA) / dist;

    if (bucket.length === 1) {
      const sx = roundCoord(xA + ux * r);
      const sy = roundCoord(yA + uy * r);
      const ex = roundCoord(xB - ux * endGap);
      const ey = roundCoord(yB - uy * endGap);
      layoutEdges.push({
        index: e.index,
        from: e.from,
        to: e.to,
        fromIndex: e.fromIndex,
        toIndex: e.toIndex,
        x1: sx,
        y1: sy,
        x2: ex,
        y2: ey,
        path: `M ${sx} ${sy} L ${ex} ${ey}`,
        isSelfLoop: false,
        isCurved: false,
        label: e.label,
      });
    } else {
      const posInBucket = bucket.indexOf(i);
      const mid = (bucket.length - 1) / 2;
      const offsetMag = (posInBucket - mid) * 22;
      // Compute normal relative to canonical (a -> b) so bidirectional edges separate cleanly
      const xCanA = xs[a] ?? 0;
      const yCanA = ys[a] ?? 0;
      const xCanB = xs[b] ?? 0;
      const yCanB = ys[b] ?? 0;
      const canLen = Math.hypot(xCanB - xCanA, yCanB - yCanA) || 1;
      const nx = -(yCanB - yCanA) / canLen;
      const ny = (xCanB - xCanA) / canLen;
      const cx = roundCoord((xA + xB) / 2 + nx * offsetMag);
      const cy = roundCoord((yA + yB) / 2 + ny * offsetMag);

      const sDx = cx - xA;
      const sDy = cy - yA;
      const sLen = Math.hypot(sDx, sDy) || 1;
      const eDx = xB - cx;
      const eDy = yB - cy;
      const eLen = Math.hypot(eDx, eDy) || 1;

      const sx = roundCoord(xA + (sDx / sLen) * r);
      const sy = roundCoord(yA + (sDy / sLen) * r);
      const ex = roundCoord(xB - (eDx / eLen) * endGap);
      const ey = roundCoord(yB - (eDy / eLen) * endGap);

      layoutEdges.push({
        index: e.index,
        from: e.from,
        to: e.to,
        fromIndex: e.fromIndex,
        toIndex: e.toIndex,
        x1: sx,
        y1: sy,
        x2: ex,
        y2: ey,
        path: `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`,
        isSelfLoop: false,
        isCurved: true,
        label: e.label,
      });
    }
  }

  return {
    nodes,
    edges: layoutEdges,
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    directed,
  };
}
