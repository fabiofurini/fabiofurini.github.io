/* ch-matrice-grafo.js — Chapter A: from matrix to graph (loop ℓ_i versus root edge (r,i)). English version. */
(() => {
  const sec = document.getElementById('matrice-grafo');
  if (!sec) return;
  const $ = (id) => sec.querySelector('#' + id);
  const G = [[4, 2, 1], [2, 3, 5], [1, 5, 6]]; // six distinct values: diagonal 4,3,6; off-diagonal 2,1,5
  const n = 3;
  const SUBS = '₀₁₂₃₄₅₆₇₈₉';
  const sub = (k) => String(k).split('').map((d) => SUBS[+d]).join('');
  const key = (i, j) => (i <= j ? i + ',' + j : j + ',' + i);
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------ state
  let hover = null, pinned = null; // key 'i,j' (i ≤ j); 'i,i' = diagonal datum
  let T = 0.5;                     // transition parameter (0 = loop, 1 = root edge)
  let demo = null;                 // set of elements highlighted in the “Caution” box

  // ------------------------------------------------------------ shared geometry
  const W = 300, H = 262, CX = 150, CY = 150, RAD = 106, VR = 20;
  const POS = DR.layout(n, { cx: CX, cy: CY, r: RAD }).pos; // vertex 1 at the top
  const unit = (dx, dy) => { const L = Math.hypot(dx, dy) || 1; return [dx / L, dy / L, L]; };

  function vertex(parent, i, cls = '') {
    const v = DR.el('g', { class: 'vtx ' + cls }, parent);
    DR.el('circle', { cx: POS[i][0], cy: POS[i][1], r: VR }, v);
    DR.text(v, POS[i][0], POS[i][1], String(i + 1));
    return v;
  }
  /** Edge {i,j} with a hit area and an outward label. */
  function offEdge(gE, gT, i, j, extra = '') {
    const [x1, y1] = POS[i], [x2, y2] = POS[j];
    const k = key(i, j);
    DR.el('line', { x1, y1, x2, y2, class: 'edge ' + extra, 'data-k': k }, gE);
    DR.el('line', { x1, y1, x2, y2, class: 'hit', 'data-k': k }, gE);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const [ux, uy] = unit(mx - CX, my - CY);
    DR.text(gT, mx + ux * 16, my + uy * 16, BR.fmt(G[i][j]), 'wl off', { 'data-k': k });
  }

  /** Scene with parameter t: t=0 loops ℓ_i (pointing to the centre), t=1 root edges (r,i). */
  function scene(container, t, { label, ghost = false, arrows = false, demoCls = null } = {}) {
    const s = DR.svg(container, W, H, label);
    const gE = DR.el('g', {}, s), gM = DR.el('g', {}, s), gA = DR.el('g', {}, s), gV = DR.el('g', {}, s), gT = DR.el('g', {}, s);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) offEdge(gE, gT, i, j, demoCls ? demoCls('e', i, j) : '');
    // root (ghost during the transition)
    if (ghost && t < 1) DR.el('circle', { cx: CX, cy: CY, r: VR + 2, class: 'ghost-root', opacity: Math.max(0.25, 1 - t) }, gV);
    if (t > 0) {
      const r = DR.el('g', { class: 'vtx root', opacity: t }, gV);
      DR.el('circle', { cx: CX, cy: CY, r: VR + 2 }, r);
      DR.text(r, CX, CY, 'r');
    }
    for (let i = 0; i < n; i++) {
      const [px, py] = POS[i];
      const [ux, uy, L] = unit(CX - px, CY - py);
      const a0 = 27, b0 = 12, a = a0 + (L / 2 - a0) * t, b = b0 * (1 - t);
      const qx = px + 2 * a * ux, qy = py + 2 * a * uy;
      const phi = (Math.atan2(uy, ux) * 180) / Math.PI;
      const d = `M${px} ${py} A${a} ${b} ${phi} 0 1 ${qx} ${qy} A${a} ${b} ${phi} 0 1 ${px} ${py}`;
      const k = key(i, i);
      const extra = demoCls ? demoCls('l', i, i) : '';
      DR.el('path', { d, class: (t < 0.999 ? 'loop ' : 'edge root ') + extra, 'data-k': k }, gM);
      DR.el('path', { d, class: 'hit', 'data-k': k }, gM);
      // label: from the tip of the loop to the middle of the root edge (shifted sideways)
      const px2 = -uy, py2 = ux;
      const lx = px + (2 * a0 + 13 - (2 * a0 + 13 - L / 2) * t) * ux + px2 * 14 * t;
      const ly = py + (2 * a0 + 13 - (2 * a0 + 13 - L / 2) * t) * uy + py2 * 14 * t;
      DR.text(gT, lx, ly, BR.fmt(G[i][i]), 'wl diag', { 'data-k': k });
      if (arrows && t < 0.97) {
        const sx = qx + ux * 5, sy = qy + uy * 5, ex = CX - ux * (VR + 6), ey = CY - uy * (VR + 6);
        if (Math.hypot(ex - sx, ey - sy) > 10) {
          const ar = DR.arrow(gA, sx, sy, ex, ey, { cls: 'arrow flow', marker: 'arrowhead-root' });
          ar.setAttribute('opacity', (1 - t) * 0.9);
          ar.style.stroke = 'var(--root)';
        }
      }
    }
    for (let i = 0; i < n; i++) vertex(gV, i);
    return s;
  }

  // ------------------------------------------------------------ figure 1: matrix + base graph
  function drawMatrix() {
    const s = DR.svg($('mg-matrix'), 236, 232, 'Symmetric 3 by 3 matrix Gamma: diagonal 4, 3, 6; off-diagonal 2, 1, 5');
    const m = DR.matrix(s, G, { x: 44, y: 34, cell: 60 });
    for (const [kk, c] of m.cells) { const [i, j] = kk.split(',').map(Number); c.setAttribute('data-k', key(i, j)); }
  }
  function drawBase() {
    const s = DR.svg($('mg-base'), W, H, 'Complete graph on vertices 1, 2, 3 with the off-diagonal weights; the diagonal values still have no place');
    const gE = DR.el('g', {}, s), gV = DR.el('g', {}, s), gT = DR.el('g', {}, s);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) offEdge(gE, gT, i, j);
    for (let i = 0; i < n; i++) {
      vertex(gV, i);
      const by = POS[i][1] + (POS[i][1] < CY ? -36 : 38);
      DR.text(gT, POS[i][0], by, `Γ${sub(i + 1)}${sub(i + 1)} = ${G[i][i]}  ?`, 'badge', { 'data-k': key(i, i) });
    }
  }

  // ------------------------------------------------------------ figure 2: loop → root edge
  const DEMOS = [
    { id: 'none', label: 'No set', elems: [] },
    { id: 'loops', label: 'Three loops $\\ell_1,\\ell_2,\\ell_3$', elems: [['l', 0, 0], ['l', 1, 1], ['l', 2, 2]] },
    { id: 'path', label: '$\\ell_1,\\ \\{1,2\\},\\ \\{2,3\\}$', elems: [['l', 0, 0], ['e', 0, 1], ['e', 1, 2]] },
    { id: 'tri', label: 'Triangle $\\{1,2\\},\\{1,3\\},\\{2,3\\}$', elems: [['e', 0, 1], ['e', 0, 2], ['e', 1, 2]] },
  ];
  const demoSet = () => (demo ? new Set(demo.elems.map(([tp, i, j]) => tp + i + j)) : new Set());
  /** Independence in the bicircular matroid (pseudoforest) and in the graphic matroid of the bordered graph (forest). */
  function verdicts(elems) {
    const F = elems.map(([tp, i, j]) => ({ id: tp + i + j, type: tp === 'l' ? 'loop' : 'edge', i, j, w: 1 }));
    const pseudo = BR.isPseudoforest(n, F);
    const parent = [...Array(n + 1).keys()];
    const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    let forest = true;
    for (const [tp, i, j] of elems) {
      const u = tp === 'l' ? n : i, v = tp === 'l' ? i : j; // loop ℓ_i ↦ edge (r,i), r = n
      const a = find(u), b = find(v);
      if (a === b) forest = false; else parent[a] = b;
    }
    return { pseudo, forest };
  }
  function drawSides() {
    const ds = demoSet();
    const ver = demo && demo.elems.length ? verdicts(demo.elems) : null;
    const mk = (ok) => (tp, i, j) => (ds.size ? (ds.has(tp + i + j) ? (ok ? 'sel' : 'rej') : 'thin') : '');
    scene($('mg-loops'), 0, { label: 'Pseudoforest encoding: one loop on each vertex with weight Gamma_ii', demoCls: ver ? mk(ver.pseudo) : null });
    scene($('mg-root'), 1, { label: 'AWCD encoding: root r and root edges (r,i) with weight Gamma_ii', demoCls: ver ? mk(ver.forest) : null });
    const vl = $('mg-v-loops'), vr = $('mg-v-root');
    if (!ver) {
      vl.innerHTML = '<span class="muted">$n$ loops $+\\ \\binom n2$ edges $=6$ elements</span>';
      vr.innerHTML = '<span class="muted">$n$ root edges $+\\ \\binom n2$ edges $=6$ edges</span>';
    } else {
      vl.innerHTML = ver.pseudo ? '<span class="ok">✓ independent</span> in the bicircular matroid: every component has at most one cycle.'
                                : '<span class="no">✗ dependent</span>: one component has two cycles.';
      vr.innerHTML = ver.forest ? '<span class="ok">✓ independent</span> in the graphic matroid: it is a forest.'
                                : '<span class="no">✗ dependent</span> in the graphic matroid: it contains a cycle.';
    }
    DR.texAll(vl); DR.texAll(vr);
  }
  function drawMorph() {
    scene($('mg-morph'), T, { label: 'Transition from loop to root edge, parameter ' + T.toFixed(2), ghost: true, arrows: true });
    const st = $('mg-tstate');
    st.innerHTML = T < 0.02
      ? '<b>$t=0$.</b> The datum $\\Gamma_{ii}$ is a loop $\\ell_i$: an element with a single endpoint, already a cycle. The dashed root does not exist yet.'
      : T > 0.98
        ? '<b>$t=1$.</b> The datum $\\Gamma_{ii}$ is the edge $(r,i)$: an ordinary edge with two endpoints, $i$ and the root $r$.'
        : `<b>$t=${T.toFixed(2)}$.</b> The loop stretches towards $r$ and carries the weight $\\Gamma_{ii}$ with it.`;
    DR.texAll(st);
  }

  // ------------------------------------------------------------ correspondence table
  function buildTable() {
    const tb = sec.querySelector('#mg-table tbody');
    const rows = [];
    for (let i = 0; i < n; i++) rows.push([key(i, i), `$\\Gamma_{${i + 1}${i + 1}}$`, G[i][i], `loop $\\ell_{${i + 1}}$`, `root edge $(r,${i + 1})$`, 'dg']);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++)
      rows.push([key(i, j), `$\\Gamma_{${i + 1}${j + 1}}$`, G[i][j], `edge $\\{${i + 1},${j + 1}\\}$`, `edge $\\{${i + 1},${j + 1}\\}$`, 'of']);
    tb.innerHTML = rows.map(([k, nm, v, a, b, c]) =>
      `<tr data-k="${k}"><td class="${c}">${nm}</td><td class="${c}">${v}</td><td>${a}</td><td>${b}</td></tr>`).join('') +
      '<tr class="tot"><td>Total</td><td>$\\tfrac{n(n+1)}{2}=6$ numbers</td><td>3 loops + 3 edges</td><td>3 root edges + 3 edges</td></tr>';
    DR.texAll(tb);
  }

  // ------------------------------------------------------------ shared highlighting
  function applyHL() {
    const k = hover ?? pinned;
    sec.querySelectorAll('[data-k]').forEach((e) => {
      const on = k !== null && e.getAttribute('data-k') === k;
      const isHit = e.classList.contains('hit');
      if (e.tagName.toLowerCase() === 'tr') { e.classList.toggle('hlrow', on); return; }
      if (isHit) return;
      e.classList.toggle('hl', on);
      const graphic = e.classList.contains('edge') || e.classList.contains('loop');
      e.classList.toggle('fade', k !== null && !on && (graphic || e.classList.contains('wl') || e.classList.contains('badge')));
    });
  }
  sec.addEventListener('mouseover', (ev) => {
    const t = ev.target.closest && ev.target.closest('[data-k]');
    const k = t ? t.getAttribute('data-k') : null;
    if (k !== hover) { hover = k; applyHL(); }
  });
  sec.addEventListener('mouseleave', () => { hover = null; applyHL(); });
  sec.addEventListener('click', (ev) => {
    const t = ev.target.closest && ev.target.closest('[data-k]');
    if (!t) return;
    const k = t.getAttribute('data-k');
    pinned = pinned === k ? null : k; hover = null; applyHL();
  });

  // ------------------------------------------------------------ controls
  const ctl = $('mg-ctl');
  let anim = null, slider = null;
  const setT = (t, fromSlider = false) => {
    T = Math.min(1, Math.max(0, t));
    if (!fromSlider && slider) { slider.value = T; slider.parentNode.querySelector('output').textContent = T.toFixed(2); }
    drawMorph(); applyHL();
  };
  const animateTo = (target) => {
    if (anim) cancelAnimationFrame(anim);
    if (reduced) { setT(target); return; }
    const t0 = T, start = performance.now(), dur = 1400 * Math.max(0.25, Math.abs(target - t0));
    const step = (now) => {
      const u = Math.min(1, (now - start) / dur), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      setT(t0 + (target - t0) * e);
      if (u < 1) anim = requestAnimationFrame(step); else anim = null;
    };
    anim = requestAnimationFrame(step);
  };
  const mkBtn = (html, fn, cls = 'btn') => { const b = DR.h('button', cls, html, ctl); b.type = 'button'; b.addEventListener('click', fn); return b; };
  mkBtn('◀ (1) Loop', () => animateTo(0));
  mkBtn('▶ Play', () => { if (reduced) { setT(T > 0.5 ? 0 : 1); return; } setT(0); animateTo(1); }, 'btn primary');
  mkBtn('(2) Root edge ▶', () => animateTo(1));
  slider = DR.slider(ctl, { label: 'transition $t$', min: 0, max: 1, step: 0.01, value: T, format: (v) => (+v).toFixed(2),
    onInput: (v) => { if (anim) { cancelAnimationFrame(anim); anim = null; } setT(v, true); } });

  const dctl = $('mg-demo');
  DR.toggle(dctl, DEMOS.map((d) => ({ label: d.label, value: d.id })), (v) => {
    demo = DEMOS.find((d) => d.id === v); if (demo.id === 'none') demo = null; drawSides(); applyHL();
  }, 'none');
  DR.texAll(dctl);

  // ------------------------------------------------------------ start
  drawMatrix(); drawBase(); drawSides(); drawMorph(); buildTable(); applyHL();
})();
