/* ch-catena.js — Capitolo G: la catena completa e la dimostrazione con i potenziali marginali. */
(() => {
  const sec = document.getElementById('catena');
  if (!sec) return;
  const $ = (id) => sec.querySelector('#' + id);
  const { h } = DR;
  const F = BR.fmt;
  const minus = (s) => String(s).replace(/^-/, '−');

  // ---------------------------------------------------------------- stile locale
  const css = `
  #catena .ct-gamma { display: flex; justify-content: center; margin: 4px 0 6px; }
  #catena .ct-gamma svg.d { max-width: 190px; }
  #catena .ct-chain { container-type: inline-size; margin: 8px 0 4px; }
  #catena .ct-tier { border-radius: 14px; padding: 10px 10px 12px; }
  #catena .ct-tier.top { background: #f4f6fb; border: 1px solid var(--line); max-width: 470px; margin: 0 auto; }
  #catena .ct-tier.bot { background: #f3faf6; border: 1px solid #cfe8d9; }
  #catena .ct-tlabel { font: 700 12px var(--sans); letter-spacing: .1em; text-transform: uppercase; color: var(--ink-3); text-align: center; margin-bottom: 8px; }
  #catena .ct-tier.bot .ct-tlabel { color: var(--eq); }
  #catena .ct-row { display: flex; align-items: stretch; justify-content: center; }
  #catena .ct-b { flex: 1 1 0; min-width: 0; max-width: 170px; display: flex; flex-direction: column; align-items: center; gap: 3px;
    background: #fff; border: 1.5px solid var(--line-2); border-top: 5px solid var(--c, var(--brand-2)); border-radius: 12px;
    padding: 8px 6px 9px; cursor: pointer; font: inherit; color: var(--ink); transition: box-shadow .15s, transform .15s; }
  #catena .ct-b:hover { box-shadow: 0 4px 14px rgba(20,30,60,.12); transform: translateY(-1px); }
  #catena .ct-b.sel { outline: 3px solid var(--brand-2); outline-offset: 2px; }
  #catena .ct-b .tag { font: 700 10.5px var(--sans); letter-spacing: .06em; text-transform: uppercase; color: var(--c, var(--ink-3)); text-align: center; line-height: 1.2; min-height: 2.4em; display: flex; align-items: center; }
  #catena .ct-b .f { font-size: 15px; line-height: 1.2; min-height: 1.6em; display: flex; align-items: center; text-align: center; }
  #catena .ct-b .v { font: 800 30px var(--mono); color: var(--brand); line-height: 1.1; }
  #catena .ct-r { flex: 0 0 46px; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; background: none; border: 0; cursor: pointer; padding: 0; font: inherit; }
  #catena .ct-r::before { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: 3px; margin-top: -1.5px; background: var(--eq); opacity: .55; }
  #catena .ct-r .sym { position: relative; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; background: #e3f3ea; border: 2.5px solid var(--eq); color: var(--eq); font: 800 21px var(--sans); line-height: 1; }
  #catena .ct-r .n { position: absolute; top: calc(50% + 20px); font: 700 11.5px var(--mono); color: var(--eq); }
  #catena .ct-r:hover .sym, #catena .ct-r.sel .sym { background: var(--eq); color: #fff; }
  #catena .ct-band { position: relative; display: flex; align-items: center; justify-content: center; gap: 18px; flex-wrap: wrap; padding: 26px 0; }
  #catena .ct-band::before { content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: 4px; margin-left: -2px; background: var(--geq); opacity: .35; z-index: 0; }
  #catena .ct-geq { position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; background: #fff; border: 2.5px solid var(--geq); border-radius: 999px; padding: 6px 18px 6px 6px; cursor: pointer; font: inherit; box-shadow: 0 2px 10px rgba(180,35,24,.15); }
  #catena .ct-geq .sym { display: grid; place-items: center; width: 58px; height: 58px; border-radius: 50%; background: var(--geq); color: #fff; font: 800 36px var(--sans); }
  #catena .ct-geq .lab { text-align: left; line-height: 1.25; }
  #catena .ct-geq .lab b { color: var(--geq); font-size: 15.5px; } #catena .ct-geq .lab span { font-size: 13.5px; color: var(--ink-2); }
  #catena .ct-geq:hover, #catena .ct-geq.sel { background: #fff3f2; }
  #catena .ct-geq.sel { outline: 3px solid var(--geq); outline-offset: 2px; }
  #catena .ct-ruler { position: relative; z-index: 1; background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 4px 10px; width: 300px; max-width: 100%; }
  #catena .ct-ruler svg.d { overflow: visible; }
  @container (max-width: 660px) {
    #catena .ct-row { flex-direction: column; align-items: center; }
    #catena .ct-b { flex: none; width: 100%; max-width: 330px; flex-direction: row; justify-content: space-between; padding: 8px 14px; gap: 10px; }
    #catena .ct-b .tag { min-height: 0; text-align: left; flex: 1 1 40%; }
    #catena .ct-b .f { min-height: 0; flex: 1 1 40%; justify-content: center; }
    #catena .ct-b .v { font-size: 25px; flex: 0 0 auto; }
    #catena .ct-r { flex: 0 0 44px; width: 100%; }
    #catena .ct-r::before { left: 50%; right: auto; top: 0; bottom: 0; height: auto; width: 3px; margin: 0 0 0 -1.5px; }
    #catena .ct-r .n { top: auto; left: calc(50% + 24px); }
    #catena .ct-r .sym { transform: rotate(90deg); }
      }
  #catena .ct-panel { margin-top: 14px; }
  #catena .ct-panel:empty { display: none; }
  #catena .ct-card { border: 1px solid var(--line); border-radius: 12px; background: #fff; padding: 14px 18px; border-left: 5px solid var(--c, var(--brand-2)); position: relative; }
  #catena .ct-card .hd { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 4px; }
  #catena .ct-card .hd .chip { font: 700 12.5px var(--sans); letter-spacing: .06em; text-transform: uppercase; color: #fff; background: var(--c, var(--brand-2)); border-radius: 999px; padding: 2px 10px; }
  #catena .ct-card .hd h4 { margin: 0; font-size: 18px; font-family: var(--serif); color: var(--brand); }
  #catena .ct-card .x { position: absolute; top: 8px; right: 10px; border: 0; background: none; font-size: 20px; color: var(--ink-3); cursor: pointer; }
  #catena .ct-card .ex { background: var(--soft); border-radius: 9px; padding: 8px 12px; font-size: 15px; margin-top: 10px; }
  #catena .ct-card .viz { display: flex; justify-content: center; margin: 8px 0; }
  #catena .ct-card .viz svg.d { max-width: 300px; }
  #catena .ct-card ol { padding-left: 22px; margin: 6px 0; } #catena .ct-card li { margin: 4px 0; }
  #catena .ct-sw { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; margin-right: 6px; vertical-align: middle; font: 800 14px var(--sans); font-style: normal; }
  #catena .ct-sw.iseq { background: #e3f3ea; border: 2px solid var(--eq); color: var(--eq); }
  #catena .ct-sw.geq { background: var(--geq); color: #fff; width: 26px; height: 26px; font-size: 17px; }
  #catena .ct-sw.gap { border-radius: 3px; width: 26px; height: 12px; vertical-align: 0; background: repeating-linear-gradient(45deg, var(--under-bg) 0 3px, var(--under) 3px 5px); border: 1.5px solid var(--under); }
  #catena .ct-sw.lay { border-radius: 3px; width: 16px; height: 16px; background: linear-gradient(#cfe0f7 50%, #a9c6ee 50%); border: 1px solid var(--brand-2); }
  #catena .ct-sw.cov { border-radius: 3px; width: 16px; height: 16px; border: 3px solid var(--match); }
  #catena .ct-sw.dia { border-radius: 0; width: 22px; height: 0; border-top: 3px dashed var(--diag); vertical-align: 4px; }
  #catena .ct-sw.und { border-radius: 3px; width: 10px; height: 18px; background: var(--under); }
  #catena .d .loop.ghost { stroke: #c9d1df; stroke-width: 2; stroke-dasharray: 4 5; }
  #catena .d .lay { stroke: #fff; stroke-width: 1.5; }
  #catena .d .barbg { fill: #f3f5f9; stroke: var(--line-2); stroke-width: 1; }
  #catena .d .cov { fill: none; stroke: var(--match); stroke-width: 3.5; }
  #catena .d .dthr { stroke: var(--diag); stroke-width: 3; stroke-dasharray: 7 4; }
  #catena .d .gij { stroke: var(--off); stroke-width: 2; stroke-dasharray: 5 4; }
  #catena .d .qseg { fill: var(--under); }
  #catena .d .bad { fill: var(--under); font-weight: 700; }
  #catena .d .lv { font: 600 12.5px var(--mono); fill: var(--brand); }
  #catena .d .lbl { font: 600 13px var(--mono); paint-order: stroke; stroke: #fff; stroke-width: 4px; }
  #catena .ct-alpha { justify-content: center; }
  #catena #ct-bars svg.d { max-width: 470px; margin: 0 auto; }
  #catena .ct-card .hd { padding-right: 26px; }
  @media (max-width: 560px) { #catena .ct-card .eq { font-size: .86em; padding: 10px 8px; } #catena .ct-card { padding: 12px 12px; } }
  
  #catena .ct-sw { line-height: 1; padding-bottom: 1px; }
  #catena .ct-alpha .grp { display: inline-flex; align-items: center; gap: 4px; background: #fff; border: 1px solid var(--line); border-radius: 9px; padding: 3px 6px; }
  #catena .ct-alpha .grp .btn { padding: 2px 9px; }
  #catena .ct-cost { text-align: center; font-size: 15.5px; margin-top: 6px; }
  #catena .ct-tu { overflow-x: auto; }
  #catena table.ct-tut td, #catena table.ct-tut th { text-align: center; padding: 4px 7px; font-family: var(--mono); font-size: 14px; }
  #catena table.ct-tut td.b1 { background: var(--diag-bg); color: var(--diag); font-weight: 800; }
  #catena table.ct-tut td.q1 { background: var(--off-bg); color: var(--off); font-weight: 800; }
  #catena table.ct-tut tr.m td { box-shadow: inset 0 2px 0 var(--match), inset 0 -2px 0 var(--match); }
  #catena table.ct-tut tr.m td.y { color: var(--match); font-weight: 800; }
  #catena table.ct-tut th.sep, #catena table.ct-tut td.sep { border-left: 2px solid var(--line-2); }
  #catena .d .cell.yp rect { fill: var(--match-bg); stroke: var(--match); stroke-width: 2.5; }
  #catena .d .cell.yn rect { fill: var(--diag-bg); stroke: var(--diag); stroke-width: 2.5; }
  #catena .d .cell.yz rect { fill: #fff; stroke: #e2e6ef; } #catena .d .cell.yz text { fill: #a0a8b8; }
  `;
  const st = document.createElement('style'); st.textContent = css; sec.appendChild(st);

  // ---------------------------------------------------------------- esempi
  const randG = () => { // interi 0..4; si scartano i casi banali con M = 0
    const n = 4; let G;
    for (let t = 0; t < 60; t++) {
      G = BR.zeros(n);
      for (let i = 0; i < n; i++) for (let j = i; j < n; j++) G[i][j] = G[j][i] = Math.floor(Math.random() * 5);
      if (BR.maxGainMatching(G).value > 0) break;
    }
    return G;
  };
  const EX = {
    '2': { label: '2×2', G: [[1, 3], [3, 2]] },
    '3': { label: '3×3', G: [[0, 1, 2], [1, 1, 0], [2, 0, 1]] },
    'tri': { label: 'triangolo', G: [[0, 1, 1], [1, 0, 1], [1, 1, 0]] },
    'rnd': { label: '4×4 casuale', G: randG() },
  };
  const S = { key: '3', sel: null, alpha: null, pair: [0, 1] };
  let D = null;

  // ---------------------------------------------------------------- fase A di AWCD sul grafo bordato (LP indipendente)
  function phaseA(G) {
    const n = G.length; const Cs = BR.allSubsets(n); // clique C = {r} ∪ U
    const E = []; // archi del grafo bordato: radice (r,i) e ordinari {i,j}
    for (let i = 0; i < n; i++) E.push({ root: true, i, j: i, w: G[i][i] });
    for (const [i, j] of BR.offPairs(n)) E.push({ root: false, i, j, w: G[i][j] });
    const m = E.length, nv = Cs.length + 2 * m;
    const c = new Array(nv).fill(0); for (let k = Cs.length; k < nv; k++) c[k] = 1;
    const rows = E.map((e, r) => {
      const a = new Array(nv).fill(0);
      Cs.forEach((U, k) => { if (BR.has(U, e.i) && BR.has(U, e.j)) a[k] = 1; }); // e ∈ E(C)
      a[Cs.length + r] = 1; a[Cs.length + m + r] = -1;
      return { a, op: '=', b: e.w };
    });
    const res = BR.simplex(c, rows);
    return { value: res.value, x: Cs.map((U, k) => ({ U, c: res.x[k] })).filter((t) => t.c > 1e-9) };
  }

  function compute(G) {
    const c = BR.chain(G); const n = G.length;
    const A = phaseA(G);
    const yM = BR.matchingCertificate(G, c.matching.pairs); const bd = BR.checkDual(G, yM);
    return { G, n, c, A, yM, bd, alpha: BR.marginals(n, c.peeling.p),
      v: { efull: c.efull.value, awcd: A.value, lb: c.LB, valR: c.valR - c.gamma, pf: c.pseudoforest - c.gamma, M: c.M, bound: bd.value } };
  }

  // ---------------------------------------------------------------- definizione della catena
  const BLOCKS = {
    efull: { tag: 'Errore $L^1$', f: '$\\Efull(\\Gamma)$', c: '#1f3a68' },
    awcd: { tag: 'AWCD · fase A', f: '$z^*_{\\mathrm{AWCD}}$', c: '#6b3fa0' },
    lb: { tag: 'Lower bound', f: '$\\LB$', c: '#1f6f43' },
    valR: { tag: 'Rilassamento $R$', f: '$\\val(R)-\\gamma$', c: '#5b6576' },
    pf: { tag: 'Matroide bicircolare', f: '$w(F^*)-\\gamma$', c: '#c47a12' },
    M: { tag: 'Matching', f: '$M$', c: '#d4570f' },
    bound: { tag: 'AWCD · duale', f: '$y^{F,\\varphi}$ migliore', c: '#6b3fa0' },
  };
  const RELS = {
    1: { a: 'efull', b: 'awcd', eq: true, t: 'Teorema di equivalenza' },
    2: { a: 'awcd', b: 'lb', eq: false, t: 'Rilassamento' },
    3: { a: 'lb', b: 'valR', eq: true, t: 'Definizione' },
    4: { a: 'valR', b: 'pf', eq: true, t: 'Dualità LP e matroide' },
    5: { a: 'pf', b: 'M', eq: true, t: 'Rappresentazione trasversale' },
    6: { a: 'M', b: 'bound', eq: true, t: 'Stessa formula' },
  };

  const blockEl = {}, relEl = {};
  function buildChain() {
    const root = $('ct-chain'); root.innerHTML = '';
    const wrap = h('div', 'ct-chain', '', root);
    const mkB = (k, parent) => {
      const b = BLOCKS[k];
      const el = h('button', 'ct-b', `<span class="tag"><span>${b.tag}</span></span><span class="f">${b.f}</span><span class="v">–</span>`, parent);
      el.type = 'button'; el.style.setProperty('--c', b.c); el.dataset.k = k;
      el.addEventListener('click', () => select('b:' + k));
      blockEl[k] = el;
    };
    const mkR = (n, parent) => {
      const el = h('button', 'ct-r iseq', `<span class="sym">=</span><span class="n">(${n})</span>`, parent);
      el.type = 'button'; el.title = `(${n}) ${RELS[n].t}`; el.setAttribute('aria-label', `relazione ${n}: ${RELS[n].t}`);
      el.addEventListener('click', () => select('r:' + n));
      relEl[n] = el;
    };
    const top = h('div', 'ct-tier top', '<div class="ct-tlabel">il valore esatto</div>', wrap);
    const r1 = h('div', 'ct-row', '', top); mkB('efull', r1); mkR(1, r1); mkB('awcd', r1);
    const band = h('div', 'ct-band', '', wrap);
    const g = h('button', 'ct-geq', `<span class="sym">≥</span><span class="lab"><b>(2) Rilassamento</b><br><span>l'unica disuguaglianza</span></span>`, band);
    g.type = 'button'; g.setAttribute('aria-label', 'relazione 2: rilassamento, disuguaglianza');
    g.addEventListener('click', () => select('r:2')); relEl[2] = g;
    h('div', 'ct-ruler', '<div id="ct-ruler"></div>', band);
    const bot = h('div', 'ct-tier bot', '<div class="ct-tlabel">il lower bound: un solo numero, quattro letture</div>', wrap);
    const r2 = h('div', 'ct-row', '', bot);
    mkB('lb', r2); mkR(3, r2); mkB('valR', r2); mkR(4, r2); mkB('pf', r2); mkR(5, r2); mkB('M', r2); mkR(6, r2); mkB('bound', r2);
    DR.texAll(root);
  }

  function updateChain() {
    for (const k of Object.keys(BLOCKS)) blockEl[k].querySelector('.v').textContent = F(D.v[k]);
    // righello del gap
    const box = $('ct-ruler'); const E = D.v.efull, L = D.v.lb; const gap = E - L;
    const max = Math.max(E, 1); const x0 = 14, x1 = 286, sx = (v) => x0 + (x1 - x0) * v / max;
    const svg = DR.svg(box, 300, 64, `Righello: LB = ${F(L)}, Efull = ${F(E)}, gap = ${F(gap)}`);
    const defs = svg.querySelector('defs');
    const pat = DR.el('pattern', { id: 'ct-gaphatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    DR.el('rect', { width: 6, height: 6, fill: '#fbe3e7' }, pat); DR.el('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: '#c7354a', 'stroke-width': 2.4 }, pat);
    DR.el('line', { x1: x0, y1: 30, x2: x1, y2: 30, stroke: '#cfd6e4', 'stroke-width': 2 }, svg);
    for (let t = 0; t <= max; t++) { DR.el('line', { x1: sx(t), y1: 26, x2: sx(t), y2: 34, stroke: '#a0a8b8', 'stroke-width': 1.5 }, svg); DR.text(svg, sx(t), 48, String(t), 'axis'); }
    DR.el('rect', { x: x0, y: 22, width: Math.max(0, sx(L) - x0), height: 16, rx: 3, fill: '#1f6f43', opacity: 0.85 }, svg);
    if (gap > 1e-9) {
      DR.el('rect', { x: sx(L), y: 22, width: sx(E) - sx(L), height: 16, rx: 3, fill: 'url(#ct-gaphatch)', stroke: '#c7354a', 'stroke-width': 1.5 }, svg);
      DR.text(svg, (sx(L) + sx(E)) / 2, 11, `gap = ${F(gap)}`, 'lbl', { fill: '#c7354a', 'text-anchor': 'middle', 'font-weight': 800 });
      DR.text(svg, Math.max(sx(L) / 2 + x0 / 2, 30), 11, `LB = ${F(L)}`, 'lbl', { fill: '#1f6f43', 'text-anchor': 'middle' });
    } else {
      DR.text(svg, (x0 + x1) / 2, 11, `gap = 0: LB = Efull = ${F(E)}, bound esatto`, 'lbl', { fill: '#1f6f43', 'text-anchor': 'middle', 'font-weight': 800 });
    }
    // Γ corrente
    const gb = $('ct-gamma'); const n = D.n; const cs = 34;
    const gs = DR.svg(gb, 28 + n * cs + 40, 22 + n * cs + 6, 'Matrice Γ dell\'esempio corrente');
    DR.text(gs, 12, 22 + (n * cs) / 2, 'Γ =', 'note', { 'text-anchor': 'middle', 'font-weight': 700 });
    DR.matrix(gs, D.G, { x: 34, y: 18, cell: cs, labels: false });
  }

  // ---------------------------------------------------------------- pannelli
  const pl = (U) => BR.setLabel(U).replace(/[{}]/g, (c) => '\\' + c);
  const yMat = (svg, y, x, yy, cs) => DR.matrix(svg, y, { x, y: yy, cell: cs, upperOnly: true,
    value: (i, j) => (j < i ? '' : Math.abs(y[i][j]) < 1e-9 ? '0' : (y[i][j] > 0 ? '+' : '−') + F(Math.abs(y[i][j]))),
    cls: (i, j) => (y[i][j] > 1e-9 ? 'yp' : y[i][j] < -1e-9 ? 'yn' : 'yz') });

  function blockPanel(k) {
    const G = D.G, n = D.n, c = D.c, v = D.v; let body = '', viz = null;
    if (k === 'efull') {
      const H = c.efull.H; const er = BR.errors(G, H);
      body = `<p>Il minimo, su tutte le $p\\ge0$, di $\\sum_{i\\le j}|\\Gamma_{ij}-H_{ij}(p)|$: l'errore $L^1$ sul
        triangolo superiore, diagonale inclusa. Calcolato con un LP esatto (<code>BR.efull</code>).</p>
        <div class="ex">Ottimo: ${c.efull.terms.map((t) => `$p_{${pl(t.U)}}=${F(t.c)}$`).join(', ') || 'nessun fattore'}, che dà la matrice $H$ qui sotto; errore $=${F(er.full)}$.</div>`;
      viz = (box) => {
        const cs = 44; const svg = DR.svg(box, 40 + n * cs + 20, 40 + n * cs + 10, 'Matrice H ottima con errori colorati');
        DR.matrix(svg, H, { x: 40, y: 34, cell: cs, upperOnly: true, value: (i, j) => (j < i ? '' : F(H[i][j])),
          cls: (i, j) => { const e = er.cells.find((x) => x.i === Math.min(i, j) && x.j === Math.max(i, j)); return e.kind; } });
      };
      body += `<div class="viz" data-viz></div><div class="legend" style="justify-content:center"><span><i class="sw exact"></i>esatto</span><span><i class="sw under"></i>sottostima</span><span><i class="sw over"></i>sovrastima</span></div>`;
    } else if (k === 'awcd') {
      body = `<p>Il valore $z^*$ della fase A: la distanza $L^1$ fra il vettore dei pesi $w$ del grafo bordato e il cono
        generato dalle clique ancorate $C=\\{r\\}\\cup U$. Qui è calcolato con un LP separato, scritto sugli archi del
        grafo bordato (<code>BR.simplex</code>).</p>
        <div class="ex">Clique usate: ${D.A.x.map((t) => `$x_{\\{r\\}\\cup${pl(t.U)}}=${F(t.c)}$`).join(', ') || 'nessuna'}; $z^*=${F(v.awcd)}$.</div>`;
    } else if (k === 'lb') {
      body = `<p>Il lower bound delle pseudoforeste: il valore del rilassamento $R$ meno la traccia $\\gamma$.</p>
        <div class="ex">$\\LB=\\val(R)-\\gamma=${F(c.valR)}-${F(c.gamma)}=${F(v.lb)}$.</div>`;
    } else if (k === 'valR') {
      const qs = Object.entries(c.peeling.q);
      body = `<p>$R$ minimizza $\\sum_U|U|\\,p_U+\\sum_{i\\lt j}q_{ij}$ con la diagonale coperta
        ($\\sum_{U\\ni i}p_U\\ge\\Gamma_{ii}$) e la sottostima fuori diagonale $q_{ij}$ pagata; la sovrastima fuori
        diagonale è gratuita. Ottimo ricostruito dal peeling (<code>BR.peeling</code>).</p>
        <div class="ex">${c.peeling.p.map((t) => `$p_{${pl(t.U)}}=${F(t.c)}$`).join(', ')}${qs.length ? '; ' + qs.map(([e, x]) => `$q_{${e.slice(1)}}=${F(x)}$`).join(', ') : '; $q=0$'}.<br>
        $\\val(R)=${c.peeling.p.map((t) => `${BR.popcount(t.U)}\\cdot${F(t.c)}`).join('+')}${qs.length ? '+' + qs.map(([, x]) => F(x)).join('+') : ''}=${F(c.valR)}$, quindi $\\val(R)-\\gamma=${F(v.valR)}$.</div>`;
    } else if (k === 'pf') {
      const Fs = c.greedy.F;
      body = `<p>$F^*$ è la pseudoforesta di peso massimo nel grafo con un loop $\\ell_i$ (peso $\\Gamma_{ii}$) per vertice:
        ogni componente ha al più un ciclo, e un loop è un ciclo. La trova il greedy (<code>BR.greedyPseudoforest</code>).</p>
        <div class="ex">$F^*=\\{${Fs.map((e) => (e.type === 'loop' ? `\\ell_${e.i + 1}` : `\\{${e.i + 1},${e.j + 1}\\}`)).join(',\\ ')}\\}$,
        $w(F^*)=${Fs.map((e) => F(e.w)).join('+')}=${F(c.pseudoforest)}$; meno $\\gamma=${F(c.gamma)}$ fa $${F(v.pf)}$.</div>`;
      viz = (box) => {
        const svg = DR.svg(box, 300, n === 2 ? 170 : 270, 'Pseudoforesta massima F*');
        const L = n === 2 ? DR.layout(2, { cx: 150, cy: 95, r: 80 }) : DR.layout(n, { cx: 150, cy: 145, r: 82, start: n === 4 ? -Math.PI * 3 / 4 : -Math.PI / 2 });
        const ids = new Set(Fs.map((e) => e.id));
        const edges = BR.offPairs(n).map(([i, j]) => ({ i, j, cls: ids.has('e' + (i + 1) + (j + 1)) ? 'sel' : 'ghost', label: F(G[i][j]), labelCls: ids.has('e' + (i + 1) + (j + 1)) ? 'off' : 'muted' }));
        const loops = [...Array(n).keys()].map((i) => ({ i, cls: ids.has('l' + (i + 1)) ? 'sel' : 'ghost', label: F(G[i][i]), labelCls: ids.has('l' + (i + 1)) ? 'diag' : 'muted' }));
        DR.graph(svg, n, { pos: L.pos, edges, loops });
      };
      body += `<div class="viz" data-viz></div><div class="legend" style="justify-content:center"><span><i class="sw exact"></i>in $F^*$</span><span><i class="sw free"></i>scartato</span></div>`;
    } else if (k === 'M') {
      const P = c.matching.pairs;
      body = `<p>$M$ è il massimo matching nel grafo bipartito archi $\\{i,j\\}$ ↔ vertici $v\\in\\{i,j\\}$, con pesi
        $(\\Gamma_{ij}-\\Gamma_{vv})^+$ e capacità 1 su archi e vertici (<code>BR.maxGainMatching</code>).</p>
        <div class="ex">${P.length ? P.map((p) => `$\\{${p.i + 1},${p.j + 1}\\}\\to${p.v + 1}$: guadagno $${F(G[p.i][p.j])}-${F(G[p.v][p.v])}=${F(p.gain)}$`).join('<br>') : 'nessuna coppia con guadagno positivo'}<br>$M=${F(v.M)}$.</div>`;
    } else if (k === 'bound') {
      body = `<p>Il miglior certificato duale di AWCD della famiglia del capitolo F: $+1$ su ogni arco scelto, $-1$ sull'arco
        radice del vertice a cui è associato. Ammissibilità verificata su tutti i $${(1 << n) - 1}$ vincoli di clique
        (<code>BR.checkDual</code>): <span class="${D.bd.ok ? 'ok' : 'no'}">${D.bd.ok ? 'ammissibile' : 'non ammissibile'}</span>.</p>
        <div class="ex">$w^\\top y=\\sum_{i\\le j}\\Gamma_{ij}y_{ij}=${F(v.bound)}$.</div><div class="viz" data-viz></div>`;
      viz = (box) => { const cs = 44; const svg = DR.svg(box, 40 + n * cs + 20, 40 + n * cs + 6, 'Certificato y del matching'); yMat(svg, D.yM, 40, 34, cs); };
    }
    return { chip: 'Blocco', title: BLOCKS[k].tag.replace(/\$[^$]*\$/g, (m) => m), c: BLOCKS[k].c, body, viz };
  }

  function relPanel(r) {
    const c = D.c, v = D.v; let body = '';
    if (r === 1) body = `<p>Nel grafo bordato la clique $C=\\{r\\}\\cup U$ contiene l'arco radice $(r,i)$ se e solo se $i\\in U$,
      e l'arco $\\{i,j\\}$ se e solo se $i,j\\in U$. Con il cambio di variabili $x_C=p_U$:</p>
      <div class="eq">$$\\begin{aligned}(Bx)_{ri}&=\\sum_{C\\ni r,i}x_C=\\sum_{U\\ni i}p_U=H_{ii},\\\\ (Bx)_{ij}&=\\sum_{C\\ni i,j}x_C=\\sum_{U\\supseteq\\{i,j\\}}p_U=H_{ij}.\\end{aligned}$$</div>
      <p>Con $w_{ri}=\\Gamma_{ii}$ e $w_{ij}=\\Gamma_{ij}$, il residuo $q^+-q^-=w-Bx$ è $\\Gamma-H$ cella per cella. All'ottimo
      $q^+$ e $q^-$ non sono mai entrambi positivi sulla stessa cella, quindi $e^\\top q^++e^\\top q^-=\\sum_{i\\le j}|\\Gamma_{ij}-H_{ij}|$.
      I due problemi sono lo stesso LP: $\\Efull(\\Gamma)=z^*$.</p>
      <div class="ex">Due LP risolti separatamente: $\\Efull=${F(v.efull)}$ e $z^*=${F(v.awcd)}$.</div>`;
    else if (r === 2) body = `<p>Tre passi; solo il terzo può perdere qualcosa.</p>
      <ol><li><b>Diagonale coperta senza perdita.</b> Se $H_{ii}<\\Gamma_{ii}$, aumentare $p_{\\{i\\}}$ di $\\Gamma_{ii}-H_{ii}$
      cambia solo la cella $(i,i)$ e abbassa l'errore. Quindi si può imporre $s^+_{ii}=0$, cioè $\\sum_{U\\ni i}p_U\\ge\\Gamma_{ii}$.</li>
      <li><b>Costo della diagonale.</b> Allora l'errore diagonale è $\\sum_i(H_{ii}-\\Gamma_{ii})=\\sum_U|U|\\,p_U-\\gamma$.</li>
      <li><b>Sovrastima fuori diagonale gratuita.</b> Fuori diagonale $|\\Gamma_{ij}-H_{ij}|\\ge(\\Gamma_{ij}-H_{ij})^+=\\min\\{q_{ij}\\ge0:\\ H_{ij}+q_{ij}\\ge\\Gamma_{ij}\\}$:
      si azzera il costo di $s^-_{ij}$.</li></ol>
      <div class="eq">$$\\Efull(\\Gamma)\\ \\ge\\ \\min\\Bigl\\{\\sum_U|U|\\,p_U+\\sum_{i\\lt j}q_{ij}\\Bigr\\}-\\gamma=\\val(R)-\\gamma .$$</div>
      <p>Per ogni $p$ con diagonale coperta, errore $=$ costo in $R-\\gamma\\,+$ sovrastima fuori diagonale di $p$. Quindi il gap è nullo se e solo se qualche ottimo di $R$ non sovrastima nessuna coppia.</p>
      <div class="ex">${v.efull - v.lb > 1e-9 ? `Qui $\\Efull=${F(v.efull)}$ e $\\LB=${F(v.lb)}$: gap $${F(v.efull - v.lb)}$. L'ottimo di $R$ copre le coppie più del dovuto, gratis; nel problema vero quella sovrastima costa.` : `Qui $\\Efull=\\LB=${F(v.efull)}$: il rilassamento non perde nulla, il bound è esatto.`}</div>`;
    else if (r === 3) body = `<p>È la definizione: $\\LB:=\\val(R)-\\gamma$.</p>
      <p>Sottrarre $\\gamma$ è essenziale. In $R$ la diagonale deve essere coperta, quindi $\\sum_U|U|\\,p_U\\ge\\gamma$ sempre:
      quella parte di $\\val(R)$ non è errore. Da solo, $\\val(R)$ non è un bound sull'errore.</p>
      <div class="ex">$\\val(R)=${F(c.valR)}$, $\\gamma=${F(c.gamma)}$, $\\LB=${F(v.lb)}$.</div>`;
    else if (r === 4) body = `<ol><li><b>Dualità LP.</b> Il duale di $R$ ha una variabile $x_{\\ell_i}$ per ogni vincolo diagonale e $x_{ij}$ per ogni
      vincolo di coppia. La colonna di $p_U$ dà $x(E[U])\\le|U|$, dove $E[U]$ sono i loop e gli archi con estremi in $U$;
      la colonna di $q_{ij}$ dà $x_{ij}\\le1$. È il problema $(P)$, e $\\val(R)=\\val(P)$.</li>
      <li><b>Integralità.</b> I vincoli di $(P)$ descrivono il politopo degli insiemi indipendenti del matroide bicircolare
      (le pseudoforeste). I suoi vertici sono interi, quindi $\\val(P)=\\max_F w(F)$ sulle pseudoforeste.</li>
      <li><b>Greedy di Edmonds.</b> Su un matroide il greedy (elementi in ordine di peso, si tiene ciò che resta indipendente)
      trova l'insieme indipendente di peso massimo: $\\val(P)=w(F^*)$.</li></ol>
      <div class="ex">Peeling: $\\val(R)=${F(c.valR)}$. Greedy: $w(F^*)=${F(c.pseudoforest)}$. Sottraendo $\\gamma=${F(c.gamma)}$: $${F(v.valR)}=${F(v.pf)}$.</div>`;
    else if (r === 5) body = `<p><b>Fatto chiave.</b> $F$ è una pseudoforesta se e solo se ogni suo elemento si assegna
      a un proprio estremo (un loop al suo vertice) con vertici tutti distinti.</p>
      <ol><li><b>$\\ge$.</b> Partiamo da tutti i loop, peso $\\gamma$. Per ogni coppia $\\{i,j\\}\\to v$ del matching
      sostituiamo il loop $\\ell_v$ con l'arco: il peso cresce di $\\Gamma_{ij}-\\Gamma_{vv}$ e l'assegnazione resta iniettiva.
      Si ottiene una pseudoforesta di peso $\\gamma+M$.</li>
      <li><b>$\\le$.</b> Assegniamo $F^*$ ai vertici. Un vertice che riceve un loop contribuisce $\\Gamma_{vv}$; uno che riceve
      un arco contribuisce $\\Gamma_{vv}+(\\Gamma_{ij}-\\Gamma_{vv})\\le\\Gamma_{vv}+(\\Gamma_{ij}-\\Gamma_{vv})^+$; uno libero
      contribuisce $0\\le\\Gamma_{vv}$. Le coppie arco→vertice formano un matching: $w(F^*)\\le\\gamma+M$.</li></ol>
      <div class="ex">$w(F^*)-\\gamma=${F(c.pseudoforest)}-${F(c.gamma)}=${F(v.pf)}$ e $M=${F(v.M)}$.</div>`;
    else if (r === 6) body = `<p>Il matching bound di AWCD (Prop. sui lower bound della distanza $L^1$, parte (b)) prende $F$ archi
      ordinari e $\\varphi:F\\to V$ iniettiva con $\\varphi(e)\\in e$, e usa $y=\\sum_{e\\in F}(\\chi^{\\{e\\}}-\\chi^{\\{r\\varphi(e)\\}})$,
      dove $\\chi^{\\{e\\}}$ vale 1 sull'arco $e$ e 0 altrove. Il suo valore è</p>
      <div class="eq">$$w^\\top y=\\sum_{e=\\{i,j\\}\\in F}\\bigl(\\Gamma_{ij}-\\Gamma_{\\varphi(e)\\varphi(e)}\\bigr).$$</div>
      <p>Massimizzare su $(F,\\varphi)$ è esattamente il matching bipartito di $M$: stessi nodi, stessi pesi, stesse capacità.</p>
      <div class="ex">Certificato costruito dal matching ottimo: $w^\\top y=${F(v.bound)}$, ammissibile per $(D_A)$ (${D.bd.rows.length} vincoli di clique verificati).</div>`;
    const R = RELS[r];
    return { chip: `Relazione (${r}) · ${R.eq ? 'uguaglianza' : 'disuguaglianza'}`, title: R.t, c: R.eq ? '#1f6f43' : '#b42318', body };
  }

  function select(id) {
    S.sel = S.sel === id ? null : id;
    renderPanel();
  }
  function renderPanel() {
    Object.values(blockEl).forEach((e) => e.classList.remove('sel'));
    Object.values(relEl).forEach((e) => e.classList.remove('sel'));
    const box = $('ct-panel'); box.innerHTML = '';
    if (!S.sel) return;
    const [t, k] = S.sel.split(':');
    const P = t === 'b' ? blockPanel(k) : relPanel(+k);
    (t === 'b' ? blockEl[k] : relEl[k]).classList.add('sel');
    const card = h('div', 'ct-card', '', box); card.style.setProperty('--c', P.c);
    const hd = h('div', 'hd', `<span class="chip">${P.chip}</span><h4>${P.title}</h4>`, card);
    const x = h('button', 'x', '×', card); x.type = 'button'; x.setAttribute('aria-label', 'chiudi'); x.addEventListener('click', () => select(S.sel));
    h('div', '', P.body, card);
    if (P.viz) { const v = card.querySelector('[data-viz]'); if (v) P.viz(v); }
    DR.texAll(card);
    void hd;
  }

  // ================================================================ potenziali marginali
  function drawBars() {
    const G = D.G, n = D.n, a = S.alpha; const [pi, pj] = S.pair;
    const maxV = Math.max(1, ...a, ...G.flat()) + 0.5;
    const bw = 60, gapx = n === 2 ? 120 : 88, xL = 46;
    const W = xL + (n - 1) * gapx + bw + 16, H = 268, y0 = 222, top = 22, sy = (v) => y0 - (y0 - top) * v / maxV;
    const bx = (v) => xL + v * gapx;
    const svg = DR.svg($('ct-bars'), W, H, `Barre delle marginali α: ${a.map((x, i) => `α${i + 1}=${F(x)}`).join(', ')}`);
    // asse
    for (let t = 0; t <= Math.floor(maxV); t++) {
      DR.el('line', { x1: xL - 18, y1: sy(t), x2: bx(n - 1) + bw + 8, y2: sy(t), stroke: '#eef1f6', 'stroke-width': 1 }, svg);
      DR.text(svg, xL - 28, sy(t), String(t), 'axis');
    }
    const chain = BR.chainFromAlpha(a);
    const palette = ['#dbe7f8', '#bcd2f1', '#9dbdea', '#7fa8e2', '#6393d6'];
    let prev = 0;
    chain.forEach((s, t) => {
      for (const v of BR.toList(s.U)) DR.el('rect', { x: bx(v), y: sy(s.level), width: bw, height: sy(prev) - sy(s.level), fill: palette[t % palette.length], class: 'lay' }, svg);
      // etichetta S_t dentro lo strato (barra più a sinistra dell'insieme), se c'è spazio
      if (sy(prev) - sy(s.level) >= 16) DR.text(svg, bx(BR.toList(s.U)[0]) + 6, (sy(prev) + sy(s.level)) / 2, `S${t + 1}`, 'lv', { 'dominant-baseline': 'central' });
      prev = s.level;
    });
    // soglie diagonali e valori
    for (let v = 0; v < n; v++) {
      DR.el('line', { x1: bx(v) - 5, y1: sy(G[v][v]), x2: bx(v) + bw + 5, y2: sy(G[v][v]), class: 'dthr' }, svg);
      DR.text(svg, bx(v) + bw / 2, y0 + 20, `α${v + 1} = ${F(a[v])}`, 'note', { 'text-anchor': 'middle', 'font-weight': 700 });
      if (a[v] < G[v][v] - 1e-9) DR.text(svg, bx(v) + bw / 2, y0 + 38, `< Γ${v + 1}${v + 1}`, 'note bad', { 'text-anchor': 'middle' });
    }
    // coppia scelta
    const m = Math.min(a[pi], a[pj]); const gij = G[pi][pj];
    for (const v of [pi, pj]) DR.el('rect', { x: bx(v) + 1.5, y: sy(m), width: bw - 3, height: sy(0) - sy(m), class: 'cov', rx: 3 }, svg);
    DR.el('line', { x1: bx(pi) - 6, y1: sy(gij), x2: bx(pj) + bw + 6, y2: sy(gij), class: 'gij' }, svg);
    DR.text(svg, bx(pi) - 6, sy(gij) - 11, `Γ${pi + 1}${pj + 1} = ${F(gij)}`, 'lbl', { fill: '#2563b8', 'text-anchor': 'start' });
    if (gij > m + 1e-9) {
      const low = a[pi] <= a[pj] ? pi : pj;
      DR.el('rect', { x: bx(low) + bw / 2 - 5, y: sy(gij), width: 10, height: sy(m) - sy(gij), class: 'qseg' }, svg);
    }
    // testo riassuntivo sotto
    const q = (i, j) => Math.max(0, G[i][j] - Math.min(a[i], a[j]));
    const feas = a.every((x, i) => x >= G[i][i] - 1e-9);
    const sumA = a.reduce((s, x) => s + x, 0); let sumQ = 0; for (const [i, j] of BR.offPairs(n)) sumQ += q(i, j);
    const Hc = BR.combine(n, chain); // verifica: la catena copre min(α_i, α_j)
    const ok = BR.offPairs(n).every(([i, j]) => Math.abs(Hc[i][j] - Math.min(a[i], a[j])) < 1e-9);
    const cost = $('ct-cost');
    const chainTxt = chain.map((s2, t) => `$S_${t + 1}=${BR.setLabel(s2.U).replace(/[{}]/g, (c2) => '\\' + c2)}$ (peso ${F(s2.c)})`).join(', ');
    cost.innerHTML = `<p class="small muted">Catena: ${chainTxt || 'vuota'}.</p><p>Coppia $\\{${pi + 1},${pj + 1}\\}$: copertura $\\min(\\alpha_${pi + 1},\\alpha_${pj + 1})=${F(m)}$${gij > m + 1e-9 ? `, sottostima $q_{${pi + 1}${pj + 1}}=${F(gij - m)}$` : `$\\ge\\Gamma_{${pi + 1}${pj + 1}}$, $q_{${pi + 1}${pj + 1}}=0$`}.</p>` +
      (feas ? `<p>Costo $=${F(sumA)}+${F(sumQ)}-${F(D.c.gamma)}=\\mathbf{${F(sumA + sumQ - D.c.gamma)}}$ &nbsp;·&nbsp; ottimo $\\LB=${F(D.v.lb)}$${Math.abs(sumA + sumQ - D.c.gamma - D.v.lb) < 1e-9 ? ' <span class="ok">✓ ottimo</span>' : ''}</p>`
        : `<p class="no">Inammissibile: serve $\\alpha_i\\ge\\Gamma_{ii}$ per ogni $i$.</p>`) +
      (ok ? '' : '<p class="no">errore interno nella catena</p>');
    DR.texAll(cost);
  }
  function buildAlphaControls() {
    const box = $('ct-alpha'); box.innerHTML = ''; box.classList.add('ct-alpha');
    for (let v = 0; v < D.n; v++) {
      const g = h('span', 'grp', '', box);
      const m = h('button', 'btn', '−', g); m.type = 'button'; m.setAttribute('aria-label', `diminuisci alpha ${v + 1}`);
      h('span', 'small', `$\\alpha_${v + 1}$`, g);
      const p = h('button', 'btn', '+', g); p.type = 'button'; p.setAttribute('aria-label', `aumenta alpha ${v + 1}`);
      m.addEventListener('click', () => { S.alpha[v] = Math.max(0, S.alpha[v] - 1); drawBars(); });
      p.addEventListener('click', () => { S.alpha[v] = Math.min(8, S.alpha[v] + 1); drawBars(); });
    }
    const r = h('button', 'btn primary', 'Ottimo di $R$', box); r.type = 'button';
    r.addEventListener('click', () => { S.alpha = D.alpha.slice(); drawBars(); });
    DR.texAll(box);
    const pairs = BR.offPairs(D.n);
    if (!pairs.some(([i, j]) => i === S.pair[0] && j === S.pair[1])) S.pair = pairs[0];
    // coppia predefinita: la più "interessante" (con sottostima all'ottimo, altrimenti la prima)
    DR.toggle($('ct-pair'), pairs.map(([i, j]) => ({ label: `{${i + 1},${j + 1}}`, value: i + ',' + j })), (val) => { S.pair = val.split(',').map(Number); drawBars(); }, S.pair.join(','));
  }

  // ================================================================ matrice dei vincoli (TU)
  function drawTU() {
    const G = D.G, n = D.n; const pairs = BR.offPairs(n);
    const matched = new Set(D.c.matching.pairs.map((p) => `${p.i}-${p.j}|${p.v}`));
    let html = `<table class="t ct-tut"><thead><tr><th>vincolo</th>${[...Array(n).keys()].map((v) => `<th>$\\beta_${v + 1}$</th>`).join('')}` +
      pairs.map(([i, j], k) => `<th${k === 0 ? ' class="sep"' : ''}>$q_{${i + 1}${j + 1}}$</th>`).join('') + `<th class="sep">$\\ge$</th><th>$y_{ij,v}$</th></tr></thead><tbody>`;
    for (const [i, j] of pairs) for (const v of [i, j]) {
      const m = matched.has(`${i}-${j}|${v}`);
      html += `<tr${m ? ' class="m"' : ''}><td>$(\\{${i + 1},${j + 1}\\},${v + 1})$</td>` +
        [...Array(n).keys()].map((u) => (u === v ? '<td class="b1">1</td>' : '<td></td>')).join('') +
        pairs.map(([a, b], k) => (a === i && b === j ? `<td class="q1${k === 0 ? ' sep' : ''}">1</td>` : `<td${k === 0 ? ' class="sep"' : ''}></td>`)).join('') +
        `<td class="sep">${minus(F(G[i][j] - G[v][v]))}</td><td class="y">${m ? 1 : 0}</td></tr>`;
    }
    html += '</tbody></table>';
    const box = $('ct-tu'); box.className = 'ct-tu'; box.innerHTML = html;
    h('p', 'small', `Valore duale: $\\sum(\\Gamma_{ij}-\\Gamma_{vv})\\,y_{ij,v}=${F(D.c.M)}=M$; valore primale $\\LB=${F(D.v.lb)}$.`, box);
    DR.texAll(box);
  }

  // ================================================================ selettori sincronizzati
  const exBtns = [];
  function buildSelectors() {
    for (const [id, rid] of [['ct-ex1', 'ct-rnd1'], ['ct-ex2', 'ct-rnd2']]) {
      exBtns.push(DR.toggle($(id), Object.entries(EX).map(([k, e]) => ({ label: e.label, value: k })), (k) => setExample(k), S.key));
      $(rid).addEventListener('click', () => { EX.rnd.G = randG(); setExample('rnd'); });
    }
  }
  function setExample(k) {
    S.key = k;
    const keys = Object.keys(EX);
    exBtns.forEach((btns) => btns.forEach((b, i) => b.classList.toggle('on', keys[i] === k)));
    D = compute(EX[k].G);
    S.alpha = D.alpha.slice();
    // coppia iniziale: una con sottostima all'ottimo di R, se esiste
    const withQ = BR.offPairs(D.n).find(([i, j]) => D.G[i][j] > Math.min(D.alpha[i], D.alpha[j]) + 1e-9);
    S.pair = withQ || BR.offPairs(D.n)[0];
    updateChain(); renderPanel(); buildAlphaControls(); drawBars(); drawTU();
  }

  buildChain();
  buildSelectors();
  setExample(S.key);
})();
