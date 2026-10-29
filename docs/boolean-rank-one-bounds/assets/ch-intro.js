/* ch-intro.js — mappa cliccabile dei capitoli. */
(() => {
  const host = document.getElementById('intro-flow');
  if (!host) return;
  const W = 900, H = 560;
  const s = DR.svg(host, W, H, 'Mappa: dalla matrice Γ alle due codifiche, al problema completo, al rilassamento, alla pseudoforesta, al matching e al bound di AWCD; il matroide grafico è un ramo separato');
  const rich = (parent, x, y, str, cls) => {
    const t = DR.text(parent, x, y, '', cls);
    for (const part of str.split(/(_\{[^}]*\}|\^\{[^}]*\})/)) {
      if (!part) continue;
      const m = part.match(/^([_^])\{([^}]*)\}$/);
      const ts = DR.el('tspan', m ? { 'baseline-shift': m[1] === '_' ? 'sub' : 'super', 'font-size': '72%' } : {}, t);
      ts.textContent = m ? m[2] : part;
    }
    return t;
  };
  const node = (x, y, w, h, title, sub, cls, href) => {
    const a = DR.el('a', { href }, s);
    const g = DR.el('g', { class: 'fnode ' + cls }, a);
    DR.el('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 14 }, g);
    rich(g, x, y - (sub ? 10 : 0), title, 'ft');
    if (sub) rich(g, x, y + 14, sub, 'fs');
    return [x, y, w, h];
  };
  const link = (a, b, label, cls = '') => {
    const [x1, y1, , h1] = a, [x2, y2, , h2] = b;
    const p = DR.arrow(s, x1, y1 + h1 / 2 + 2, x2, y2 - h2 / 2 - 6, { cls: 'arrow ' + cls });
    if (label) DR.text(s, (x1 + x2) / 2 + (x2 >= x1 ? 10 : -10), (y1 + h1 / 2 + y2 - h2 / 2) / 2, label, 'fl', { 'text-anchor': x2 > x1 ? 'start' : x2 < x1 ? 'end' : 'start' });
    return p;
  };
  const G = node(450, 40, 230, 50, 'matrice Γ simmetrica ≥ 0', '', 'n-mat', '#matrice-grafo');
  const L = node(230, 130, 270, 58, 'loop ℓ_{i} su ogni vertice', 'codifica delle pseudoforeste · A', 'n-diag', '#matrice-grafo');
  const Rr = node(670, 130, 270, 58, 'radice r, archi (r,i)', 'codifica di AWCD · A', 'n-root', '#matrice-grafo');
  const E = node(450, 230, 380, 58, 'E_{full}(Γ) = fase A di AWCD', 'stesso problema: fattore X_{U} ↔ clique {r}∪U · B', 'n-full', '#fattori');
  const Rx = node(450, 330, 380, 58, 'rilassamento unilaterale (R)', 'sovrastime fuori diagonale gratuite · C', 'n-rel', '#errori');
  const P = node(150, 450, 240, 58, 'pseudoforesta (P)', 'matroide bicircolare · D', 'n-pf', '#pseudoforeste');
  const Mt = node(450, 450, 240, 58, 'matching dei guadagni', 'trasversale · E', 'n-match', '#matching');
  const F = node(750, 450, 240, 58, 'matching bound AWCD', 'certificato di (D_{A}) · F', 'n-awcd', '#giovanni');
  const T = node(770, 330, 200, 50, 'matroide grafico', 'covering · MST · H', 'n-graph', '#matroidi');
  const C = node(450, 530, 420, 44, 'catena completa:  E_{full} ≥ LB = w(F^{*}) − γ = M  · G', '', 'n-chain', '#catena');
  link(G, L); link(G, Rr); link(L, E); link(Rr, E);
  link(E, Rx, '≥  (rilassamento)', 'geq');
  DR.arrow(s, 300, 359, 190, 419, { cls: 'arrow eqa' }); DR.text(s, 238, 378, '= dualità LP', 'fl eqs', { 'text-anchor': 'end' });
  DR.arrow(s, 270, 450, 328, 450, { cls: 'arrow eqa' }); DR.text(s, 299, 438, '=', 'fl eqt', { 'text-anchor': 'middle' });
  DR.arrow(s, 570, 450, 628, 450, { cls: 'arrow eqa' }); DR.text(s, 599, 438, '=', 'fl eqt', { 'text-anchor': 'middle' });
  const d = DR.el('path', { d: 'M740 160 C 760 220, 790 260, 770 300', class: 'arrow dashed' }, s);
  d.setAttribute('marker-end', 'url(#arrowhead)');
  DR.text(s, 770, 372, 'covering non ancorato:', 'fl', { 'text-anchor': 'middle' });
  rich(s, 770, 390, 'non è un bound su E_{full}', 'fl');
  s.lastChild.setAttribute('text-anchor', 'middle');
  const st = document.createElement('style');
  st.textContent = `
  #intro-flow { margin: 18px 0 6px; }
  #intro-flow .fnode rect { fill: #fff; stroke: var(--line-2); stroke-width: 2; transition: transform .15s, filter .15s; }
  #intro-flow a:hover .fnode rect, #intro-flow a:focus .fnode rect { filter: drop-shadow(0 4px 10px rgba(31,58,104,.18)); stroke-width: 3; }
  #intro-flow .ft { font: 700 16px var(--sans); fill: var(--ink); text-anchor: middle; dominant-baseline: central; }
  #intro-flow .fs { font: 13px var(--sans); fill: var(--ink-2); text-anchor: middle; dominant-baseline: central; }
  #intro-flow .fl { font: 600 13.5px var(--sans); fill: var(--ink-2); dominant-baseline: central; }
  #intro-flow .fl.eqt { fill: var(--eq); font-size: 18px; }
  #intro-flow .fl.eqs { fill: var(--eq); }
  #intro-flow .n-mat rect { fill: #f1f4fa; stroke: var(--brand); }
  #intro-flow .n-diag rect { fill: var(--diag-bg); stroke: var(--diag); }
  #intro-flow .n-root rect { fill: var(--root-bg); stroke: var(--root); }
  #intro-flow .n-full rect { fill: #eef3fb; stroke: var(--brand-2); stroke-width: 2.6; }
  #intro-flow .n-rel rect { fill: #f7f8fb; stroke: var(--ink-3); }
  #intro-flow .n-pf rect, #intro-flow .n-match rect, #intro-flow .n-awcd rect { fill: var(--match-bg); stroke: var(--match); }
  #intro-flow .n-graph rect { fill: #f3f4f6; stroke: #9aa3b2; stroke-dasharray: 6 4; }
  #intro-flow .n-chain rect { fill: var(--brand); stroke: var(--brand); } #intro-flow .n-chain .ft { fill: #fff; }
  #intro-flow .arrow.geq { stroke: var(--geq); stroke-width: 2.6; }
  #intro-flow .arrow.eqa { stroke: var(--eq); stroke-width: 2.6; }
  #intro-flow .arrow.dashed { stroke: #9aa3b2; stroke-dasharray: 6 5; }`;
  document.head.appendChild(st);
})();
