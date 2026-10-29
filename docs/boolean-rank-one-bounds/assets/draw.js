/* draw.js — primitive SVG e KaTeX condivise da tutti i capitoli (oggetto globale DR).
 * Le classi CSS dei disegni sono in style.css (sezione "elementi SVG"). */
const DR = (() => {
  const NS = 'http://www.w3.org/2000/svg';

  /** Crea un elemento SVG con attributi; se parent è dato, lo aggiunge. */
  function el(tag, attrs = {}, parent = null) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  }
  /** Testo SVG. */
  function text(parent, x, y, s, cls = '', attrs = {}) {
    const t = el('text', Object.assign({ x, y, class: cls }, attrs), parent);
    t.textContent = s;
    return t;
  }
  /** SVG responsivo dentro container (svuotato). Definisce tratteggio, freccia e marker. */
  function svg(container, w, h, label = '') {
    container.innerHTML = '';
    const s = el('svg', { viewBox: `0 0 ${w} ${h}`, class: 'd', role: 'img', 'aria-label': label }, container);
    const defs = el('defs', {}, s);
    const p = el('pattern', { id: 'hatch', width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    el('rect', { width: 7, height: 7, fill: '#ffffff' }, p);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 7, stroke: '#cfd5df', 'stroke-width': 3.5 }, p);
    for (const [id, color] of [['arrowhead', '#4a5568'], ['arrowhead-match', '#d4570f'], ['arrowhead-root', '#6b3fa0']]) {
      const m = el('marker', { id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
      el('path', { d: 'M0 0L10 5L0 10Z', fill: color }, m);
    }
    return s;
  }

  // ------------------------------------------------------------------ KaTeX
  /** Rende la stringa TeX dentro l'elemento HTML. */
  function tex(node, src, display = false) {
    if (window.katex) katex.render(src, node, { displayMode: display, throwOnError: false, trust: true, macros: MACROS });
    else node.textContent = src;
    return node;
  }
  /** Rende tutte le formule $…$ e $$…$$ (anche \( \) e \[ \]) dentro root. */
  function texAll(root = document.body) {
    if (window.renderMathInElement) renderMathInElement(root, {
      delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\[', right: '\\]', display: true },
                   { left: '$', right: '$', display: false }, { left: '\\(', right: '\\)', display: false }],
      throwOnError: false, trust: true, macros: MACROS, ignoredClasses: ['no-tex'] });
  }
  /** Macro comuni: usare sempre queste per la notazione. */
  const MACROS = {
    '\\G': '\\Gamma', '\\one': '\\mathbf{1}', '\\R': '\\mathbb{R}',
    '\\Efull': 'E_{\\mathrm{full}}', '\\LB': '\\mathrm{LB}', '\\UB': '\\mathrm{UB}', '\\val': '\\operatorname{val}',
    '\\COR': '\\mathrm{COR}', '\\cone': '\\operatorname{cone}', '\\tr': '\\operatorname{tr}', '\\supp': '\\operatorname{supp}',
    '\\dist': '\\operatorname{dist}', '\\Zcov': 'Z_{\\mathrm{cov}}', '\\K': '\\mathcal{K}', '\\C': '\\mathcal{C}',
    '\\Mb': 'M', '\\loopv': '\\ell',
  };

  // ------------------------------------------------------------------ disposizioni
  /** Posizioni di n vertici su un poligono regolare (vertice 1 in alto); opzionale radice r al centro o sotto. */
  function layout(n, { cx = 200, cy = 170, r = 120, root = null, start = -Math.PI / 2 } = {}) {
    const pos = [];
    if (n === 1) pos.push([cx, cy]);
    else if (n === 2) { pos.push([cx - r, cy]); pos.push([cx + r, cy]); }
    else for (let i = 0; i < n; i++) { const a = start + (2 * Math.PI * i) / n; pos.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    let rootPos = null;
    if (root === 'center') rootPos = [cx, cy];
    else if (root === 'below') rootPos = [cx, cy + r + 85];
    else if (Array.isArray(root)) rootPos = root;
    return { pos, root: rootPos };
  }

  // ------------------------------------------------------------------ matrice
  /** Disegna una matrice simmetrica come griglia. Opzioni:
   *  x, y, cell, upperOnly (grigia la parte inferiore), value(i,j)→stringa, cls(i,j)→classe extra
   *  ('on','under','over','free','exact','hl'), labels (indici 1..n), onCell(i,j,ev), title.
   *  Restituisce { g, cells: Map 'i,j' → <g> }. */
  function matrix(parent, G, o = {}) {
    const n = G.length; const cs = o.cell || 52; const x0 = o.x ?? 30; const y0 = o.y ?? 30;
    const g = el('g', { class: 'matrix' }, parent); const cells = new Map();
    if (o.labels !== false) for (let k = 0; k < n; k++) {
      text(g, x0 + k * cs + cs / 2, y0 - 14, String(k + 1), 'axis');
      text(g, x0 - 14, y0 + k * cs + cs / 2, String(k + 1), 'axis');
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const lower = o.upperOnly && j < i;
      const base = i === j ? 'diag' : lower ? 'lower' : 'off';
      const extra = (!lower && o.cls) ? (o.cls(i, j) || '') : '';
      const c = el('g', { class: `cell ${base} ${extra}`.trim(), 'data-i': i, 'data-j': j }, g);
      el('rect', { x: x0 + j * cs, y: y0 + i * cs, width: cs, height: cs, rx: 7 }, c);
      const v = o.value ? o.value(i, j) : BR.fmt(G[i][j]);
      if (v !== '' && v !== null) text(c, x0 + j * cs + cs / 2, y0 + i * cs + cs / 2, v);
      if (o.onCell && !lower) { c.style.cursor = 'pointer'; c.addEventListener('click', (ev) => o.onCell(i, j, ev)); }
      cells.set(i + ',' + j, c);
    }
    if (o.title) text(g, x0 + (n * cs) / 2, y0 + n * cs + 22, o.title, 'note', { 'text-anchor': 'middle' });
    return { g, cells, width: n * cs, height: n * cs };
  }

  // ------------------------------------------------------------------ grafo
  /** Grafo su vertici 0..n-1 (etichette 1..n) con loop, archi, radice.
   *  o.pos: posizioni; o.edges: [{i,j,cls,label,labelCls}] ; o.loops: [{i,cls,label}] ;
   *  o.root: [x,y] o null ; o.rootEdges: [{v,cls,label}] ; o.vcls(i)→classe ; o.vlabel(i) ;
   *  o.loopDir(i)→angolo radiale del loop (default: verso l'esterno). Restituisce { g, edgeEls, loopEls, vEls }. */
  function graph(parent, n, o = {}) {
    const g = el('g', { class: 'graph' }, parent);
    const P = o.pos; const cx = P.reduce((s, p) => s + p[0], 0) / n; const cy = P.reduce((s, p) => s + p[1], 0) / n;
    const edgeEls = new Map(), loopEls = new Map(), vEls = [];
    const layerE = el('g', {}, g), layerL = el('g', {}, g), layerV = el('g', {}, g), layerT = el('g', {}, g);
    const R = o.vr || 21;
    const lab = (x, y, s, cls) => { if (s !== undefined && s !== null && s !== '') text(layerT, x, y, s, 'wl ' + (cls || 'off')); };
    if (o.root) for (const re of o.rootEdges || []) {
      const [x1, y1] = o.root, [x2, y2] = P[re.v];
      const e = el('line', { x1, y1, x2, y2, class: 'edge root ' + (re.cls || '') }, layerE);
      edgeEls.set('r' + re.v, e);
      const t = re.t ?? 0.38; lab(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, re.label, re.labelCls || 'diag');
    }
    for (const ed of o.edges || []) {
      const [x1, y1] = P[ed.i], [x2, y2] = P[ed.j];
      let d;
      if (ed.bend) { const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
        d = `M${x1} ${y1} Q${mx - (dy / L) * ed.bend} ${my + (dx / L) * ed.bend} ${x2} ${y2}`; }
      else d = `M${x1} ${y1} L${x2} ${y2}`;
      const e = el('path', { d, class: 'edge ' + (ed.cls || '') }, layerE);
      edgeEls.set(ed.i + '-' + ed.j, e);
      // etichetta spostata verso l'esterno del poligono
      let mx = (x1 + x2) / 2, my = (y1 + y2) / 2; const ox = mx - cx, oy = my - cy, ol = Math.hypot(ox, oy) || 1;
      const off = ed.labelOff ?? (n <= 2 ? -16 : 14);
      lab(mx + (ox / ol) * off, my + (oy / ol) * off, ed.label, ed.labelCls || 'off');
    }
    for (const lp of o.loops || []) {
      const [x, y] = P[lp.i];
      let a = o.loopDir ? o.loopDir(lp.i) : Math.atan2(y - cy, x - cx);
      if (n === 1) a = -Math.PI / 2;
      const r = 17, d0 = R + r - 6, ux = Math.cos(a), uy = Math.sin(a);
      const ccx = x + ux * d0, ccy = y + uy * d0;
      const e = el('circle', { cx: ccx, cy: ccy, r, class: 'loop ' + (lp.cls || '') }, layerL);
      loopEls.set(lp.i, e);
      lab(ccx + ux * (r + 15), ccy + uy * (r + 15), lp.label, lp.labelCls || 'diag');
    }
    for (let i = 0; i < n; i++) {
      const v = el('g', { class: 'vtx ' + (o.vcls ? o.vcls(i) || '' : ''), 'data-v': i }, layerV);
      el('circle', { cx: P[i][0], cy: P[i][1], r: R }, v);
      text(v, P[i][0], P[i][1], o.vlabel ? o.vlabel(i) : String(i + 1));
      vEls.push(v);
    }
    if (o.root) {
      const v = el('g', { class: 'vtx root' }, layerV);
      el('circle', { cx: o.root[0], cy: o.root[1], r: R + 2 }, v);
      text(v, o.root[0], o.root[1], 'r');
    }
    return { g, edgeEls, loopEls, vEls };
  }

  // ------------------------------------------------------------------ grafo bipartito
  /** Due colonne di nodi: left/right = [{id,label,cls}], links = [{l,r,cls,label}].
   *  o: x1, x2, y0, dy, w, h. Restituisce { g, L: Map id→[x,y], Rt: Map, linkEls: Map 'l|r' → line }. */
  function bipartite(parent, left, right, links, o = {}) {
    const g = el('g', { class: 'bipartite' }, parent);
    const x1 = o.x1 ?? 110, x2 = o.x2 ?? 420, y0 = o.y0 ?? 40, dy = o.dy ?? 46, w = o.w ?? 78, h = o.h ?? 32;
    const L = new Map(), Rt = new Map(), linkEls = new Map();
    const yl = (k, N) => y0 + k * dy + ((Math.max(left.length, right.length) - N) * dy) / 2;
    left.forEach((a, k) => L.set(a.id, [x1, yl(k, left.length)]));
    right.forEach((a, k) => Rt.set(a.id, [x2, yl(k, right.length)]));
    const lg = el('g', {}, g), ng = el('g', {}, g), tg = el('g', {}, g);
    for (const ln of links) {
      const [ax, ay] = L.get(ln.l), [bx, by] = Rt.get(ln.r);
      const e = el('line', { x1: ax + w / 2, y1: ay, x2: bx - w / 2, y2: by, class: 'bp-link ' + (ln.cls || '') }, lg);
      linkEls.set(ln.l + '|' + ln.r, e);
      if (ln.label !== undefined && ln.label !== '') {
        const t = ln.t ?? 0.3;
        text(tg, ax + w / 2 + (bx - ax - w) * t, ay + (by - ay) * t - 1, ln.label, 'wl ' + (ln.labelCls || 'match'));
      }
    }
    const node = (pt, a, side) => {
      const gg = el('g', { class: 'bp-node ' + (a.cls || '') }, ng);
      el('rect', { x: pt[0] - w / 2, y: pt[1] - h / 2, width: w, height: h, rx: 9 }, gg);
      text(gg, pt[0], pt[1], a.label);
      return gg;
    };
    left.forEach((a) => node(L.get(a.id), a, 'L'));
    right.forEach((a) => node(Rt.get(a.id), a, 'R'));
    if (o.titles) { text(g, x1, y0 - 26, o.titles[0], 'note', { 'text-anchor': 'middle', 'font-weight': 700 }); text(g, x2, y0 - 26, o.titles[1], 'note', { 'text-anchor': 'middle', 'font-weight': 700 }); }
    return { g, L, Rt, linkEls };
  }

  /** Freccia (curva se bend ≠ 0). cls: 'arrow' (default) */
  function arrow(parent, x1, y1, x2, y2, { bend = 0, cls = 'arrow', marker = 'arrowhead' } = {}) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
    const d = bend ? `M${x1} ${y1} Q${mx - (dy / L) * bend} ${my + (dx / L) * bend} ${x2} ${y2}` : `M${x1} ${y1} L${x2} ${y2}`;
    return el('path', { d, class: cls, 'marker-end': `url(#${marker})` }, parent);
  }

  /** Utility HTML: crea un elemento con classe e contenuto (stringa HTML). */
  function h(tag, cls, html, parent) {
    const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html;
    if (parent) parent.appendChild(e); return e;
  }
  /** Bottoni a scelta singola: items [{label, value}], onChange(value). */
  function toggle(container, items, onChange, initial) {
    container.innerHTML = '';
    const btns = items.map((it) => {
      const b = h('button', 'btn' + (it.value === initial ? ' on' : ''), it.label, container);
      b.type = 'button';
      b.addEventListener('click', () => { btns.forEach((x) => x.classList.remove('on')); b.classList.add('on'); onChange(it.value); });
      return b;
    });
    return btns;
  }
  /** Slider con etichetta (HTML ammesso) e valore. */
  function slider(container, { label, min, max, step, value, onInput, format = (v) => BR.fmt(+v) }) {
    const w = h('label', 'slider', '', container);
    const l = h('span', '', label, w);
    const inp = h('input', '', undefined, w); Object.assign(inp, { type: 'range', min, max, step, value });
    const out = h('output', '', format(value), w);
    inp.addEventListener('input', () => { out.textContent = format(inp.value); onInput(+inp.value); });
    texAll(l);
    return inp;
  }

  return { el, text, svg, tex, texAll, MACROS, layout, matrix, graph, bipartite, arrow, h, toggle, slider };
})();
