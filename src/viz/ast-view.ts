/* ================================================================
   AST View & Inter-line Step Capsule / Flying Value Animation (src/viz/ast-view.ts)
   ================================================================ */
import { splitStatements, stripInlineCommentSafe } from "../compiler/comments";
import { StepAnim, StepSnapshot } from "../types";
import { hoverMetrics } from "./highlight";

export interface AstNode {
  kind: string;
  line: number;
  text: string;
  children?: AstNode[];
}

export function buildAST(src: string): AstNode {
  const lines = String(src || "").replace(/\r\n?/g, "\n").split("\n");
  const children: AstNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const clean = stripInlineCommentSafe(lines[i]).trim();
    if (!clean) continue;
    const stmts = splitStatements(clean).map(s => s.trim()).filter(Boolean);
    for (const st of stmts) {
      let kind = "Statement";
      if (/^(?:export\s+)?(?:async\s+)?function\b/.test(st)) kind = "FunctionDeclaration";
      else if (/^(?:export\s+)?(?:abstract\s+)?class\b/.test(st)) kind = "ClassDeclaration";
      else if (/^(?:export\s+)?interface\b/.test(st)) kind = "InterfaceDeclaration";
      else if (/^(?:export\s+)?type\b/.test(st)) kind = "TypeAliasDeclaration";
      else if (/^(?:const|let|var)\b/.test(st)) kind = "VariableDeclaration";
      else if (/^(?:for|while|do)\b/.test(st)) kind = "LoopStatement";
      else if (/^(?:if|else|switch)\b/.test(st)) kind = "BranchStatement";
      else if (/^return\b/.test(st)) kind = "ReturnStatement";
      children.push({ kind, line: i + 1, text: st });
    }
  }
  return { kind: "Program", line: 1, text: "Program", children };
}

export function renderAST(ast: AstNode): string {
  if (!ast || !Array.isArray(ast.children)) return "";
  return ast.children
    .map(n => `<div class="ast-node" data-line="${n.line}"><span class="ast-kind">${esc(n.kind)}</span> <span class="ast-txt">${esc(n.text)}</span></div>`)
    .join("");
}

