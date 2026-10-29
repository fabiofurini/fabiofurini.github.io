/* ch-intro.js — home page: three decomposition examples and the route cards (English). */
(() => {
  const host = document.getElementById('intro-ex');
  if (!host) return;
  const M = (U) => BR.toMask(U.map((i) => i - 1));
  const EX = [
    { label: 'Zero error', G: [[3, 3, 1], [3, 3, 1], [1, 1, 1]], terms: [{ U: M([1, 2]), c: 2 }, { U: M([1, 2, 3]), c: 1 }],
      cap: '$\\Gamma=2\\,X_{\\{1,2\\}}+X_{\\{1,2,3\\}}$ exactly: error 0. We say that $\\Gamma$ lies in the cone $\\COR(3)$.' },
    { label: 'Positive errors only', G: [[1, 0, 0], [0, 1, 2], [0, 2, 1]], terms: [{ U: M([1]), c: 1 }, { U: M([2, 3]), c: 1 }],
      cap: 'Positive errors = underestimates ($\\Gamma_{ij}-H_{ij}>0$). The optimum $H=X_{\\{1\\}}+X_{\\{2,3\\}}$ underestimates only $\\Gamma_{23}$: error 1. With overestimates only, the minimum would be 2.' },
    { label: 'Errors of both signs', G: [[0, 1, 1], [1, 0, 2], [1, 2, 1]], terms: [{ U: M([1, 2, 3]), c: 1 }],
      cap: 'The optimum underestimates $\\Gamma_{23}$ (positive error) and overestimates $\\Gamma_{11},\\Gamma_{22}$ (negative errors): error 3. With errors of one sign only, the minimum would be 4.' },
  ];
  const cell = 44;
  const legendEl = document.getElementById('intro-ex-legend');
  const capEl = document.getElementById('intro-ex-cap');

  function draw(k) {
    const ex = EX[k]; const n = ex.G.length; const H = BR.combine(n, ex.terms); const er = BR.errors(ex.G, H);
    const w = n * cell, sp = 42;
    const W = Math.max(2 * w + 3 * sp + 40, w + ex.terms.length * (w + sp + 36) + 2 * sp + 20);
    const s = DR.svg(host, W, 2 * w + 120, 'Matrix, factors, reconstruction and errors');
    const lab = (x, y, t) => DR.text(s, x, y, t, 'note', { 'text-anchor': 'middle' });
    const op = (x, y, t) => DR.text(s, x, y, t, 'axis', { style: 'font-size:28px;font-weight:500' });
    let x = 10; const y1 = 14;
    DR.matrix(s, ex.G, { x, y: y1, cell, labels: false }); lab(x + w / 2, y1 + w + 20, 'Γ');
    x += w + sp; op(x - sp / 2, y1 + w / 2, er.full < 1e-9 ? '=' : '≈');
    ex.terms.forEach((t, idx) => {
      if (idx) op(x - sp / 2 + 4, y1 + w / 2, '+');
      DR.text(s, x + 10, y1 + w / 2, BR.fmt(t.c), 'axis', { style: 'font-size:22px;fill:#1d2433' }); x += 28;
      const F = BR.factor(n, t.U);
      DR.matrix(s, F, { x, y: y1, cell, labels: false, cls: (i, j) => (F[i][j] ? 'on' : ''), value: (i, j) => String(F[i][j]) });
      lab(x + w / 2, y1 + w + 20, 'X' + BR.setLabel(t.U)); x += w + sp;
    });
    const y2 = y1 + w + 50; x = 10;
    DR.matrix(s, H, { x, y: y2, cell, labels: false }); lab(x + w / 2, y2 + w + 20, 'H (reconstruction)');
    x += w + sp + 30; op(x - sp / 2 - 22, y2 + w / 2, '→');
    const byCell = new Map(er.cells.map((c) => [c.i + ',' + c.j, c]));
    DR.matrix(s, H, { x, y: y2, cell, labels: false, upperOnly: true,
      cls: (i, j) => (byCell.get(i + ',' + j) || {}).kind || '',
      value: (i, j) => { const c = byCell.get(i + ',' + j); if (!c) return ''; return c.kind === 'exact' ? '0' : (c.d < 0 ? '+' : '−') + BR.fmt(Math.abs(c.d)); } });
    lab(x + w / 2, y2 + w + 20, 'Γ − H  ·  total error ' + BR.fmt(er.full));
    const used = new Set(er.cells.map((c) => c.kind));
    legendEl.innerHTML = '<span><i class="sw diag"></i>diagonal</span><span><i class="sw off"></i>off-diagonal</span><span><i class="sw on"></i>1 in the factor</span>' +
      (used.has('under') ? '<span><i class="sw under"></i>underestimate: $\\Gamma_{ij}-H_{ij}&gt;0$ (slack $s^+$)</span>' : '') +
      (used.has('over') ? '<span><i class="sw over"></i>overestimate: $H_{ij}-\\Gamma_{ij}&gt;0$ (slack $s^-$)</span>' : '') +
      '<span><i class="sw exact"></i>exact</span>';
    capEl.innerHTML = ex.cap; DR.texAll(capEl); DR.texAll(legendEl);
  }
  DR.toggle(document.getElementById('intro-ex-tabs'), EX.map((e, k) => ({ label: e.label, value: k })), draw, 0);
  draw(0);

  const cards = [
    ['A', 'matrice-grafo.html', 'From matrix to graph', 'Loops on the vertices, or one extra root: two encodings of the same numbers.'],
    ['B', 'fattori.html', 'Factors and cliques', 'Each factor $X_U$ is an anchored clique: $\\Efull$ is Stage A of AWCD.'],
    ['C', 'errori.html', 'Errors and relaxation', 'Off-diagonal overestimates become free: this gives $(R)$.'],
    ['D', 'pseudoforeste.html', 'Primal and dual', 'The dual of $(R)$ is a maximum-weight pseudoforest.'],
    ['E', 'matching.html', 'The matching', 'The bicircular problem is solved by a bipartite matching.'],
    ['F', 'matching-bound-awcd.html', 'The AWCD bound', 'The same matching as an AWCD dual certificate.'],
    ['G', 'catena.html', 'The complete chain', 'All the equalities, and the only inequality.'],
    ['H', 'matroidi.html', 'Two matroids', 'Bicircular and graphic are not the same thing.'],
    ['∑', 'esempi.html', 'Examples', 'Three complete examples, one of them editable.'],
    ['⚙', 'laboratorio.html', 'Laboratory', 'Change the graph and watch the solutions and bounds change.'],
  ];
  const box = document.getElementById('intro-cards');
  const avail = window.BR_PAGES || cards.map((c) => c[1]);
  box.innerHTML = cards.map(([k, href, t, d]) => avail.includes(href)
    ? `<a class="card" href="${href}"><span class="k">${k}</span><b>${t}</b><span class="d">${d}</span></a>`
    : `<div class="card soon" aria-disabled="true"><span class="k">${k}</span><b>${t}</b><span class="d">${d}</span><span class="tag">in preparation</span></div>`).join('');
  DR.texAll(box);
})();
