/* ch-esempi.js — sezione Esempi: 2×2 esatto, 3×3 con gap, esempio modificabile. */
(() => {
  const SECS = ['esempi', 'esempio-2x2', 'esempio-3x3', 'esempio-libero'].map((id) => document.getElementById(id)).filter(Boolean);
  if (!SECS.length || typeof BR === 'undefined' || typeof DR === 'undefined') return;
  const $ = (id) => { for (const s of SECS) { const e = s.querySelector('#' + id); if (e) return e; } return null; };
  const EPS = 1e-7;
  const f = (x) => BR.fmt(x);
  const tex = (s) => '$' + s + '$';
  const setTex = (U) => '\\{' + BR.toList(U).map((i) => i + 1).join(',') + '\\}';
  const elTex = (e) => (e.type === 'loop' ? `\\ell_{${e.i + 1}}` : `\\{${e.i + 1},${e.j + 1}\\}`);
  const signed = (v, first) => (first ? (v < 0 ? '−' + f(-v) : f(v)) : (v < 0 ? ' − ' + f(-v) : ' + ' + f(v)));

  // ---------------------------------------------------------------- geometria dei grafi
  function geo(n, mode) {
    if (n === 2) return mode === 'rooted' ? { W: 330, H: 240, pos: [[95, 80], [235, 80]], root: [165, 190], cen: [165, 80] }
      : { W: 330, H: 160, pos: [[95, 80], [235, 80]], cen: [165, 80] };
    if (n === 3) return { W: 330, H: 300, pos: DR.layout(3, { cx: 165, cy: 168, r: 92 }).pos, root: [165, 168], cen: [165, 168] };
    const c = [165, 158], a = 80;
    return { W: 330, H: 312, pos: [[c[0] - a, c[1] - a], [c[0] + a, c[1] - a], [c[0] + a, c[1] + a], [c[0] - a, c[1] + a]], root: c, cen: c, square: true };
  }
  const LOOPDIR4 = [-3 * Math.PI / 4, -Math.PI / 4, Math.PI / 4, 3 * Math.PI / 4];

  function edgeLabelPos(g, n, i, j, bend) {
    const [x1, y1] = g.pos[i], [x2, y2] = g.pos[j]; const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
    const nx = -dy / L, ny = dx / L;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    if (bend) { // punto della curva quadratica a t = 0.28, spostato verso l'esterno della curva
      const t = 0.36, cx = mx + nx * bend, cy = my + ny * bend;
      const px = (1 - t) * (1 - t) * x1 + 2 * t * (1 - t) * cx + t * t * x2, py = (1 - t) * (1 - t) * y1 + 2 * t * (1 - t) * cy + t * t * y2;
      return [px + nx * 14 * Math.sign(bend), py + ny * 14 * Math.sign(bend)]; }
    if (n === 2) return [mx, my - 17];
    const ox = mx - g.cen[0], oy = my - g.cen[1], ol = Math.hypot(ox, oy);
    if (ol < 5) { const t = 0.27; return [x1 + dx * t + nx * 13, y1 + dy * t + ny * 13]; }
    return [mx + (ox / ol) * 15, my + (oy / ol) * 15];
  }

  /** mode: 'loop' (grafo con loop, evidenzia sel) oppure 'rooted' (grafo bordato). */
  function drawGraph(box, G, mode, sel, label) {
    const n = G.length; const g = geo(n, mode);
    const svg = DR.svg(box, g.W, g.H, label);
    svg.style.maxWidth = '380px'; svg.style.margin = '0 auto';
    const cls = (id, w) => (w <= EPS ? 'ghost' : sel ? (sel.has(id) ? 'sel' : 'thin') : '');
    const edges = [], loops = [], rootEdges = [], labs = [];
    for (const [i, j] of BR.offPairs(n)) {
      const id = 'e' + (i + 1) + (j + 1); const w = G[i][j];
      const bend = g.square && mode === 'rooted' && j - i === 2 ? 88 : 0;
      edges.push({ i, j, cls: cls(id, w), bend });
      labs.push({ p: edgeLabelPos(g, n, i, j, bend), s: f(w), c: w > EPS ? 'off' : 'muted' });
    }
    for (let i = 0; i < n; i++) {
      const id = 'l' + (i + 1); const w = G[i][i];
      const o = { cls: cls(id, w), label: f(w), labelCls: w > EPS ? 'diag' : 'muted' };
      if (mode === 'loop') loops.push(Object.assign({ i }, o)); else rootEdges.push(Object.assign({ v: i, t: n === 2 ? 0.5 : 0.45 }, o));
    }
    DR.graph(svg, n, { pos: g.pos, edges, loops, rootEdges, root: mode === 'rooted' ? g.root : null,
      loopDir: g.square ? (i) => LOOPDIR4[i] : undefined });
    for (const l of labs) DR.text(svg, l.p[0], l.p[1], l.s, 'wl ' + l.c);
    return svg;
  }

  function drawMatrix(box, G, label, o = {}) {
    const n = G.length; const cell = o.cell || (n <= 2 ? 58 : n === 3 ? 52 : 46);
    const W = n * cell + 44, H = n * cell + 44;
    const svg = DR.svg(box, W, H, label);
    svg.style.maxWidth = Math.round(W * 1.15) + 'px'; svg.style.margin = '0 auto';
    DR.matrix(svg, G, Object.assign({ x: 34, y: 30, cell }, o));
    return svg;
  }

  function drawMatching(box, G, mm) {
    const n = G.length; const pairs = BR.offPairs(n);
    const left = pairs.map(([i, j]) => ({ id: 'e' + (i + 1) + (j + 1), label: `{${i + 1},${j + 1}}`, cls: 'edge' }));
    const right = [...Array(n).keys()].map((v) => ({ id: 'v' + (v + 1), label: String(v + 1), cls: 'vert' }));
    const chosen = new Set(mm.pairs.map((p) => 'e' + (p.i + 1) + (p.j + 1) + '|v' + (p.v + 1)));
    const links = [];
    for (const [i, j] of pairs) for (const v of [i, j]) {
      const gain = G[i][j] - G[v][v]; const key = 'e' + (i + 1) + (j + 1) + '|v' + (v + 1); const on = chosen.has(key);
      if (gain <= EPS) continue; // guadagno nullo: nessun collegamento utile
      links.push({ l: 'e' + (i + 1) + (j + 1), r: 'v' + (v + 1), cls: on ? 'on' : '',
        label: on || n <= 3 ? f(gain) : '', labelCls: on ? 'match' : 'muted', t: on ? 0.5 : 0.3 });
    }
    const dy = 44, rows = Math.max(left.length, n);
    const svg = DR.svg(box, 330, 66 + rows * dy, 'Grafo bipartito archi–vertici del matching dei guadagni; in arancio le assegnazioni scelte');
    svg.style.maxWidth = '380px'; svg.style.margin = '0 auto';
    DR.bipartite(svg, left, right, links, { x1: 72, x2: 262, y0: 56, dy, w: 72, h: 30, titles: ['archi', 'vertici'] });
    return svg;
  }

  const sw = (c, t) => `<span><i class="sw ${c}"></i>${t}</span>`;
  const swStyle = (st, t) => `<span><i class="sw" style="${st}"></i>${t}</span>`;
  const ZERO_SW = 'border:2px dashed #c9d1df;background:#fff';

  /** I quattro pannelli: matrice, grafo bordato, grafo con loop + F*, matching. */
  function renderCore(box, G, c) {
    const n = G.length;
    const hasZero = G.some((r) => r.some((v) => v <= EPS));
    box.innerHTML = `<div class="ex-grid2">
      <div class="panel"><div class="ptitle">Matrice $\\Gamma$</div><div class="m"></div>
        <div class="legend">${sw('diag', 'diagonale $\\Gamma_{ii}$')}${sw('off', 'fuori diagonale $\\Gamma_{ij}$')}</div>
        <div class="pnote">$\\gamma=${f(c.gamma)}$</div></div>
      <div class="panel"><div class="ptitle">Grafo bordato di AWCD</div><div class="g1"></div>
        <div class="legend">${sw('root', 'radice $r$')}${sw('diag', 'arco $(r,i)$, peso $\\Gamma_{ii}$')}${sw('off', 'arco $\\{i,j\\}$')}${hasZero ? swStyle(ZERO_SW, 'peso $0$') : ''}</div></div>
      <div class="panel"><div class="ptitle">Grafo con loop · pseudoforesta ottima $F^*$</div><div class="g2"></div>
        <div class="legend">${sw('exact', 'in $F^*$')}${swStyle('border:2px solid #9aa6bb;background:#fff;opacity:.6', 'non in $F^*$')}${hasZero ? swStyle(ZERO_SW, 'peso $0$') : ''}</div>
        <div class="pnote f"></div></div>
      <div class="panel"><div class="ptitle">Matching dei guadagni</div><div class="bp"></div>
        <div class="legend">${sw('match', 'assegnazione scelta')}${swStyle('border:2px solid #c9d1df;background:#fff', 'altro guadagno positivo')}</div>
        <div class="pnote small muted">numero sul collegamento = guadagno $(\\Gamma_{ij}-\\Gamma_{vv})^+$${n > 3 ? ' (mostrato solo sulle assegnazioni scelte)' : ''}</div>
        <div class="pnote mm"></div></div>
    </div>`;
    drawMatrix(box.querySelector('.m'), G, `Matrice Gamma ${n} per ${n}`);
    drawGraph(box.querySelector('.g1'), G, 'rooted', null, `Grafo bordato con radice r su ${n} vertici`);
    const F = c.greedy.F; const sel = new Set(F.map((e) => e.id));
    drawGraph(box.querySelector('.g2'), G, 'loop', sel, `Grafo con loop: in verde la pseudoforesta ottima, peso ${f(c.pseudoforest)}`);
    drawMatching(box.querySelector('.bp'), G, c.matching);
    box.querySelector('.f').innerHTML = F.length
      ? `$F^*=\\{${F.map(elTex).join(',\\ ')}\\}$, $\\ w(F^*)=${F.map((e) => f(e.w)).join('+')}${F.length > 1 ? '=' + f(c.pseudoforest) : ''}$`
      : '$F^*=\\emptyset$, $w(F^*)=0$';
    const P = c.matching.pairs;
    box.querySelector('.mm').innerHTML = P.length
      ? `$M=${f(c.M)}$: ` + P.map((p) => `$\\{${p.i + 1},${p.j + 1}\\}\\to${p.v + 1}$ (guadagno ${f(p.gain)})`).join(', ')
      : '$M=0$: nessun guadagno positivo';
    DR.texAll(box);
  }

  /** La catena E_full ≥ LB = val(R) − γ = w(F*) − γ = M, con badge. */
  function renderChain(box, c) {
    const ef = c.efull.value; const exact = Math.abs(ef - c.LB) < 1e-6;
    const same = (a, b) => (Math.abs(a - b) < 1e-6 ? '<span class="rel-eq">=</span>' : '<span class="rel-geq">≠</span>');
    const t = (l, v, first) => `<span class="ex-t${first ? ' first' : ''}"><span class="ex-l">${l}</span><span class="ex-v">${v}</span></span>`;
    box.innerHTML = `<div class="ex-chain" role="group" aria-label="Catena dei valori">` +
      t('$\\Efull(\\Gamma)$', f(ef), true) +
      (exact ? '<span class="rel-eq">=</span>' : '<span class="rel-geq">≥</span>') +
      t('$\\LB$', f(c.LB)) + same(c.LB, c.valR - c.gamma) +
      t('$\\val(R)-\\gamma$', `${f(c.valR)}−${f(c.gamma)}`) + same(c.valR, c.pseudoforest) +
      t('$w(F^*)-\\gamma$', `${f(c.pseudoforest)}−${f(c.gamma)}`) + same(c.pseudoforest - c.gamma, c.M) +
      t('$M$', f(c.M)) +
      (exact ? '<span class="ex-badge ok">bound esatto</span>' : `<span class="ex-badge gap">gap = ${f(ef - c.LB)}</span>`) +
      '</div>';
    DR.texAll(box);
  }

  /** Decomposizione: H(p) e matrice degli errori colorata. */
  function renderDecomp(box, G, terms, note) {
    const n = G.length; const H = BR.combine(n, terms); const er = BR.errors(G, H);
    const kind = new Map(er.cells.map((x) => [x.i + ',' + x.j, x]));
    const pTex = terms.length ? terms.map((t) => `p_{${setTex(t.U)}}=${f(t.c)}`).join(',\\ ') : 'p=0';
    const tr = H.reduce((s, r, i) => s + r[i], 0);
    const kinds = new Set(er.cells.map((x) => x.kind));
    box.innerHTML = `<p class="ex-sumline">${tex(pTex)}${note ? ' · ' + note : ''}</p>
      <div class="ex-dec">
        <div class="panel"><div class="ptitle">Ricostruzione $H(p)$</div><div class="h1"></div><div class="ex-sumline small">$\\tr H=${f(tr)}$</div></div>
        <div class="panel"><div class="ptitle">Errori $|\\Gamma_{ij}-H_{ij}|$, $i\\le j$</div><div class="h2"></div>
          <div class="legend">${kinds.has('under') ? sw('under', 'sottostima $H_{ij}<\\Gamma_{ij}$') : ''}${kinds.has('over') ? sw('over', 'sovrastima $H_{ij}>\\Gamma_{ij}$') : ''}${kinds.has('exact') ? sw('exact', 'esatto') : ''}</div></div>
      </div>
      <p class="ex-sumline">errore $=${er.cells.map((x) => f(Math.abs(x.d))).join('+')}=${f(er.full)}$</p>`;
    drawMatrix(box.querySelector('.h1'), H, 'Matrice ricostruita H(p)');
    drawMatrix(box.querySelector('.h2'), G, 'Matrice degli errori: rosso sottostima, verde acqua sovrastima, verde esatto', {
      upperOnly: true,
      value: (i, j) => (j < i ? '' : f(Math.abs(kind.get(i + ',' + j).d))),
      cls: (i, j) => kind.get(i + ',' + j).kind,
    });
    DR.texAll(box);
  }

  /** Certificato duale: matrice y e verifica su tutti i sottoinsiemi. */
  function renderDual(box, G, y) {
    const n = G.length; const d = BR.checkDual(G, y);
    const rows = d.rows.map((r) => {
      const L = BR.toList(r.U); const parts = [];
      for (let a = 0; a < L.length; a++) for (let b = a; b < L.length; b++) { const v = y[L[a]][L[b]]; if (Math.abs(v) > EPS) parts.push(v); }
      const expr = parts.length ? parts.map((v, k) => signed(v, k === 0)).join('') + (parts.length > 1 ? ' = ' + signed(r.sum, true) : '') : '0';
      return `<tr><td>${tex('U=' + setTex(r.U))}</td><td class="m">${expr}</td><td>${r.ok ? '<span class="ok">✓ ≤ 0</span>' : '<span class="no">✗</span>'}</td></tr>`;
    }).join('');
    const vparts = []; for (const [i, j] of BR.entries(n)) if (Math.abs(y[i][j]) > EPS) vparts.push(`${f(G[i][j])}\\cdot${y[i][j] < 0 ? '(' + f(y[i][j]) + ')' : f(y[i][j])}`);
    box.innerHTML = `<div class="ex-dec">
        <div class="panel"><div class="ptitle">Il vettore $y$ (triangolo superiore)</div><div class="ym"></div></div>
        <div class="panel"><div class="ptitle">Vincoli: tutti i ${d.rows.length} sottoinsiemi</div>
          <table class="t ex-dual"><thead><tr><th>$U$</th><th>$\\sum_{i\\le j\\in U}y_{ij}$</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
      </div>
      <p class="ex-sumline">${d.boxOk ? '$-1\\le y\\le 1$ <span class="ok">✓</span>' : '<span class="no">box violato</span>'} · valore
      $\\sum_{i\\le j}\\Gamma_{ij}y_{ij}=${vparts.join('+')}=${f(d.value)}$ ${d.ok ? '<span class="ok">ammissibile</span>' : '<span class="no">non ammissibile</span>'}</p>`;
    drawMatrix(box.querySelector('.ym'), y, 'Vettore duale y in coordinate di matrice', { upperOnly: true, value: (i, j) => (j < i ? '' : f(y[i][j])) });
    DR.texAll(box);
  }

  // ---------------------------------------------------------------- esempi fissi
  const G1 = [[1, 3], [3, 2]];
  const G2 = [[0, 1, 2], [1, 1, 0], [2, 0, 1]];
  const G0 = [[0, 1, 1], [1, 0, 1], [1, 1, 0]];
  const c1 = BR.chain(G1), c2 = BR.chain(G2);

  // riepilogo
  (() => {
    const box = $('ex-summary'); if (!box) return;
    const pm = (G) => '\\begin{pmatrix}' + G.map((r) => r.map(f).join('&')).join('\\\\') + '\\end{pmatrix}';
    const rows = [['1', G1, '#esempio-2x2'], ['2', G2, '#esempio-3x3'], ['cap. H', G0, '#matroidi']].map(([k, G, href]) => {
      const c = BR.chain(G); const ef = c.efull.value; const ok = Math.abs(ef - c.LB) < 1e-6;
      return `<tr><td><a href="${href}">${k}</a></td><td>${tex(pm(G))}</td><td class="m">${f(c.LB)}</td><td class="m">${f(ef)}</td>
        <td>${ok ? '<span class="ex-badge ok">bound esatto</span>' : `<span class="ex-badge gap">gap = ${f(ef - c.LB)}</span>`}</td></tr>`;
    }).join('');
    box.innerHTML = `<table class="t ex-sum"><thead><tr><th>Esempio</th><th>$\\Gamma$</th><th>$\\LB=M$</th><th>$\\Efull(\\Gamma)$</th><th>Esito</th></tr></thead><tbody>${rows}</tbody></table>`;
    DR.texAll(box);
  })();

  function decSelector(selBox, decBox, G, options) {
    DR.toggle(selBox, options.map((o, k) => ({ label: o.label, value: k })), (k) => renderDecomp(decBox, G, options[k].terms, options[k].note), 0);
    DR.texAll(selBox);
    renderDecomp(decBox, G, options[0].terms, options[0].note);
  }

  // esempio 1
  if ($('ex1-core')) {
    renderCore($('ex1-core'), G1, c1);
    renderChain($('ex1-chain'), c1);
    decSelector($('ex1-dec-sel'), $('ex1-dec'), G1, [
      { label: '$p_{\\{1,2\\}}=2$', terms: [{ U: 0b11, c: 2 }], note: 'tutta la matrice uguale a $2$' },
      { label: 'soluzione del simplesso', terms: c1.efull.terms, note: 'ottimo restituito da <code>BR.efull</code>' },
    ]);
    renderDual($('ex1-dual'), G1, BR.matchingCertificate(G1, c1.matching.pairs));
  }

  // esempio 2
  if ($('ex2-core')) {
    renderCore($('ex2-core'), G2, c2);
    renderChain($('ex2-chain'), c2);
    decSelector($('ex2-dec-sel'), $('ex2-dec'), G2, [
      { label: '$\\one\\one^\\top$: $p_{\\{1,2,3\\}}=1$', terms: [{ U: 0b111, c: 1 }], note: 'traccia $3$' },
      { label: '$\\mathrm{diag}(0,1,1)$: $p_{\\{2\\}}=p_{\\{3\\}}=1$', terms: [{ U: 0b010, c: 1 }, { U: 0b100, c: 1 }], note: 'traccia $2$, scelta dalla fase B' },
    ]);
    renderDual($('ex2-dual'), G2, [[-1, 1, 1], [1, 0, -1], [1, -1, 0]]);
  }

  // ---------------------------------------------------------------- esempio modificabile
  if (!$('ex3-core')) return;
  const st = { n: 4, G: [[0, 2, 1, 0], [2, 1, 0, 2], [1, 0, 0, 3], [0, 2, 3, 1]] };
  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const inputs = [];

  function buildInputs() {
    const box = $('ex3-inputs'); const n = st.n; box.innerHTML = ''; inputs.length = 0;
    box.style.gridTemplateColumns = `18px repeat(${n}, 64px)`;
    DR.h('span', 'ax', '', box);
    for (let j = 0; j < n; j++) DR.h('span', 'ax', String(j + 1), box);
    for (let i = 0; i < n; i++) {
      DR.h('span', 'ax', String(i + 1), box); inputs.push([]);
      for (let j = 0; j < n; j++) {
        const inp = DR.h('input', 'num ' + (i === j ? 'd' : 'o'), undefined, box);
        Object.assign(inp, { type: 'number', min: 0, step: 0.5, value: f(st.G[i][j]) });
        inp.setAttribute('aria-label', `Gamma ${i + 1},${j + 1}`);
        inp.addEventListener('input', () => {
          let v = parseFloat(inp.value); if (!isFinite(v) || v < 0) v = 0;
          st.G[i][j] = st.G[j][i] = v;
          if (i !== j) inputs[j][i].value = inp.value;
          hideNote(); update();
        });
        inputs[i].push(inp);
      }
    }
  }
  function syncInputs() { for (let i = 0; i < st.n; i++) for (let j = 0; j < st.n; j++) inputs[i][j].value = f(st.G[i][j]); }
  function hideNote() { const nb = $('ex3-gen-note'); nb.hidden = true; nb.innerHTML = ''; }
  function showNote(html) { const nb = $('ex3-gen-note'); nb.hidden = false; nb.innerHTML = html; DR.texAll(nb); }

  function update() {
    const G = st.G; const c = BR.chain(G);
    renderChain($('ex3-chain'), c);
    renderCore($('ex3-core'), G, c);
    renderDecomp($('ex3-dec'), G, c.efull.terms, 'un ottimo restituito dal simplesso');
  }
  function setN(n) {
    const old = st.G; const G = BR.zeros(n);
    for (let i = 0; i < n; i++) for (let j = i; j < n; j++) G[i][j] = G[j][i] = i < old.length && j < old.length ? old[i][j] : rint(0, 3);
    st.n = n; st.G = G; buildInputs(); hideNote(); update();
  }
  function setG(G, note) { st.G = G; syncInputs(); if (note) showNote(note); else hideNote(); update(); }

  DR.toggle($('ex3-n'), [2, 3, 4].map((n) => ({ label: `$n=${n}$`, value: n })), setN, 4);
  DR.texAll($('ex3-n'));
  const gen = $('ex3-gen');
  const btn = (label, fn) => { const b = DR.h('button', 'btn', label, gen); b.type = 'button'; b.addEventListener('click', fn); DR.texAll(b); return b; };
  btn('casuale', () => {
    const n = st.n; const G = BR.zeros(n);
    for (let i = 0; i < n; i++) for (let j = i; j < n; j++) G[i][j] = G[j][i] = rint(0, 5);
    setG(G);
  });
  btn('rank-one $bb^\\top$', () => {
    const n = st.n; let b;
    do { b = Array.from({ length: n }, () => rint(1, 4)); } while (new Set(b).size < 2);
    const G = b.map((x) => b.map((z) => x * z));
    // verifica numerica su 300 vettori casuali
    let ok = 0; const N = 300;
    for (let k = 0; k < N; k++) {
      const v = Array.from({ length: n }, () => rint(0, 4)); const B = v.map((x) => v.map((z) => x * z));
      if (Math.abs(BR.efull(B).value - BR.maxGainMatching(B).value) < 1e-6) ok++;
    }
    setG(G, `$\\Gamma=bb^\\top$ con $b=(${b.join(',')})$. Verifica su ${N} vettori casuali $b\\in\\{0,\\dots,4\\}^{${n}}$:
      $\\Efull(bb^\\top)=M$ in <b class="${ok === N ? 'ok' : 'no'}">${ok} casi su ${N}</b>.`);
  });
  btn('nel cono', () => {
    const n = st.n; const k = rint(2, 3); const terms = [];
    for (let t = 0; t < k; t++) terms.push({ U: rint(1, (1 << n) - 1), c: rint(1, 3) });
    const G = BR.combine(n, terms);
    setG(G, `$\\Gamma=${terms.map((t) => (t.c === 1 ? '' : t.c) + `X_{${setTex(t.U)}}`).join('+')}$ sta nel cono: $\\Efull(\\Gamma)=0$ e il bound vale $0$.`);
  });
  btn('diagonale nulla', () => {
    const n = st.n; const G = BR.clone(st.G);
    for (let i = 0; i < n; i++) G[i][i] = 0;
    if (BR.offPairs(n).every(([i, j]) => G[i][j] === 0)) for (const [i, j] of BR.offPairs(n)) G[i][j] = G[j][i] = rint(1, 4);
    setG(G, 'Diagonale azzerata: ora $\\gamma=0$ e ogni guadagno è semplicemente $\\Gamma_{ij}$.');
  });

  buildInputs();
  update();
})();