export function buildStepVizRow(_rawLine: string, anim: StepAnim | null | undefined, stError: string | null | undefined, isBelow = false) {
  const guideChar = isBelow ? '╰─' : '╭─';
  if (stError) {
    return `<div class="step-viz-row">` +
      `<span class="sv-guide err">${guideChar}</span>` +
      `<div class="sv-box sv-err-box">` +
        `<span class="sv-err-tag">✗ RUNTIME ERROR</span>` +
        `<span class="sv-err-msg">${esc(stError)}</span>` +
      `</div>` +
    `</div>`;
  }

  if (!anim) return '';

  if (anim.type === 'error' && anim.message) {
    return `<div class="step-viz-row">` +
      `<span class="sv-guide err">${guideChar}</span>` +
      `<div class="sv-box sv-err-box">` +
        `<span class="sv-err-tag">✗ RUNTIME ERROR</span>` +
        `<span class="sv-err-msg">${esc(anim.message)}</span>` +
      `</div>` +
    `</div>`;
  }

  if (anim.type === 'checkpoint') {
    const args = anim.args || [];
    const argVals = anim.argVals || [];
    const chips = args.length
      ? args.map((a: string, idx: number) => {
          const av = argVals[idx];
          const showEq = av !== undefined && av !== a;
          return `<span class="sv-arg">${esc(a)}${showEq ? ` <span class="sv-eval">= ${esc(av)}</span>` : ''}</span>`;
        }).join('<span class="sv-dim">,</span>')
      : `<span class="sv-dim">已暂停于检查点函数 ${esc(anim.fn || 'checkpoint')}()</span>`;
    return `<div class="step-viz-row">` +
      `<span class="sv-guide ckpt">${guideChar}</span>` +
      `<div class="sv-box sv-ckpt-box">` +
        `<span class="sv-ckpt-tag">◉ CHECKPOINT</span>` +
        chips +
      `</div>` +
    `</div>`;
  }

  if (anim.type === 'assign') {
    const valTxt = anim.val != null ? anim.val : '…';
    const showFrom = anim.from && anim.from !== valTxt;
    return `<div class="step-viz-row">` +
      `<span class="sv-guide">${guideChar}</span>` +
      `<div class="sv-box">` +
        `<span class="sv-dst">${esc(anim.to)}</span>` +
        `<span class="sv-arrow">⟵</span>` +
        `<span class="sv-val">${esc(valTxt)}</span>` +
        (showFrom ? `<span class="sv-dim">from</span><span class="sv-src">${esc(anim.from)}</span>` : '') +
      `</div>` +
    `</div>`;
  }

  if (anim.type === 'compare') {
    const vCls = anim.result ? 'ok' : 'no';
    const lhsShowVal = anim.lhsVal !== undefined && anim.lhsVal !== anim.lhs;
    const rhsShowVal = anim.rhs && anim.rhsVal !== undefined && anim.rhsVal !== anim.rhs;
    const lhsHtml = `<span class="sv-cmp"><span>${esc(anim.lhs)}</span>${lhsShowVal ? `<span class="sv-eval">= ${esc(anim.lhsVal)}</span>` : ''}</span>`;
    const rhsHtml = anim.rhs
      ? `<span class="sv-op">${esc(anim.op)}</span><span class="sv-cmp"><span>${esc(anim.rhs)}</span>${rhsShowVal ? `<span class="sv-eval">= ${esc(anim.rhsVal)}</span>` : ''}</span>`
      : '';
    return `<div class="step-viz-row">` +
      `<span class="sv-guide">${guideChar}</span>` +
      `<div class="sv-box">` +
        lhsHtml +
        rhsHtml +
        `<span class="sv-verdict ${vCls}">⇒ ${anim.result ? 'true' : 'false'}</span>` +
      `</div>` +
    `</div>`;
  }

  if (anim.type === 'call') {
    const args = anim.args || [];
    const argVals = anim.argVals || [];
    const argChips = args.map((a: string, idx: number) => {
      const av = argVals[idx];
      const showEq = av !== undefined && av !== a;
      return `<span class="sv-arg">${esc(a)}${showEq ? ` <span class="sv-eval">= ${esc(av)}</span>` : ''}</span>`;
    }).join('<span class="sv-dim">,</span>');
    const prefix = anim.to && anim.result != null
      ? `<span class="sv-dst">${esc(anim.to)}</span><span class="sv-arrow">⟵</span><span class="sv-val">${esc(anim.result)}</span><span class="sv-dim">from</span>`
      : (anim.result != null ? `<span class="sv-val">${esc(anim.result)}</span><span class="sv-arrow">⟵</span>` : '');
    return `<div class="step-viz-row">` +
      `<span class="sv-guide">${guideChar}</span>` +
      `<div class="sv-box">` +
        prefix +
        `<span class="sv-fn">${esc(anim.fn)}</span>` +
        `<span class="sv-dim">(</span>${argChips}<span class="sv-dim">)</span>` +
      `</div>` +
    `</div>`;
  }

  return '';
}

let STEP_VIZ_LINE = -1;

export function updateStepViz(st: StepSnapshot | null | undefined, line: number, show: boolean, rawLine: string) {
  if (!stepVizEl) return;
  const html = (show && st) ? buildStepVizRow(rawLine, st.anim, st.error, line === 1) : '';
  if (!html) {
    STEP_VIZ_LINE = -1;
    if (stepVizEl.__vizHtml !== '') {
      stepVizEl.innerHTML = '';
      stepVizEl.__vizHtml = '';
    }
    if (stepVizEl.style) stepVizEl.style.display = 'none';
    return;
  }
  STEP_VIZ_LINE = line;
  if (stepVizEl.__vizHtml !== html) {   // avoid restarting the entry animation on unrelated redraws
    stepVizEl.innerHTML = html;
    stepVizEl.__vizHtml = html;
  }
  if (stepVizEl.style) {
    stepVizEl.style.left = '16px';
    stepVizEl.style.display = 'block';
  }
  positionStepViz();
}

