/* ch-fattori.js — Capitolo B: fattori X_U = 1_U 1_Uᵀ, clique ancorate e colonne di B. */
(() => {
  const sec = document.getElementById('fattori');
  if (!sec) return;
  const $ = (id) => sec.querySelector('#' + id);
  const key = (i, j) => (i <= j ? i + ',' + j : j + ',' + i);
  const lab = (U) => BR.toList(U).map((i) => i + 1).join(',');
  const texSet = (U) => '\\{' + lab(U) + '\\}';

  // =================================================================== figura 1: un fattore (n = 4)
  const N = 4;
  let U = 0b1011; // {1,2,4}
  let hover = null, pinned = null;
  const fig1 = $('fa-mat').closest('figure');

  const ub = $('fa-ubtns');
  const ubtns = [];
  for (let i = 0; i < N; i++) {
    const b = DR.h('button', 'btn', String(i + 1), ub); b.type = 'button';
    b.setAttribute('aria-label', 'vertice ' + (i + 1) + ' in U');
    b.addEventListener('click', () => toggleV(i));
    ubtns.push(b);
  }
  function toggleV(i) {
    const nu = U ^ (1 << i);
    if (nu === 0) { $('fa-formula').innerHTML = '<span class="no">$U$ deve essere non vuoto.</span>'; DR.texAll($('fa-formula')); return; }
    U = nu; draw1();
  }

  function drawMat() {
    const s = DR.svg($('fa-mat'), 300, 312, 'Prodotto esterno: vettore indicatore di U per il suo trasposto dà la matrice X_U');
    const x0 = 80, y0 = 80, cs = 52;
    const inU = (i) => BR.has(U, i);
    for (let j = 0; j < N; j++) { // vettore riga 1_Uᵀ
      const g = DR.el('g', { class: 'vec' + (inU(j) ? ' on' : '') }, s);
      DR.el('rect', { x: x0 + j * cs, y: 30, width: cs, height: 34, rx: 6 }, g);
      DR.text(g, x0 + j * cs + cs / 2, 47, inU(j) ? '1' : '0');
      DR.text(s, x0 + j * cs + cs / 2, 16, String(j + 1), 'axis');
    }
    for (let i = 0; i < N; i++) { // vettore colonna 1_U
      const g = DR.el('g', { class: 'vec' + (inU(i) ? ' on' : '') }, s);
      DR.el('rect', { x: 26, y: y0 + i * cs, width: 34, height: cs, rx: 6 }, g);
      DR.text(g, 43, y0 + i * cs + cs / 2, inU(i) ? '1' : '0');
      DR.text(s, 12, y0 + i * cs + cs / 2, String(i + 1), 'axis');
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const on = inU(i) && inU(j);
      const base = i === j ? 'diag' : j > i ? 'off' : 'off lower';
      const g = DR.el('g', { class: `cell ${base} ${on ? 'on' : 'zero'}`, 'data-k': key(i, j) }, s);
      DR.el('rect', { x: x0 + j * cs, y: y0 + i * cs, width: cs, height: cs, rx: 7 }, g);
      DR.text(g, x0 + j * cs + cs / 2, y0 + i * cs + cs / 2, on ? '1' : '0');
    }
  }

  // grafo bordato K5: radice in basso, vertici 1..4 in senso orario
  const GC = [150, 142], GR = 108;
  const ang = (k) => ((90 + 72 * k) * Math.PI) / 180;
  const GP = [1, 2, 3, 4].map((k) => [GC[0] + GR * Math.cos(ang(k)), GC[1] + GR * Math.sin(ang(k))]);
  const RP = [GC[0] + GR * Math.cos(ang(0)), GC[1] + GR * Math.sin(ang(0))];
  function drawGraph() {
    const s = DR.svg($('fa-graph'), 300, 280, 'Grafo bordato con radice r e vertici 1, 2, 3, 4; evidenziata la clique ancorata C = {r} unione U');
    const inU = (i) => BR.has(U, i);
    const pts = [RP].concat(GP.filter((_, i) => inU(i)));
    if (pts.length >= 3) DR.el('polygon', { points: pts.map((p) => p.join(',')).join(' '), class: 'clique' }, s);
    const gE = DR.el('g', {}, s), gV = DR.el('g', {}, s);
    const line = (a, b, cls, k, on) => {
      DR.el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: cls + (on ? ' hl' : ' fade'), 'data-k': k }, gE);
      DR.el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'hit', 'data-k': k }, gE);
    };
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) line(GP[i], GP[j], 'edge', key(i, j), inU(i) && inU(j));
    for (let i = 0; i < N; i++) line(RP, GP[i], 'edge root', key(i, i), inU(i));
    const rv = DR.el('g', { class: 'vtx root' }, gV);
    DR.el('circle', { cx: RP[0], cy: RP[1], r: 22 }, rv); DR.text(rv, RP[0], RP[1], 'r');
    for (let i = 0; i < N; i++) {
      const v = DR.el('g', { class: 'vtx' + (inU(i) ? ' in' : ''), role: 'button', tabindex: 0, 'aria-label': 'vertice ' + (i + 1) }, gV);
      DR.el('circle', { cx: GP[i][0], cy: GP[i][1], r: 20 }, v); DR.text(v, GP[i][0], GP[i][1], String(i + 1));
      v.addEventListener('click', (ev) => { ev.stopPropagation(); toggleV(i); });
      v.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggleV(i); } });
    }
  }

  const COLS = [];
  for (let i = 0; i < N; i++) COLS.push({ i, j: i, e: `(r,${i + 1})`, c: `(${i + 1},${i + 1})` });
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) COLS.push({ i, j, e: `{${i + 1},${j + 1}}`, c: `(${i + 1},${j + 1})` });
  function drawCol() {
    const rh = 24, top = 30;
    const s = DR.svg($('fa-col'), 260, top + COLS.length * rh + 8, 'Colonna della matrice B: vettore di incidenza degli archi della clique');
    DR.text(s, 62, 16, 'arco e', 'colhead'); DR.text(s, 140, 16, 'cella', 'colhead'); DR.text(s, 214, 16, 'χ', 'colhead');
    COLS.forEach((c, k) => {
      const on = BR.has(U, c.i) && BR.has(U, c.j);
      const y = top + k * rh;
      const g = DR.el('g', { class: `colrow ${c.i === c.j ? 'dg' : 'of'}${on ? ' on' : ''}`, 'data-k': key(c.i, c.j) }, s);
      DR.el('rect', { x: 10, y, width: 240, height: rh - 3, rx: 5 }, g);
      DR.el('rect', { x: 190, y, width: 48, height: rh - 3, rx: 5, class: 'v' }, g);
      DR.text(g, 62, y + (rh - 3) / 2, c.e, '', { fill: c.i === c.j ? 'var(--diag)' : 'var(--off)' });
      DR.text(g, 140, y + (rh - 3) / 2, c.c);
      DR.text(g, 214, y + (rh - 3) / 2, on ? '1' : '0', 'vv');
      if (k === N - 1) DR.el('line', { x1: 10, x2: 250, y1: y + rh - 0.5, y2: y + rh - 0.5, stroke: 'var(--line-2)', 'stroke-dasharray': '3 3' }, s);
    });
  }

  function draw1() {
    ubtns.forEach((b, i) => { b.classList.toggle('on', BR.has(U, i)); b.setAttribute('aria-pressed', BR.has(U, i)); });
    drawMat(); drawGraph(); drawCol();
    const k = BR.popcount(U);
    const f = $('fa-formula');
    f.innerHTML = `$U=${texSet(U)}$, $\\ C=\\{r,${lab(U)}\\}$: $\\ |E(C)|=\\tfrac{|U|(|U|+1)}{2}=${(k * (k + 1)) / 2}$ archi, ` +
      `$\\ |C|-1=|U|=\\tr X_U=${k}$.`;
    DR.texAll(f);
    applyHL();
  }
  function applyHL() {
    const k = hover ?? pinned;
    fig1.querySelectorAll('[data-k]').forEach((e) => {
      if (e.classList.contains('hit')) return;
      e.classList.toggle('hl', k !== null && e.getAttribute('data-k') === k);
    });
  }
  fig1.addEventListener('mouseover', (ev) => {
    const t = ev.target.closest && ev.target.closest('[data-k]');
    const k = t ? t.getAttribute('data-k') : null;
    if (k !== hover) { hover = k; applyHL(); }
  });
  fig1.addEventListener('mouseleave', () => { hover = null; applyHL(); });
  fig1.addEventListener('click', (ev) => {
    const t = ev.target.closest && ev.target.closest('[data-k]');
    if (!t) return;
    const k = t.getAttribute('data-k'); pinned = pinned === k ? null : k; hover = null; applyHL();
  });
  draw1();

  // =================================================================== figura 2: H(p) = Σ p_U X_U (n = 3)
  const n = 3, PMAX = 3, PSTEP = 0.5;
  const INIT = [{ U: 0b111, p: 1 }, { U: 0b101, p: 1 }, { U: 0b010, p: 0.5 }];
  const PRESETS = [
    { label: 'Iniziale', slots: INIT, note: '' },
    { label: '① $X_{\\{1,2\\}}+X_{\\{1,3\\}}+X_{\\{2,3\\}}$', slots: [{ U: 0b011, p: 1 }, { U: 0b101, p: 1 }, { U: 0b110, p: 1 }],
      note: 'Decomposizione ①: tre fattori, $\\sum_U|U|p_U=2+2+2=6$. Confrontala con ②: stessa $H$, stesso costo.' },
    { label: '② $X_{\\{1,2,3\\}}+X_{\\{1\\}}+X_{\\{2\\}}+X_{\\{3\\}}$', slots: [{ U: 0b111, p: 1 }, { U: 0b001, p: 1 }, { U: 0b010, p: 1 }, { U: 0b100, p: 1 }],
      note: 'Decomposizione ②: quattro fattori, $\\sum_U|U|p_U=3+1+1+1=6$. Stessa $H$ e stesso costo di ①.' },
  ];
  let slots = INIT.map((s) => ({ ...s }));
  let note = '';
  const sumBox = $('fa-sum');
  let cardEls = [];

  const pr = $('fa-presets');
  PRESETS.forEach((P) => {
    const b = DR.h('button', 'btn', P.label, pr); b.type = 'button';
    b.addEventListener('click', () => { slots = P.slots.map((s) => ({ ...s })); note = P.note; buildCards(); });
  });
  const addBtn = DR.h('button', 'btn', '+ fattore', pr); addBtn.type = 'button';
  addBtn.addEventListener('click', () => { if (slots.length < 4) { slots.push({ U: 0b001, p: 1 }); note = ''; buildCards(); } });
  DR.texAll(pr);

  function miniMatrix(container, M, cls, label) {
    const s = DR.svg(container, 150, 136, label);
    DR.matrix(s, M, { x: 22, y: 20, cell: 38, cls,
      value: (i, j) => BR.fmt(M[i][j]) });
    return s;
  }
  function buildCards() {
    sumBox.innerHTML = ''; cardEls = [];
    slots.forEach((sl, k) => {
      if (k > 0) DR.h('div', 'op', '+', sumBox);
      const c = DR.h('div', 'fcard', '', sumBox);
      if (slots.length > 1) {
        const x = DR.h('button', 'x', '×', c); x.type = 'button'; x.setAttribute('aria-label', 'rimuovi il fattore');
        x.addEventListener('click', () => { slots.splice(k, 1); note = ''; buildCards(); });
      }
      const fig = DR.h('div', '', '', c);
      const cap = DR.h('div', 'cap', '', c);
      const row = DR.h('div', 'row', '', c);
      const bs = [];
      for (let i = 0; i < n; i++) {
        const b = DR.h('button', 'btn', String(i + 1), row); b.type = 'button';
        b.setAttribute('aria-label', 'vertice ' + (i + 1) + ' nel fattore ' + (k + 1));
        b.addEventListener('click', () => {
          const nu = sl.U ^ (1 << i); if (!nu) return;
          sl.U = nu; note = ''; update();
        });
        bs.push(b);
      }
      const pv = DR.h('div', 'pv', '', c);
      const pl = DR.h('span', '', '', pv); const out = DR.h('output', '', '', pv);
      const inp = DR.h('input', '', undefined, c);
      Object.assign(inp, { type: 'range', min: 0, max: PMAX, step: PSTEP, value: sl.p });
      inp.setAttribute('aria-label', 'coefficiente del fattore ' + (k + 1));
      inp.addEventListener('input', () => { sl.p = +inp.value; note = ''; update(); });
      cardEls.push({ fig, cap, bs, pl, out });
    });
    DR.h('div', 'op', '=', sumBox);
    const r = DR.h('div', 'fcard res', '', sumBox);
    const rf = DR.h('div', '', '', r); DR.h('div', 'cap', '$H(p)=\\sum_U p_U X_U$', r);
    cardEls.res = rf;
    addBtn.disabled = slots.length >= 4;
    update();
  }
  function update() {
    slots.forEach((sl, k) => {
      const E = cardEls[k];
      const M = BR.combine(n, [{ U: sl.U, c: sl.p }]);
      miniMatrix(E.fig, M, (i, j) => (BR.has(sl.U, i) && BR.has(sl.U, j) && sl.p > 0 ? '' : 'zero'),
        'Fattore ' + texSet(sl.U) + ' con coefficiente ' + sl.p);
      E.fig.querySelectorAll('.cell.zero rect').forEach((r) => { r.style.fill = '#f6f7fa'; });
      E.fig.querySelectorAll('.cell.zero text').forEach((t) => { t.style.fill = '#b3bac8'; });
      E.cap.innerHTML = `$${BR.fmt(sl.p)}\\cdot X_{${texSet(sl.U)}}$`;
      E.bs.forEach((b, i) => { b.classList.toggle('on', BR.has(sl.U, i)); b.setAttribute('aria-pressed', BR.has(sl.U, i)); });
      E.pl.innerHTML = `$p_{${texSet(sl.U)}}$`; E.out.textContent = BR.fmt(sl.p);
      DR.texAll(E.cap); DR.texAll(E.pl);
    });
    const H = BR.combine(n, slots.map((s) => ({ U: s.U, c: s.p })));
    miniMatrix(cardEls.res, H, null, 'Matrice ricostruita H');
    DR.texAll(sumBox.querySelector('.fcard.res'));
    const cost = slots.reduce((s, t) => s + BR.popcount(t.U) * t.p, 0);
    const tr = H.reduce((s, r, i) => s + r[i], 0);
    const nf = slots.filter((s) => s.p > 0).length;
    const K = $('fa-kpis');
    K.innerHTML = `<div class="kpi"><div class="l">fattori con $p_U>0$</div><div class="v">${nf}</div></div>` +
      `<div class="kpi"><div class="l">$\\sum_U |U|\\,p_U$ (costo della fase B)</div><div class="v">${BR.fmt(cost)}</div></div>` +
      `<div class="kpi"><div class="l">$\\tr H$</div><div class="v">${BR.fmt(tr)}</div></div>`;
    DR.texAll(K);
    const nt = $('fa-note');
    nt.innerHTML = note || 'Il costo $\\sum_U|U|p_U$ e la traccia $\\tr H$ coincidono sempre, qualunque sia la decomposizione.';
    DR.texAll(nt);
  }
  buildCards();
})();
