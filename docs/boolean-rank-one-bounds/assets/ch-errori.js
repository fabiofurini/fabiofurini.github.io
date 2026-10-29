/* ch-errori.js — Capitolo C: sottostima e sovrastima, correzione con i singleton, costo completo e costo in (R). */
(() => {
  const sec = document.getElementById('errori');
  if (!sec) return;
  const $ = (id) => sec.querySelector('#' + id);
  const G = [[0, 1, 2], [1, 1, 0], [2, 0, 1]]; // esempio di riferimento: γ = 2, E_full = 3, LB = 2
  const n = 3, gam = BR.gamma(G);
  const key = (i, j) => (i <= j ? i + ',' + j : j + ',' + i);
  const ts = (U) => '\\{' + BR.toList(U).map((i) => i + 1).join(',') + '\\}';
  const fmt = BR.fmt;

  // fattori regolabili: uno grande, una coppia, i tre singleton
  const FACT = [0b111, 0b101, 0b001, 0b010, 0b100];
  const p = new Map(FACT.map((U) => [U, 0]));
  let view = 'full'; // 'full' = errore completo; 'R' = costo nel rilassamento
  let hover = null, pinned = null, flash = new Set();

  const REF = (() => { const e = BR.efull(G); const c = BR.chain(G, { withEfull: false }); return { efull: e.value, LB: c.LB, valR: c.valR }; })();

  // ------------------------------------------------------------ controlli
  const sliders = new Map();
  const sl = $('er-sliders');
  for (const U of FACT) {
    const inp = DR.slider(sl, { label: `$p_{${ts(U)}}$`, min: 0, max: 3, step: 0.5, value: 0,
      onInput: (v) => { p.set(U, v); flash.clear(); setMsg(''); update(); } });
    inp.setAttribute('aria-label', 'coefficiente p di ' + BR.setLabel(U));
    sliders.set(U, inp);
  }
  const setP = (U, v) => {
    p.set(U, v); const inp = sliders.get(U); inp.value = v;
    inp.parentNode.querySelector('output').textContent = fmt(v);
  };
  const PRESETS = [
    { label: 'Diagonale sottostimata', set: { 0b101: 1 } },
    { label: '$H=\\one\\one^\\top$', set: { 0b111: 1 } },
    { label: '$H=\\mathrm{diag}(0,1,1)$', set: { 0b010: 1, 0b100: 1 } },
    { label: '$H=0$', set: {} },
  ];
  const pr = $('er-presets');
  PRESETS.forEach((P) => {
    const b = DR.h('button', 'btn', P.label, pr); b.type = 'button';
    b.addEventListener('click', () => { for (const U of FACT) setP(U, P.set[U] || 0); flash.clear(); setMsg(''); update(); });
  });
  const fixBtn = DR.h('button', 'btn primary', 'Correggi con singleton', pr); fixBtn.type = 'button';
  fixBtn.addEventListener('click', correct);
  DR.texAll(pr);

  const vt = $('er-view');
  DR.toggle(vt, [{ label: 'Errore completo', value: 'full' }, { label: 'Costo in $(R)$', value: 'R' }], (v) => { view = v; update(); }, view);
  DR.texAll(vt);

  function setMsg(html) { const m = $('er-msg'); m.innerHTML = html; DR.texAll(m); }

  /** Elimina ogni sottostima diagonale aumentando il singleton p_{i}. */
  function correct() {
    const H = H_();
    const before = BR.errors(G, H).full;
    const changes = [];
    for (let i = 0; i < n; i++) {
      const d = G[i][i] - H[i][i];
      if (d > BR.EPS) { const U = 1 << i; changes.push({ i, U, from: p.get(U), to: p.get(U) + d, d }); }
    }
    if (!changes.length) { setMsg('Nessuna sottostima sulla diagonale: non c\'è niente da correggere.'); return; }
    for (const c of changes) setP(c.U, Math.min(3, c.to));
    flash = new Set(changes.map((c) => key(c.i, c.i)));
    const after = BR.errors(G, H_()).full;
    setMsg(changes.map((c) => `$p_{${ts(c.U)}}$: ${fmt(c.from)} → ${fmt(c.to)}`).join(', ') +
      `. Cambia solo la cella diagonale; errore completo ${fmt(before)} → <b>${fmt(after)}</b> (diminuisce di ${fmt(before - after)}).`);
    update();
  }

  const H_ = () => BR.combine(n, FACT.map((U) => ({ U, c: p.get(U) })));

  // ------------------------------------------------------------ disegno
  const CS = 60, X0 = 40, Y0 = 34;
  function full(container, M, label, cls) {
    const s = DR.svg(container, 240, 230, label);
    const m = DR.matrix(s, M, { x: X0, y: Y0, cell: CS, cls });
    for (const [kk, c] of m.cells) { const [i, j] = kk.split(',').map(Number); c.setAttribute('data-k', key(i, j)); }
  }
  /** Matrice del triangolo superiore con classificazione e due righe di testo per cella. */
  function classified(container, E) {
    const s = DR.svg(container, 240, 230, view === 'full' ? 'Differenza Gamma meno H con sottostime e sovrastime' : 'Costo della stessa H nel rilassamento R');
    for (let k = 0; k < n; k++) {
      DR.text(s, X0 + k * CS + CS / 2, Y0 - 14, String(k + 1), 'axis');
      DR.text(s, X0 - 14, Y0 + k * CS + CS / 2, String(k + 1), 'axis');
    }
    for (const c of E.cells) {
      const { i, j, d, kind } = c; // d = H − Γ
      let cls = kind, v, tag;
      const a = fmt(Math.abs(d));
      if (view === 'full') {
        v = kind === 'exact' ? '0' : (kind === 'under' ? '+' : '−') + a; // valore di Γ − H
        tag = kind === 'under' ? 's⁺' : kind === 'over' ? 's⁻' : 'esatto';
      } else if (i === j) {
        if (kind === 'under') { v = '✗'; tag = 'vietata'; }
        else if (kind === 'over') { v = a; tag = 'pagata'; }
        else { v = '0'; tag = 'esatto'; }
      } else if (kind === 'under') { v = a; tag = 'q pagata'; }
      else if (kind === 'over') { cls = 'free'; v = '0'; tag = 'gratis'; }
      else { v = '0'; tag = 'esatto'; }
      const g = DR.el('g', { class: `cell ${i === j ? 'diag' : 'off'} ${cls}${flash.has(key(i, j)) ? ' flash' : ''}`, 'data-k': key(i, j) }, s);
      DR.el('rect', { x: X0 + j * CS, y: Y0 + i * CS, width: CS, height: CS, rx: 7 }, g);
      DR.text(g, X0 + j * CS + CS / 2, Y0 + i * CS + CS / 2 - 8, v, 'v');
      DR.text(g, X0 + j * CS + CS / 2, Y0 + i * CS + CS / 2 + 15, tag, 'tag', { 'text-anchor': 'middle', 'dominant-baseline': 'central' });
    }
    for (let i = 1; i < n; i++) for (let j = 0; j < i; j++) {
      const g = DR.el('g', { class: 'cell lower' }, s);
      DR.el('rect', { x: X0 + j * CS, y: Y0 + i * CS, width: CS, height: CS, rx: 7 }, g);
    }
  }

  function bars(E, cost, q) {
    const scale = Math.max(E.full, E.diagOver + E.offUnder + E.offOver, 1);
    const seg = (val, cls, label) => (val > BR.EPS
      ? `<div class="seg ${cls}" style="width:${(100 * val) / scale}%" title="${label}">${(100 * val) / scale > 7 ? fmt(val) : ''}</div>` : '');
    const b1 = seg(E.diagUnder, 'u dg', 'sottostima diagonale') + seg(E.diagOver, 'o dg', 'sovrastima diagonale') +
      seg(E.offUnder, 'u of', 'sottostima fuori diagonale') + seg(E.offOver, 'o of', 'sovrastima fuori diagonale');
    let b2, v2;
    if (E.diagFeasible) {
      b2 = seg(E.diagOver, 'o dg', 'sovrastima diagonale (pagata)') + seg(E.offUnder, 'u of', 'q: sottostima fuori diagonale (pagata)') +
        seg(E.offOver, 'f of', 'sovrastima fuori diagonale: gratuita in R');
      v2 = fmt(E.oneSided);
    } else {
      b2 = seg(E.diagUnder, 'x dg', 'sottostima diagonale: vietata in R');
      v2 = '—';
    }
    $('er-bars').innerHTML =
      `<div class="bar"><div class="bl"><span>Errore completo $\\sum_{i\\le j}|\\Gamma_{ij}-H_{ij}|$</span><b>${fmt(E.full)}</b></div><div class="track">${b1}</div></div>` +
      `<div class="bar"><div class="bl"><span>Costo in $(R)$ meno $\\gamma$: sovrastima diagonale $+\\sum_{i&lt;j}q_{ij}$` +
      `${E.diagFeasible ? '' : ' <span class="no">— $H$ non ammissibile per $(R)$</span>'}</span><b>${v2}</b></div><div class="track">${b2}</div></div>`;
    DR.texAll($('er-bars'));
  }

  function update() {
    const H = H_();
    const E = BR.errors(G, H);
    full($('er-G'), G, 'Matrice Gamma di riferimento', null);
    full($('er-H'), H, 'Matrice ricostruita H', null);
    classified($('er-D'), E);
    const dt = $('er-Dt');
    dt.innerHTML = view === 'full' ? 'Differenza $\\Gamma-H$' : 'Costo di ogni cella in $(R)$';
    DR.texAll(dt);
    const cost = FACT.reduce((s, U) => s + BR.popcount(U) * p.get(U), 0); // Σ|U| p_U
    const q = E.offUnder;                                                  // Σ_{i<j} q_ij con q minimo
    bars(E, cost, q);
    const lg = $('er-legend');
    lg.innerHTML = view === 'full'
      ? '<span><i class="sw under"></i>sottostima $s^+$ ($H&lt;\\Gamma$)</span><span><i class="sw over"></i>sovrastima $s^-$ ($H>\\Gamma$)</span><span><i class="sw exact"></i>esatto</span>'
      : '<span><i class="sw under"></i>sottostima: pagata ($q_{ij}$) o vietata (diagonale, ✗)</span><span><i class="sw over"></i>sovrastima diagonale: pagata</span><span><i class="sw free"></i>sovrastima fuori diagonale: gratuita</span><span><i class="sw exact"></i>esatto</span>';
    DR.texAll(lg);
    const K = $('er-kpis');
    K.innerHTML =
      `<div class="kpi"><div class="l">errore completo di $H$</div><div class="v">${fmt(E.full)}</div></div>` +
      `<div class="kpi"><div class="l">costo in $(R)$: $\\sum_U|U|p_U+\\sum_{i&lt;j}q_{ij}$</div><div class="v">${E.diagFeasible ? fmt(cost) + ' + ' + fmt(q) + ' = ' + fmt(cost + q) : '<span class="no" style="font-size:15px">non ammissibile</span>'}</div></div>` +
      `<div class="kpi"><div class="l">costo in $(R)$ $-\\ \\gamma$ $(\\gamma=${fmt(gam)})$</div><div class="v">${E.diagFeasible ? fmt(cost + q - gam) : '—'}</div></div>` +
      `<div class="kpi"><div class="l">ottimi: $\\Efull(\\Gamma)$ e $\\LB=\\val(R)-\\gamma$</div><div class="v">${fmt(REF.efull)} <span class="rel-geq">≥</span> ${fmt(REF.LB)}</div></div>`;
    DR.texAll(K);
    fixBtn.disabled = E.diagFeasible;
    applyHL();
  }

  // ------------------------------------------------------------ evidenziazione condivisa fra le tre matrici
  const fig = $('er-G').closest('figure');
  function applyHL() {
    const k = hover ?? pinned;
    fig.querySelectorAll('[data-k]').forEach((e) => e.classList.toggle('hl', k !== null && e.getAttribute('data-k') === k));
  }
  fig.addEventListener('mouseover', (ev) => {
    const t = ev.target.closest && ev.target.closest('[data-k]');
    const k = t ? t.getAttribute('data-k') : null;
    if (k !== hover) { hover = k; applyHL(); }
  });
  fig.addEventListener('mouseleave', () => { hover = null; applyHL(); });
  fig.addEventListener('click', (ev) => {
    const t = ev.target.closest && ev.target.closest('[data-k]');
    if (!t) return;
    const k = t.getAttribute('data-k'); pinned = pinned === k ? null : k; hover = null; applyHL();
  });

  // ------------------------------------------------------------ avvio: diagonale sottostimata
  setP(0b101, 1);
  setMsg('Qui la cella $(2,2)$ è sottostimata: prova «Correggi con singleton».');
  update();
})();