/* Keep the capsule glued to its line while the editor scrolls or the pane resizes. */
export function positionStepViz() {
  if (!stepVizEl || !stepVizEl.style) return;
  if (STEP_VIZ_LINE < 1 || !TRACE.steps.length) {
    stepVizEl.style.display = 'none';
    return;
  }
  let placedBelow = false;
  if (window.PlaygroundCM) {
    const cm = window.PlaygroundCM;
    const lineTop = cm.lineTop(STEP_VIZ_LINE);
    const h = stepVizEl.offsetHeight || 22;
    let top = lineTop - h - 3;
    if (top < 2) {
      top = lineTop + 24 + 3;
      placedBelow = true;
    }
    const boxH = cm.viewportHeight() || 0;
    if (boxH && top + h > boxH - 2) {
      top = lineTop - h - 3;
      placedBelow = false;
      if (top < 2) top = Math.max(2, boxH - h - 4);
    }
    stepVizEl.style.left = cm.contentLeft() + 'px';
    stepVizEl.style.top = Math.round(top) + 'px';
    stepVizEl.style.display = 'block';
  } else {
    const m = hoverMetrics();
    const lineTop = m.padTop + (STEP_VIZ_LINE - 1) * m.lh - (editor.scrollTop || 0);
    const h = stepVizEl.offsetHeight || 22;
    let top = lineTop - h - 3;                     // preferred: float directly above the line
    if (top < 2) {
      top = lineTop + m.lh + 3;                    // no room above → drop below the line
      placedBelow = true;
    }
    const boxH = editor.clientHeight || 0;
    if (boxH && top + h > boxH - 2) {              // keep it inside the code box at the bottom edge
      top = lineTop - h - 3;
      placedBelow = false;
      if (top < 2) top = Math.max(2, boxH - h - 4);
    }
    stepVizEl.style.top = Math.round(top) + 'px';
    stepVizEl.style.display = 'block';
  }
  if (stepVizEl.classList) {
    stepVizEl.classList.toggle('below-line', placedBelow);
  }
  if (typeof stepVizEl.innerHTML === 'string' && stepVizEl.innerHTML) {
    const targetGuide = placedBelow ? '╰─' : '╭─';
    const nextHtml = stepVizEl.innerHTML.replace(
      /(<span class="sv-guide(?:\s+[^"]*)?">)(?:╭─|╰─)(<\/span>)/,
      `$1${targetGuide}$2`
    );
    if (nextHtml !== stepVizEl.innerHTML) {
      stepVizEl.innerHTML = nextHtml;
      stepVizEl.__vizHtml = nextHtml;
    }
  }
}

export function clearFlyLayer() {
  if (flyLayerEl) flyLayerEl.innerHTML = '';
}

export function playStepAnimation(st: StepSnapshot | null | undefined) {
  clearFlyLayer();
  if (IS_STILL || !st || !st.anim || !flyLayerEl) return;
  const anim = st.anim;
  if (anim.type !== 'assign' && !(anim.type === 'call' && anim.to && anim.result != null)) return;

  const srcEl = highlightEl.querySelector('.ln.cur .tok-src') || highlightEl.querySelector('.ln.cur .tok-fn');
  const dstEl = highlightEl.querySelector('.ln.cur .tok-dst') || highlightEl.querySelector('.ln.cur');
  if (!srcEl || !dstEl) return;

  const sRect = srcEl.getBoundingClientRect();
  const dRect = dstEl.getBoundingClientRect();
  if (sRect.width === 0 && sRect.height === 0) return;

  const chip = document.createElement('div');
  chip.className = 'fly-chip';
  chip.textContent = String(anim.val != null ? anim.val : anim.result);
  const sx = Math.round(sRect.left + sRect.width / 2 - 14);
  const sy = Math.round(sRect.top - 6);
  const dx = Math.round(dRect.left + dRect.width / 2 - 14);
  const dy = Math.round(dRect.top - 6);

  chip.style.transform = `translate3d(${sx}px, ${sy}px, 0) scale(0.92)`;
  chip.style.opacity = '0.96';
  flyLayerEl.appendChild(chip);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      chip.classList.add('landed');
      chip.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1)`;
    });
  });

  setTimeout(() => {
    chip.style.opacity = '0';
  }, 340);
  setTimeout(() => {
    if (chip.parentNode) chip.parentNode.removeChild(chip);
  }, 620);
}
