/* ch-intro.js — prima pagina: tre esempi di decomposizione e schede del percorso. */
(() => {
  const host = document.getElementById('intro-ex');
  if (!host) return;
  const M = (U) => BR.toMask(U.map((i) => i - 1));
  const EX = [
    { label: 'Errore nullo', G: [[3, 3, 1], [3, 3, 1], [1, 1, 1]], terms: [{ U: M([1, 2]), c: 2 }, { U: M([1, 2, 3]), c: 1 }],
      cap: '$\\Gamma=2\\,X_{\\{1,2\\}}+X_{\\{1,2,3\\}}$ esattamente: errore 0. Si dice che $\\Gamma$ sta nel cono $\\COR(3)$.' },
    { label: 'Solo errori positivi', G: [[1, 0, 0], [0, 1, 2], [0, 2, 1]], terms: [{ U: M([1]), c: 1 }, { U: M([2, 3]), c: 1 }],
      cap: 'Errori positivi = sottostime ($\\Gamma_{ij}-H_{ij}>0$). L\'ottimo $H=X_{\\{1\\}}+X_{\\{2,3\\}}$ sottostima solo $\\Gamma_{23}$: errore 1. Con sole sovrastime il minimo sarebbe 2.' },
    { label: 'Errori di entrambi i segni', G: [[0, 1, 1], [1, 0, 2], [1, 2, 1]], terms: [{ U: M([1, 2, 3]), c: 1 }],
      cap: 'L\'ottimo sottostima $\\Gamma_{23}$ (errore positivo) e sovrastima $\\Gamma_{11},\\Gamma_{22}$ (errori negativi): errore 3. Con errori di un solo segno il minimo sarebbe 4.' },
  ];
  const cell = 44;
  const legendEl = document.getElementById('intro-ex-legend');
  const capEl = document.getElementById('intro-ex-cap');

  function draw(k) {
    const ex = EX[k]; const n = ex.G.length; const H = BR.combine(n, ex.terms); const er = BR.errors(ex.G, H);
    const w = n * cell, sp = 42;
    const W = Math.max(2 * w + 3 * sp + 40, w + ex.terms.length * (w + sp + 36) + 2 * sp + 20);
    const s = DR.svg(host, W, 2 * w + 120, 'Matrice, fattori, ricostruzione ed errori');
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
    DR.matrix(s, H, { x, y: y2, cell, labels: false }); lab(x + w / 2, y2 + w + 20, 'H (ricostruzione)');
    x += w + sp + 30; op(x - sp / 2 - 22, y2 + w / 2, '→');
    const byCell = new Map(er.cells.map((c) => [c.i + ',' + c.j, c]));
    DR.matrix(s, H, { x, y: y2, cell, labels: false, upperOnly: true,
      cls: (i, j) => (byCell.get(i + ',' + j) || {}).kind || '',
      value: (i, j) => { const c = byCell.get(i + ',' + j); if (!c) return ''; return c.kind === 'exact' ? '0' : (c.d < 0 ? '+' : '−') + BR.fmt(Math.abs(c.d)); } });
    lab(x + w / 2, y2 + w + 20, 'Γ − H  ·  errore totale ' + BR.fmt(er.full));
    const used = new Set(er.cells.map((c) => c.kind));
    legendEl.innerHTML = '<span><i class="sw diag"></i>diagonale</span><span><i class="sw off"></i>fuori diagonale</span><span><i class="sw on"></i>1 nel fattore</span>' +
      (used.has('under') ? '<span><i class="sw under"></i>sottostima: $\\Gamma_{ij}-H_{ij}&gt;0$ (slack $s^+$)</span>' : '') +
      (used.has('over') ? '<span><i class="sw over"></i>sovrastima: $H_{ij}-\\Gamma_{ij}&gt;0$ (slack $s^-$)</span>' : '') +
      '<span><i class="sw exact"></i>esatto</span>';
    capEl.innerHTML = ex.cap; DR.texAll(capEl); DR.texAll(legendEl);
  }
  DR.toggle(document.getElementById('intro-ex-tabs'), EX.map((e, k) => ({ label: e.label, value: k })), draw, 0);
  draw(0);

  const cards = [
    ['A', 'matrice-grafo.html', 'Dalla matrice al grafo', 'Loop sui vertici o una radice in più: due codifiche degli stessi numeri.'],
    ['B', 'fattori.html', 'Fattori e clique', 'Ogni fattore $X_U$ è una clique ancorata: $\\Efull$ è la fase A di AWCD.'],
    ['C', 'errori.html', 'Errori e rilassamento', 'Le sovrastime fuori diagonale diventano gratuite: nasce $(R)$.'],
    ['D', 'pseudoforeste.html', 'Primale e duale', 'Il duale di $(R)$ è una pseudoforesta di peso massimo.'],
    ['E', 'matching.html', 'Il matching', 'Il bicircolare si risolve con un matching bipartito.'],
    ['F', 'matching-bound-awcd.html', 'Il bound di AWCD', 'Lo stesso matching come certificato duale di AWCD.'],
    ['G', 'catena.html', 'La catena completa', 'Tutte le uguaglianze, e l\'unica disuguaglianza.'],
    ['H', 'matroidi.html', 'Due matroidi', 'Bicircolare e grafico non sono la stessa cosa.'],
    ['∑', 'esempi.html', 'Esempi', 'Tre esempi completi, uno modificabile.'],
    ['⚙', 'laboratorio.html', 'Laboratorio', 'Cambia il grafo e guarda cambiare soluzioni e bound.'],
  ];
  const box = document.getElementById('intro-cards');
  const avail = window.BR_PAGES || cards.map((c) => c[1]);
  box.innerHTML = cards.map(([k, href, t, d]) => avail.includes(href)
    ? `<a class="card" href="${href}"><span class="k">${k}</span><b>${t}</b><span class="d">${d}</span></a>`
    : `<div class="card soon" aria-disabled="true"><span class="k">${k}</span><b>${t}</b><span class="d">${d}</span><span class="tag">in preparazione</span></div>`).join('');
  DR.texAll(box);
})();
