/* ch-matroidi.js — Capitolo H: matroide bicircolare vs matroide grafico. */
(() => {
  const sec = document.getElementById('matroidi');
  if (!sec || typeof BR === 'undefined' || typeof DR === 'undefined') return;
  const q = (id) => sec.querySelector('#' + id);
  const EPS = 1e-7;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const f = (x) => BR.fmt(x);

  // ---------------------------------------------------------------- fase B (min traccia fra gli ottimi di E_full)
  /** f2* = min Σ_U |U| p_U  s.t. p ottimo per E_full (stesso modello di BR.efull + vincolo sull'errore). */
  function phaseB(G) {
    const n = G.length; const S = BR.allSubsets(n); const E = BR.entries(n); const m = E.length;
    const z = BR.efull(G).value; const nv = S.length + 2 * m;
    const rows = E.map(([i, j], r) => {
      const a = new Array(nv).fill(0);
      S.forEach((U, k) => { if (BR.has(U, i) && BR.has(U, j)) a[k] = 1; });
      a[S.length + r] = 1; a[S.length + m + r] = -1;
      return { a, op: '=', b: G[i][j] };
    });
    const a = new Array(nv).fill(0); for (let k = S.length; k < nv; k++) a[k] = 1;
    rows.push({ a, op: '<=', b: z + 1e-9 });
    const c = new Array(nv).fill(0); S.forEach((U, k) => { c[k] = BR.popcount(U); });
    const res = BR.simplex(c, rows);
    return { z, f2: res.status === 'optimal' ? res.value : NaN };
  }

  // ---------------------------------------------------------------- geometria comune (triangolo)
  const W = 340, Hh = 300;
  const POS3 = DR.layout(3, { cx: 170, cy: 168, r: 96 }).pos;
  const ROOT3 = [170, 168];

  /** Disegna lo stato dei due grafi. status: Map id → classe ('sel','rej','thin','ghost', + ' hl'). */
  function drawLoopGraph(box, G, status, label) {
    const svg = DR.svg(box, W, Hh, label);
    const n = G.length; const edges = [], loops = [];
    for (let i = 0; i < n; i++) {
      const id = 'l' + (i + 1); const w = G[i][i];
      loops.push({ i, cls: status.get(id) || 'thin', label: f(w), labelCls: w > EPS ? 'diag' : 'muted' });
    }
    for (const [i, j] of BR.offPairs(n)) {
      const id = 'e' + (i + 1) + (j + 1); const w = G[i][j];
      edges.push({ i, j, cls: status.get(id) || 'thin', label: f(w), labelCls: w > EPS ? 'off' : 'muted' });
    }
    DR.graph(svg, n, { pos: POS3, edges, loops });
    return svg;
  }
  function drawRootedGraph(box, G, status, label) {
    const svg = DR.svg(box, W, Hh, label);
    const n = G.length; const edges = [], rootEdges = [];
    for (let i = 0; i < n; i++) {
      const id = 'l' + (i + 1); const w = G[i][i];
      rootEdges.push({ v: i, cls: status.get(id) || 'thin', label: f(w), labelCls: w > EPS ? 'diag' : 'muted', t: 0.55 });
    }
    for (const [i, j] of BR.offPairs(n)) {
      const id = 'e' + (i + 1) + (j + 1); const w = G[i][j];
      edges.push({ i, j, cls: status.get(id) || 'thin', label: f(w), labelCls: w > EPS ? 'off' : 'muted' });
    }
    DR.graph(svg, n, { pos: POS3, edges, rootEdges, root: ROOT3 });
    return svg;
  }

  // ---------------------------------------------------------------- figura: due greedy in parallelo
  const st = { t: 0, k: null, timer: null };
  const tri = (t) => [[t, 1, 1], [1, t, 1], [1, 1, t]];
  let model = null;

  function buildModel(t) {
    const G = tri(t);
    const gr = BR.greedyPseudoforest(G);
    const ms = BR.maxSpanningForest(G.length + 1, BR.rootedEdges(G));
    const idOfKr = (e) => (e.root ? 'l' + (e.v + 1) : 'e' + e.label);
    const pb = phaseB(G);
    return {
      G, gr, ms, pb,
      left: gr.steps.map((s) => ({ id: s.el.id, lab: BR.elemLabel(s.el), loop: s.el.type === 'loop', w: s.el.w, ok: s.accepted, why: s.reason })),
      right: ms.steps.map((s) => ({ id: idOfKr(s.e), lab: s.e.root ? '(r,' + (s.e.v + 1) + ')' : '{' + s.e.label[0] + ',' + s.e.label[1] + '}', loop: s.e.root, w: s.e.w, ok: s.accepted, why: s.reason })),
    };
  }

  function statusAt(list, k, G) {
    const m = new Map();
    // elementi di peso nullo: fantasmi (il greedy li ignora)
    for (const e of BR.elements(G)) if (e.w <= EPS) m.set(e.id, 'ghost');
    list.forEach((s, idx) => {
      if (idx < k) m.set(s.id, (s.ok ? 'sel' : 'rej') + (idx === k - 1 ? ' hl' : ''));
      else m.set(s.id, 'thin');
    });
    return m;
  }

  function traceHTML(list, k) {
    if (!list.length) return '<div class="row todo"><span></span><span>—</span><span></span><span class="why">nessun elemento di peso positivo</span></div>';
    return list.map((s, idx) => {
      const cls = idx < k ? (s.ok ? 'acc' : 'rej') + (idx === k - 1 ? ' cur' : '') : 'todo';
      const stt = idx < k ? (s.ok ? '✓' : '✗') : '·';
      const why = idx < k ? s.why : 'in attesa';
      return `<div class="row ${cls}"><span class="muted">${idx + 1}</span><span class="el ${s.loop ? 'd' : 'o'}">${s.lab}<span class="muted"> · ${f(s.w)}</span></span><span class="st">${stt}</span><span class="why">${why}</span></div>`;
    }).join('');
  }

  const kpi = (l, v, extra = '') => `<div class="kpi"><div class="l">${l}</div><div class="v"${extra}>${v}</div></div>`;

  function render() {
    const M = model; const L = Math.max(M.left.length, M.right.length);
    const k = st.k === null ? L : Math.min(st.k, L);
    const sumAcc = (list) => list.slice(0, k).reduce((s, x) => s + (x.ok ? x.w : 0), 0);
    drawLoopGraph(q('hx-left'), M.G, statusAt(M.left, k, M.G),
      `Grafo con loop, Gamma_ii = ${f(st.t)}, Gamma_ij = 1: greedy bicircolare al passo ${k} di ${L}`);
    drawRootedGraph(q('hx-right'), M.G, statusAt(M.right, k, M.G),
      `Grafo bordato con radice r, w_ri = ${f(st.t)}, w_ij = 1: Kruskal al passo ${k} di ${L}`);
    q('hx-left-trace').innerHTML = traceHTML(M.left, k);
    q('hx-right-trace').innerHTML = traceHTML(M.right, k);
    const g = BR.gamma(M.G);
    q('hx-left-kpi').innerHTML = kpi('preso finora', f(sumAcc(M.left))) + kpi('$w(F^*)$', f(M.gr.value), ' style="color:var(--exact)"');
    q('hx-right-kpi').innerHTML = kpi('preso finora', f(sumAcc(M.right))) + kpi('$\\Zcov=w(T)$', f(M.ms.value), ' style="color:var(--root)"');
    DR.texAll(q('hx-left-kpi')); DR.texAll(q('hx-right-kpi'));
    q('hx-stepn').textContent = `passo ${k} / ${L}`;
    q('hx-prev').disabled = k === 0; q('hx-next').disabled = k === L;
    renderBalance();
    renderVerdict();
  }

  function renderVerdict() {
    const M = model; const g = BR.gamma(M.G); const z = M.pb.z; const wT = M.ms.value; const LB = M.gr.value - g;
    const box = q('hx-verdict');
    const cmp = wT > z + EPS ? '<span class="rel-geq">&gt;</span>' : wT < z - EPS ? '<span class="rel-eq">&lt;</span>' : '<span class="rel-eq">=</span>';
    box.innerHTML = `<div class="hx-vline"><span>$\\LB=w(F^*)-\\gamma=${f(LB)}$ <span class="rel-eq">≤</span> $z^*=${f(z)}$ <span class="ok">✓ sempre</span></span>` +
      `<span>$w(T)=${f(wT)}$ ${cmp} $z^*=${f(z)}$ ${wT > z + EPS ? '<span class="no">non è un lower bound</span>' : '<span class="muted small">(qui sotto, ma non è garantito)</span>'}</span></div>`;
    DR.texAll(box);
  }

  function renderBalance() {
    const M = model; const g = BR.gamma(M.G); const z = M.pb.z, f2 = M.pb.f2;
    const wF = M.gr.value, wT = M.ms.value, LB = wF - g;
    const yes = (b) => (b ? '<span class="ok">✓ vero</span>' : '<span class="no">✗ falso</span>');
    const rows = [
      ['$w(F^*)=\\val(R)$', 'greedy bicircolare', f(wF), ''],
      ['$\\Zcov(w)=w(T)$', 'Kruskal sul grafo bordato', f(wT), ''],
      ['$\\gamma=\\tr\\Gamma$', 'traccia', f(g), ''],
      ['$z^*=\\Efull(\\Gamma)$', 'fase A (simplesso)', f(z), ''],
      ['$f_2^*$', 'fase B: traccia minima fra gli ottimi', f(f2), ''],
      ['$\\LB=w(F^*)-\\gamma\\le z^*$', 'bound delle pseudoforeste', `${f(LB)} ≤ ${f(z)}`, yes(LB <= z + EPS)],
      ['$w(T)\\le w(F^*)$', 'foreste ⊆ pseudoforeste', `${f(wT)} ≤ ${f(wF)}`, yes(wT <= wF + EPS)],
      ['$\\Zcov\\le z^*+f_2^*$', 'proposizione', `${f(wT)} ≤ ${f(z + f2)}`, yes(wT <= z + f2 + 1e-6)],
      ['$\\Zcov\\le z^*$ ?', 'sarebbe un lower bound sulla distanza', `${f(wT)} ≤ ${f(z)}`, yes(wT <= z + EPS) +
        (wT > z + EPS ? ' <span class="small muted">non è un bound sulla distanza</span>' : ' <span class="small muted">qui sì, ma per caso</span>')],
    ];
    const tb = q('hx-balance');
    tb.innerHTML = `<thead><tr><th>Quantità</th><th>Da dove viene</th><th style="text-align:right">Valore</th><th style="text-align:center">Esito</th></tr></thead><tbody>` +
      rows.map((r) => `<tr><td>${r[0]}</td><td class="small">${r[1]}</td><td class="n">${r[2]}</td><td class="c">${r[3]}</td></tr>`).join('') + '</tbody>';
    DR.texAll(tb);
  }

  function setT(t) {
    st.t = t; model = buildModel(t); stop(); st.k = null; render();
    if (tInput) { tInput.value = t; const out = tInput.parentNode.querySelector('output'); if (out) out.textContent = f(t); }
    presetBtns.forEach((b, i) => b.classList.toggle('on', Math.abs(PRESETS[i].value - t) < 1e-9));
  }
  function stop() { if (st.timer) { clearInterval(st.timer); st.timer = null; } const b = q('hx-run'); if (b) b.textContent = '▶ Riproduci'; }
  function L() { return Math.max(model.left.length, model.right.length); }
  function cur() { return st.k === null ? L() : st.k; }

  const PRESETS = [
    { label: '$t=0$ · controesempio minimo', value: 0 },
    { label: '$t=\\tfrac12$', value: 0.5 },
    { label: '$t=5$ · diagonale grande', value: 5 },
  ];
  const presetBtns = DR.toggle(q('hx-presets'), PRESETS, (v) => setT(v), 0);
  DR.texAll(q('hx-presets'));
  const tInput = DR.slider(q('hx-tslider'), { label: 'diagonale $\\Gamma_{ii}=t$', min: 0, max: 5, step: 0.25, value: 0, onInput: (v) => setT(v) });

  const play = q('hx-play');
  const mk = (id, label, fn) => { const b = DR.h('button', 'btn', label, play); b.type = 'button'; b.id = id; b.addEventListener('click', fn); return b; };
  mk('hx-reset', '⟲ Ricomincia', () => { stop(); st.k = 0; render(); });
  mk('hx-prev', '◀ Indietro', () => { stop(); st.k = Math.max(0, cur() - 1); render(); });
  mk('hx-next', 'Avanti ▶', () => { stop(); st.k = Math.min(L(), cur() + 1); render(); });
  const run = mk('hx-run', '▶ Riproduci', () => {
    if (st.timer) { stop(); return; }
    if (cur() >= L()) st.k = 0;
    if (reduced) { st.k = L(); render(); return; }
    run.textContent = '❚❚ Pausa'; run.classList.add('primary');
    st.timer = setInterval(() => {
      if (cur() >= L()) { stop(); run.classList.remove('primary'); return; }
      st.k = cur() + 1; render();
      if (st.k >= L()) { stop(); run.classList.remove('primary'); }
    }, 1000);
    render();
  });
  DR.h('span', 'hx-step', '', play).id = 'hx-stepn';

  model = buildModel(0);
  render();

  // ---------------------------------------------------------------- galleria
  const n4 = 4;
  const P4 = [[34, 112], [76, 50], [144, 50], [186, 112]];
  const R4 = [110, 168];
  const L1 = (i) => ({ id: 'l' + i, type: 'loop', i: i - 1, j: i - 1, w: 1 });
  const E1 = (i, j) => ({ id: 'e' + i + j, type: 'edge', i: i - 1, j: j - 1, w: 1 });
  const GALLERY = [
    { t: 'Un albero', set: [E1(1, 2), E1(2, 3), E1(3, 4)] },
    { t: 'Un loop su un albero', set: [L1(1), E1(1, 2), E1(2, 3)] },
    { t: 'Un ciclo (triangolo)', set: [E1(1, 2), E1(2, 3), E1(1, 3)] },
    { t: 'Due cicli, componenti diverse', set: [E1(1, 2), E1(2, 3), E1(1, 3), L1(4)] },
    { t: 'Due cicli, stessa componente', set: [E1(1, 2), E1(2, 3), E1(1, 3), L1(1)] },
    { t: 'Due loop collegati', set: [L1(1), E1(1, 2), E1(2, 3), L1(3)] },
    { t: 'Due loop separati', set: [L1(1), E1(1, 2), L1(3), E1(3, 4)] },
    { t: 'Tutti i loop (stella di r)', set: [L1(1), L1(2), L1(3), L1(4)] },
  ];
  const loopDir = (i) => (i === 0 ? Math.PI : i === 3 ? 0 : -Math.PI / 2);

  function bicVerdict(set) {
    const comps = BR.components(n4, set);
    const ok = BR.isPseudoforest(n4, set);
    const bad = comps.find((c) => c.elems.length > c.verts.length);
    const cyc = comps.filter((c) => c.cyclic).length;
    const why = ok ? (cyc === 0 ? 'nessun ciclo' : cyc === 1 ? 'un solo ciclo' : 'un ciclo per componente')
      : `componente {${bad.verts.map((v) => v + 1).join(',')}}: ${bad.elems.length} elementi su ${bad.verts.length} vertici, due cicli`;
    return { ok, why };
  }
  function graVerdict(set) {
    const edges = set.map((e) => (e.type === 'loop' ? { u: n4, v: e.i, w: 1, root: true } : { u: e.i, v: e.j, w: 1 }));
    const ms = BR.maxSpanningForest(n4 + 1, edges);
    const ok = ms.T.length === set.length;
    const viaR = !ok && ms.steps.some((s) => !s.accepted && s.e.root) ;
    const usesR = set.some((e) => e.type === 'loop');
    const rejRoot = ms.steps.find((s) => !s.accepted);
    const why = ok ? (usesR ? 'foresta: rami appesi a r' : 'foresta') :
      (rejRoot && (rejRoot.e.root || viaR) ? 'ciclo che passa per r' : (usesR && ciclePassesR(set) ? 'ciclo che passa per r' : 'ciclo fra archi ordinari'));
    return { ok, why };
  }
  /** C'è un ciclo che usa la radice? (due loop nella stessa componente di archi ordinari) */
  function ciclePassesR(set) {
    const ord = set.filter((e) => e.type === 'edge');
    const comps = BR.components(n4, ord);
    const compOf = (v) => { const c = comps.find((c) => c.verts.includes(v)); return c ? c.mask : 1 << (v + 8); };
    const seen = new Map();
    for (const e of set) if (e.type === 'loop') { const k = compOf(e.i); seen.set(k, (seen.get(k) || 0) + 1); }
    return [...seen.values()].some((c) => c >= 2);
  }

  function miniGraph(box, set, rooted, label) {
    const svg = DR.svg(box, 220, 190, label);
    const ids = new Set(set.map((e) => e.id));
    const edges = []; for (const [i, j] of BR.offPairs(n4)) if (ids.has('e' + (i + 1) + (j + 1))) edges.push({ i, j, cls: 'hl' });
    const loops = [], rootEdges = [];
    for (let i = 0; i < n4; i++) if (ids.has('l' + (i + 1))) (rooted ? rootEdges.push({ v: i, cls: 'sel' }) : loops.push({ i, cls: 'sel' }));
    // archi ordinari selezionati in blu-verde: usiamo 'sel'; i loop/archi radice mantengono l'ambra con bordo verde
    const gr = DR.graph(svg, n4, { pos: P4, edges, loops, rootEdges, root: rooted ? R4 : null, loopDir, vr: 16 });
    for (const [key, e] of gr.edgeEls) if (key[0] === 'r') e.setAttribute('class', 'edge root hl');
    for (const [, e] of gr.loopEls) e.setAttribute('class', 'loop hl');
    svg.querySelectorAll('.vtx text').forEach((t) => { t.style.fontSize = '14px'; });
    return svg;
  }

  const gal = q('hx-gallery');
  GALLERY.forEach((it, idx) => {
    const card = DR.h('div', 'hx-card', '', gal);
    DR.h('div', 'ct', it.t, card);
    DR.h('div', 'cs', it.set.map(BR.elemLabel).join('  '), card);
    const two = DR.h('div', 'two', '', card);
    const a = DR.h('div', '', '', two), b = DR.h('div', '', '', two);
    miniGraph(a, it.set, false, `${it.t}: insieme nel grafo con loop`);
    miniGraph(b, it.set, true, `${it.t}: lo stesso insieme nel grafo bordato`);
    DR.h('div', 'sub', 'grafo con loop', a); DR.h('div', 'sub', 'grafo bordato', b);
    const bv = bicVerdict(it.set), gv = graVerdict(it.set);
    const vv = DR.h('div', 'vv', '', card);
    DR.h('div', bv.ok ? 'y' : 'n', `<b>${bv.ok ? '✓' : '✗'} bicircolare</b>${bv.why}`, vv);
    DR.h('div', gv.ok ? 'y' : 'n', `<b>${gv.ok ? '✓' : '✗'} grafico</b>${gv.why}`, vv);
    card.setAttribute('data-k', idx);
  });
})();
