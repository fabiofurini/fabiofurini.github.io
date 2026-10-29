/* ch-matching.js — Capitolo E: rappresentazione trasversale, scambi loop→arco, matching dei guadagni, w(F*) = γ + M.
 * Tutti i numeri vengono da BR (core.js); qui solo disegno e interazione. */
(() => {
  const sec = document.getElementById('matching');
  if (!sec) return;
  const $ = (id) => document.getElementById(id);
  const EPS = 1e-9;
  const fmt = BR.fmt;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const css = `
  #matching .mt-row{grid-template-columns:minmax(0,1.25fr) minmax(0,1fr)}
  @media (max-width:760px){#matching .mt-row{grid-template-columns:1fr}}
  #matching .mt-msg{background:var(--soft);border-radius:10px;padding:9px 14px;margin:10px 0 0;min-height:44px;font-size:15.5px}
  #matching .mt-ul{margin:4px 0 0;padding-left:22px} #matching .mt-ul li{margin:3px 0}
  #matching .sw.ghostsw{background:#fff;border:2px dashed #c9d1df}
  #matching .stepinfo{font-size:14.5px;color:var(--ink-2);margin-left:auto}
  #matching .mt-xg{max-width:560px;margin:0 auto}
  #matching .panel .legend{font-size:13px;gap:4px 12px;margin:6px 0 0}
  #matching .d .bp-node{cursor:default}
  #matching .d .bp-node.click{cursor:pointer}
  #matching .d .bp-node.click:hover rect{filter:brightness(.96)}
  #matching .d .bp-node.out rect{fill:#fff;stroke:#d5dbe6;stroke-dasharray:4 3}
  #matching .d .bp-node.out text{fill:var(--ink-3)}
  #matching .d .bp-node.in rect{stroke-width:3.2}
  #matching .d .bp-node.bad rect{stroke:var(--reject);stroke-width:3.4;fill:var(--under-bg)}
  #matching .d .bp-node.vbad rect{stroke:var(--reject);stroke-width:3.4}
  #matching .d .bp-node.used rect{stroke:var(--match);stroke-width:3}
  #matching .d .bp-link{stroke:#dfe4ec;stroke-width:1.6}
  #matching .d .bp-link.on{stroke:var(--match);stroke-width:4.2}
  #matching .d .bp-link.loopl.on{stroke:var(--diag);stroke-width:4.2}
  #matching .d .bp-link.pos{stroke:#b9c3d3;stroke-width:2}
  #matching .d .bp-link.neg{stroke:#cfd6e2;stroke-width:1.6;stroke-dasharray:4 4}
  #matching .d .bp-link.bad{stroke:var(--reject);stroke-width:2.4;stroke-dasharray:5 4}
  #matching .d .hit{stroke:transparent;stroke-width:16;cursor:pointer}
  #matching .d .hit:hover + .bp-link, #matching .d .hitg:hover .bp-link{stroke:#f2a46c}
  #matching .d .edge.acc{stroke-width:5} #matching .d .loop.acc{stroke-width:4.6}
  #matching .d .edge.bad,#matching .d .loop.bad{stroke:var(--reject);stroke-width:4.6}
  #matching .d .loop.ghost{stroke:#c9d1df;stroke-width:2;stroke-dasharray:4 5}
  #matching .d .adot{fill:var(--match);stroke:#fff;stroke-width:2}
  #matching .d .uline{stroke:#f3c95a;stroke-width:13;fill:none;stroke-linecap:round;opacity:.75}
  #matching .d .seg-l{fill:var(--diag-bg);stroke:var(--diag);stroke-width:1.6}
  #matching .d .seg-e{fill:var(--off-bg);stroke:var(--off);stroke-width:1.6}
  #matching .d .seg-g{fill:var(--match-bg);stroke:var(--match);stroke-width:1.6}
  #matching .d .seg-t{font:600 12.5px var(--mono);text-anchor:middle;dominant-baseline:central;fill:var(--ink)}
  #matching .d .bar-l{font:600 14px var(--sans);fill:var(--ink-2);dominant-baseline:central}
  #matching .d .bar-v{font:700 15px var(--mono);fill:var(--brand);dominant-baseline:central}
  #matching .d .eqline{stroke:var(--eq);stroke-width:2;stroke-dasharray:5 4}
  #matching .mt-scale table.t td,#matching .mt-scale table.t th{text-align:center}
  `;
  const st = document.createElement('style'); st.textContent = css; sec.appendChild(st);

  // ------------------------------------------------------------------ esempi
  const EX = [
    { label: '4 vertici', G: [[2, 6, 3, 4], [6, 9, 1, 10], [3, 1, 8, 7], [4, 10, 7, 5]] },
    { label: '3×3', G: [[0, 1, 2], [1, 1, 0], [2, 0, 1]] },
    { label: '2×2', G: [[1, 3], [3, 2]] },
  ];
  const exBar = (host, onChange) => {
    host.innerHTML = '';
    DR.toggle(host, EX.map((e, k) => ({ label: e.label, value: k })), (k) => onChange(EX[k]), 0);
    onChange(EX[0]);
  };
  const lab = (e) => BR.elemLabel(e);
  const elTex = (e) => (e.type === 'loop' ? '\\ell_{' + (e.i + 1) + '}' : '\\{' + (e.i + 1) + ',' + (e.j + 1) + '\\}');
  const setTex = (list) => '\\{' + list.map((v) => v + 1).join(',') + '\\}';

  // ------------------------------------------------------------------ grafo con loop (come nel capitolo D)
  const W = 400, H = 345, R0 = 21, RL = 17;
  function geometry(n) {
    let P, loopA, lb = {};
    if (n === 4) {
      P = [[200, 52], [345, 286], [55, 286], [200, 196]];
      loopA = [-Math.PI / 2, Math.PI / 5, Math.PI - Math.PI / 5, Math.PI / 2];
      lb = { '0-1': [288, 162], '0-2': [112, 162], '0-3': [215, 118], '1-2': [200, 304], '1-3': [282, 230], '2-3': [118, 230] };
    } else if (n === 3) {
      P = DR.layout(3, { cx: 200, cy: 185, r: 118 }).pos;
      loopA = P.map(([x, y]) => Math.atan2(y - 185, x - 200));
    } else {
      P = [[110, 175], [290, 175]]; loopA = [Math.PI, 0]; lb = { '0-1': [200, 157] };
    }
    const cx = P.reduce((s, p) => s + p[0], 0) / n, cy = P.reduce((s, p) => s + p[1], 0) / n;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const k = i + '-' + j; if (lb[k]) continue;
      const mx = (P[i][0] + P[j][0]) / 2, my = (P[i][1] + P[j][1]) / 2;
      const ox = mx - cx, oy = my - cy, L = Math.hypot(ox, oy) || 1;
      lb[k] = [mx + (ox / L) * 16, my + (oy / L) * 16];
    }
    return { P, loopA, lab: lb };
  }
  const loopCenter = (geo, i) => { const a = geo.loopA[i], d = R0 + RL - 6; return [geo.P[i][0] + Math.cos(a) * d, geo.P[i][1] + Math.sin(a) * d]; };
  /** items: [{e, cls, label, labelCls, to (vertice assegnato), hl}] */
  function drawGraph(svg, n, geo, items, o = {}) {
    const gU = DR.el('g', {}, svg), gE = DR.el('g', {}, svg), gV = DR.el('g', {}, svg), gD = DR.el('g', {}, svg), gT = DR.el('g', {}, svg);
    for (const it of items) {
      const e = it.e;
      if (e.type === 'loop') {
        const [x, y] = loopCenter(geo, e.i);
        if (it.hl) DR.el('circle', { cx: x, cy: y, r: RL, class: 'uline' }, gU);
        DR.el('circle', { cx: x, cy: y, r: RL, class: 'loop ' + (it.cls || '') }, gE);
        if (it.label) { const a = geo.loopA[e.i]; DR.text(gT, x + Math.cos(a) * (RL + 15), y + Math.sin(a) * (RL + 13), it.label, 'wl ' + (it.labelCls || 'diag')); }
      } else {
        const [x1, y1] = geo.P[e.i], [x2, y2] = geo.P[e.j];
        if (it.hl) DR.el('line', { x1, y1, x2, y2, class: 'uline' }, gU);
        DR.el('line', { x1, y1, x2, y2, class: 'edge ' + (it.cls || '') }, gE);
        if (it.to !== undefined && it.to !== null) {
          const v = it.to, u = v === e.i ? e.j : e.i;
          const [vx, vy] = geo.P[v], [ux, uy] = geo.P[u]; const L = Math.hypot(ux - vx, uy - vy);
          const d = R0 + 10;
          DR.el('circle', { cx: vx + ((ux - vx) / L) * d, cy: vy + ((uy - vy) / L) * d, r: 6, class: 'adot' }, gD);
        }
        if (it.label) { const [lx, ly] = geo.lab[e.i + '-' + e.j]; DR.text(gT, lx, ly, it.label, 'wl ' + (it.labelCls || 'off')); }
      }
    }
    for (let i = 0; i < n; i++) {
      const v = DR.el('g', { class: 'vtx ' + (o.vcls ? o.vcls(i) || '' : '') }, gV);
      DR.el('circle', { cx: geo.P[i][0], cy: geo.P[i][1], r: R0 }, v);
      DR.text(v, geo.P[i][0], geo.P[i][1], String(i + 1));
    }
  }

  // ------------------------------------------------------------------ grafo bipartito (layout proprio, nodi cliccabili)
  /** left/right: [{id,label,cls}] ; links: [{l,r,cls,label}] ; restituisce mappe posizioni e gruppi. */
  function bip(svg, left, right, links, o = {}) {
    const x1 = o.x1 ?? 80, x2 = o.x2 ?? 330, y0 = o.y0 ?? 44, dy = o.dy ?? 40, w = o.w ?? 96, wr = o.wr ?? 56, h = 30;
    const N = Math.max(left.length, right.length);
    const yl = (k, M) => y0 + k * dy + ((N - M) * dy) / 2;
    const L = new Map(), Rt = new Map();
    left.forEach((a, k) => L.set(a.id, [x1, yl(k, left.length)]));
    right.forEach((a, k) => Rt.set(a.id, [x2, yl(k, right.length)]));
    const gl = DR.el('g', {}, svg), gn = DR.el('g', {}, svg), gt = DR.el('g', {}, svg);
    const linkEls = new Map(), nodeEls = new Map();
    for (const ln of links) {
      const [ax, ay] = L.get(ln.l), [bx, by] = Rt.get(ln.r);
      const g = DR.el('g', { class: 'hitg' }, gl);
      const ln1 = DR.el('line', { x1: ax + w / 2, y1: ay, x2: bx - wr / 2, y2: by, class: 'bp-link ' + (ln.cls || '') }, g);
      if (o.onLink) {
        const hit = DR.el('line', { x1: ax + w / 2, y1: ay, x2: bx - wr / 2, y2: by, class: 'hit' }, g);
        hit.addEventListener('click', () => o.onLink(ln));
        DR.el('title', {}, hit).textContent = ln.title || '';
      }
      linkEls.set(ln.l + '|' + ln.r, ln1);
      if (ln.label) {
        const t = ln.t ?? 0.3;
        DR.text(gt, ax + w / 2 + (bx - wr / 2 - ax - w / 2) * t, ay + (by - ay) * t, ln.label, 'wl ' + (ln.labelCls || 'match'));
      }
    }
    const node = (pt, a, ww) => {
      const g = DR.el('g', { class: 'bp-node ' + (a.cls || '') }, gn);
      DR.el('rect', { x: pt[0] - ww / 2, y: pt[1] - h / 2, width: ww, height: h, rx: 9 }, g);
      DR.text(g, pt[0], pt[1], a.label);
      nodeEls.set(a.id, g);
      if (a.onClick) {
        g.classList.add('click'); g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
        g.setAttribute('aria-label', a.aria || a.label);
        g.addEventListener('click', a.onClick);
        g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); a.onClick(); } });
      }
      return g;
    };
    left.forEach((a) => node(L.get(a.id), a, w));
    right.forEach((a) => node(Rt.get(a.id), a, wr));
    if (o.titles) {
      DR.text(svg, x1, y0 - 30, o.titles[0], 'note', { 'text-anchor': 'middle', 'font-weight': 700 });
      DR.text(svg, x2, y0 - 30, o.titles[1], 'note', { 'text-anchor': 'middle', 'font-weight': 700 });
    }
    return { L, Rt, linkEls, nodeEls, height: y0 + N * dy };
  }

  // ------------------------------------------------------------------ stepper
  function stepper(host, nFrames, render, { delay = 1500 } = {}) {
    host.innerHTML = '';
    const mk = (l, a) => { const b = DR.h('button', 'btn', l, host); b.type = 'button'; b.setAttribute('aria-label', a); return b; };
    const b0 = mk('⏮ Inizio', 'Torna all\'inizio'), bp = mk('◀ Indietro', 'Passo precedente'),
      bn = mk('Avanti ▶', 'Passo successivo'), bplay = mk('▶ Riproduci', 'Riproduci automaticamente');
    bn.classList.add('primary');
    const info = DR.h('span', 'stepinfo', '', host);
    let k = 0, timer = null;
    const stop = () => { if (timer) clearInterval(timer); timer = null; bplay.textContent = '▶ Riproduci'; };
    const go = (x) => {
      k = Math.max(0, Math.min(nFrames - 1, x));
      b0.disabled = bp.disabled = k === 0; bn.disabled = k === nFrames - 1;
      info.textContent = `passo ${k} di ${nFrames - 1}`; render(k);
    };
    b0.onclick = () => { stop(); go(0); }; bp.onclick = () => { stop(); go(k - 1); }; bn.onclick = () => { stop(); go(k + 1); };
    bplay.onclick = () => {
      if (timer) { stop(); return; }
      if (k === nFrames - 1) go(0);
      bplay.textContent = '⏸ Pausa';
      timer = setInterval(() => { if (k >= nFrames - 1) stop(); else go(k + 1); }, reduced ? delay * 1.5 : delay);
    };
    go(0);
    return { go, stop };
  }

  /** Circuito (insieme dipendente minimale) che contiene il primo elemento rifiutato dal greedy. */
  function circuitFromGreedy(G) {
    const n = G.length, gr = BR.greedyPseudoforest(G);
    const rej = gr.steps.find((s) => !s.accepted);
    if (!rej) return null;
    let S = gr.F.concat([rej.el]);
    for (const e of gr.F) {
      const T = S.filter((x) => x.id !== e.id);
      if (!BR.isPseudoforest(n, T)) S = T;
    }
    return S;
  }

  // ================================================================== 1. rappresentazione trasversale
  (function transversalFig() {
    const bHost = $('mt-t-bip'), gHost = $('mt-t-graph'), msg = $('mt-t-msg'), pre = $('mt-t-pre');
    if (!bHost) return;
    let G, n, all, sel, geo;
    const render = () => {
      const F = all.filter((e) => sel.has(e.id));
      const tr = BR.transversal(n, F);
      let badEl = new Set(), badV = new Set();
      if (!tr) {
        const K = BR.components(n, F).find((c) => c.elems.length > c.verts.length);
        if (K) { K.elems.forEach((e) => badEl.add(e.id)); K.verts.forEach((v) => badV.add(v)); }
      }
      const left = all.map((e) => ({
        id: e.id, label: `${lab(e)} · ${fmt(e.w)}`,
        cls: (e.type === 'loop' ? 'loop' : 'edge') + ' ' + (sel.has(e.id) ? (badEl.has(e.id) ? 'in bad' : 'in') : 'out'),
        onClick: () => { if (sel.has(e.id)) sel.delete(e.id); else sel.add(e.id); render(); },
        aria: `${lab(e)}: ${sel.has(e.id) ? 'nell\'insieme' : 'fuori'}; clic per cambiare`,
      }));
      const right = [...Array(n).keys()].map((v) => ({ id: 'v' + v, label: String(v + 1), cls: 'vert' + (badV.has(v) ? ' vbad' : (tr && [...tr.values()].includes(v) ? ' used' : '')) }));
      const links = [];
      for (const e of all) for (const v of (e.type === 'loop' ? [e.i] : [e.i, e.j])) {
        const on = tr && tr.get(e.id) === v;
        links.push({ l: e.id, r: 'v' + v, cls: (e.type === 'loop' ? 'loopl ' : '') + (on ? 'on' : (badEl.has(e.id) ? 'bad' : '')) });
      }
      const Hh = 56 + Math.max(all.length, n) * 40;
      const s = DR.svg(bHost, 420, Hh, 'Grafo bipartito elementi-vertici con l\'assegnazione trasversale');
      bip(s, left, right, links, { x1: 70, x2: 345, titles: ['elementi · peso', 'vertici'] });
      // grafo
      const sg = DR.svg(gHost, W, H, `Insieme selezionato con ${F.length} elementi`);
      drawGraph(sg, n, geo, all.map((e) => {
        const inn = sel.has(e.id);
        return { e, cls: inn ? (badEl.has(e.id) ? 'bad' : 'acc') : 'ghost', to: inn && tr ? tr.get(e.id) : null,
          label: inn ? fmt(e.w) : '', labelCls: e.type === 'loop' ? 'diag' : 'off' };
      }), { vcls: (v) => (badV.has(v) ? 'hl' : '') });
      // messaggio
      if (!F.length) msg.innerHTML = 'Insieme vuoto: clicca gli elementi a sinistra per aggiungerli.';
      else if (tr) msg.innerHTML = `<span class="ok">✓ Indipendente.</span> Ogni elemento occupa un vertice diverso: ${F.map((e) => `$${elTex(e)}\\to ${tr.get(e.id) + 1}$`).join(', ')}. È una pseudoforesta di peso $${fmt(F.reduce((a, e) => a + e.w, 0))}$.`;
      else {
        const S = F.filter((e) => badEl.has(e.id)); const NV = [...badV].sort((a, b) => a - b);
        msg.innerHTML = `<span class="no">✗ Non indipendente.</span> Hall è violato: i $|S|=${S.length}$ elementi $S=\\{${S.map(elTex).join(',')}\\}$ hanno solo $|N(S)|=${NV.length}$ estremi, $N(S)=${setTex(NV)}$. Nella stessa componente ci sono due cicli.`;
      }
      DR.texAll(msg);
    };
    const load = (ex) => {
      G = ex.G; n = G.length; all = BR.elements(G); geo = geometry(n);
      const gr = BR.greedyPseudoforest(G), circ = circuitFromGreedy(G);
      pre.innerHTML = '';
      const presets = [{ label: 'pseudoforesta del greedy $F^*$', value: 'g' }];
      if (circ) presets.push({ label: 'un insieme non indipendente', value: 'c' });
      presets.push({ label: 'svuota', value: 'e' });
      const apply = (v) => { sel = new Set(v === 'g' ? gr.F.map((e) => e.id) : v === 'c' ? circ.map((e) => e.id) : []); render(); };
      DR.toggle(pre, presets, apply, 'g'); DR.texAll(pre);
      apply('g');
    };
    exBar($('mt-t-ex'), load);
  })();

  // ================================================================== 2. scambi loop → arco, con la barra
  (function exchangeFig() {
    const gHost = $('mt-x-graph'), barHost = $('mt-x-bar'), msg = $('mt-x-msg'), ctl = $('mt-x-ctl');
    if (!gHost) return;
    let cur = null;
    const load = (ex) => {
      const G = ex.G, n = G.length, geo = geometry(n), g = BR.gamma(G);
      const mm = BR.maxGainMatching(G), gr = BR.greedyPseudoforest(G);
      const frames = [];
      for (let k = 0; k <= mm.pairs.length; k++) frames.push(mm.pairs.slice(0, k));
      const scaleMax = Math.max(gr.value, g + mm.value, EPS);
      const render = (k) => {
        const pairs = frames[k]; const pf = BR.pseudoforestFromMatching(G, pairs);
        const last = k > 0 ? pairs[k - 1] : null;
        const used = new Set(pairs.map((p) => p.v));
        const items = [];
        for (let v = 0; v < n; v++) {
          const e = { id: 'l' + (v + 1), type: 'loop', i: v, j: v, w: G[v][v] };
          items.push({ e, cls: used.has(v) ? 'ghost' : 'acc', label: used.has(v) ? '' : fmt(G[v][v]), labelCls: 'diag', hl: last && last.v === v && false });
        }
        for (const p of pairs) {
          const e = { id: 'e' + (p.i + 1) + (p.j + 1), type: 'edge', i: p.i, j: p.j, w: G[p.i][p.j] };
          items.push({ e, cls: 'acc', to: p.v, label: fmt(e.w), hl: last === p });
        }
        const s = DR.svg(gHost, W, H, `Pseudoforesta dopo ${k} scambi, peso ${fmt(pf.value)}`);
        drawGraph(s, n, geo, items, { vcls: (v) => (last && last.v === v ? 'hl' : '') });
        // barra: per ogni vertice il suo occupante (Γ_vv in ambra, più il guadagno in arancio)
        const BW = 640, X0 = 150, SC = (BW - X0 - 40) / scaleMax;
        const sb = DR.svg(barHost, BW, 150, `Bilancia: gamma più guadagni uguale a w(F*)`);
        const row = (y, label, segs, total) => {
          DR.text(sb, 0, y + 15, label, 'bar-l');
          let x = X0;
          for (const sg of segs) {
            const wpx = sg.w * SC; if (wpx < 0.5) continue;
            DR.el('rect', { x, y, width: wpx, height: 30, rx: 4, class: sg.cls }, sb);
            if (wpx > 34) DR.text(sb, x + wpx / 2, y + 15, sg.t, 'seg-t');
            x += wpx;
          }
          DR.text(sb, x + 8, y + 15, '= ' + fmt(total), 'bar-v');
          return x;
        };
        const segA = [];
        for (let v = 0; v < n; v++) {
          segA.push({ w: G[v][v], cls: 'seg-l', t: 'ℓ' + (v + 1) });
          const p = pairs.find((q) => q.v === v);
          if (p) segA.push({ w: p.gain, cls: 'seg-g', t: '+' + fmt(p.gain) });
        }
        const sumG = pairs.reduce((a, p) => a + p.gain, 0);
        row(22, 'γ + guadagni', segA, g + sumG);
        const segB = gr.F.map((e) => ({ w: e.w, cls: e.type === 'loop' ? 'seg-l' : 'seg-e', t: lab(e) }));
        row(84, 'w(F*) greedy', segB, gr.value);
        const xe = X0 + gr.value * SC;
        DR.el('line', { x1: xe, y1: 10, x2: xe, y2: 124, class: 'eqline' }, sb);
        // messaggio
        let m;
        if (k === 0) m = `Tutti i loop: ogni vertice è occupato dal proprio loop. Peso $\\gamma=${fmt(g)}$.`;
        else {
          m = `Scambio: $\\ell_{${last.v + 1}}$ esce, entra $\\{${last.i + 1},${last.j + 1}\\}$ assegnato a ${last.v + 1}. `
            + `Guadagno $\\Gamma_{${last.i + 1}${last.j + 1}}-\\Gamma_{${last.v + 1}${last.v + 1}}=${fmt(G[last.i][last.j])}-${fmt(G[last.v][last.v])}=${fmt(last.gain)}$. `;
          m += k === frames.length - 1
            ? `Fine: $\\gamma+M=${fmt(g)}+${fmt(mm.value)}=${fmt(pf.value)}=w(F^*)$ ${Math.abs(pf.value - gr.value) < 1e-9 ? '<span class="ok">✓</span>' : '<span class="no">✗</span>'}.`
            : `Peso attuale $${fmt(pf.value)}$.`;
        }
        if (!mm.pairs.length) m += ' Nessun guadagno positivo: $M=0$.';
        msg.innerHTML = m; DR.texAll(msg);
      };
      if (cur) cur.stop();
      cur = stepper(ctl, frames.length, render, { delay: 1800 });
    };
    exBar($('mt-x-ex'), load);
  })();

  // ================================================================== 3. i due matching
  (function twoMatchings() {
    const trHost = $('mt-m-tr'), gHost = $('mt-m-gain'), msg = $('mt-m-msg'), pre = $('mt-m-pre');
    if (!trHost) return;
    /** Tutti i matching dei guadagni ottimi che usano solo guadagni positivi (n piccolo: enumerazione). */
    function optimalMatchings(G) {
      const n = G.length, M = BR.maxGainMatching(G).value;
      const pairs = BR.offPairs(n); const gl = BR.gains(G);
      const out = [];
      const rec = (k, used, chosen, val) => {
        if (k === pairs.length) { if (Math.abs(val - M) < 1e-9) out.push(chosen.slice()); return; }
        rec(k + 1, used, chosen, val);
        const [i, j] = pairs[k];
        for (const g of gl.filter((x) => x.i === i && x.j === j && x.gain > EPS && !(used & (1 << x.v)))) {
          chosen.push(g); rec(k + 1, used | (1 << g.v), chosen, val + g.gain); chosen.pop();
        }
      };
      rec(0, 0, [], 0);
      return out;
    }
    let G, n, pairs, opts, gr, mm, preBtns;
    const render = () => {
      const g = BR.gamma(G), pf = BR.pseudoforestFromMatching(G, pairs);
      const to = new Map(pf.F.map((e) => [e.id, e.to]));
      // (1) matching trasversale
      const all = BR.elements(G);
      const left = all.map((e) => ({ id: e.id, label: `${lab(e)} · ${fmt(e.w)}`, cls: (e.type === 'loop' ? 'loop' : 'edge') + (to.has(e.id) ? ' in' : ' out') }));
      const right = [...Array(n).keys()].map((v) => ({ id: 'v' + v, label: String(v + 1), cls: 'vert used' }));
      const links = [];
      for (const e of all) for (const v of (e.type === 'loop' ? [e.i] : [e.i, e.j]))
        links.push({ l: e.id, r: 'v' + v, cls: (e.type === 'loop' ? 'loopl ' : '') + (to.get(e.id) === v ? 'on' : '') });
      const s1 = DR.svg(trHost, 400, 56 + all.length * 40, 'Matching trasversale: elementi con il loro peso assegnati ai vertici');
      bip(s1, left, right, links, { x1: 70, x2: 330, titles: ['elementi · peso', 'vertici'] });
      // (2) matching dei guadagni
      const edges = all.filter((e) => e.type === 'edge');
      const gl = BR.gains(G);
      const chosen = (i, j, v) => pairs.some((p) => p.i === i && p.j === j && p.v === v);
      const left2 = edges.map((e) => ({ id: e.id, label: lab(e), cls: 'edge' + (pairs.some((p) => p.i === e.i && p.j === e.j) ? ' in' : '') }));
      const usedV = new Set(pairs.map((p) => p.v));
      const right2 = [...Array(n).keys()].map((v) => ({ id: 'v' + v, label: String(v + 1), cls: 'vert' + (usedV.has(v) ? ' used' : '') }));
      const links2 = gl.map((x) => {
        const id = 'e' + (x.i + 1) + (x.j + 1); const on = chosen(x.i, x.j, x.v);
        return { l: id, r: 'v' + x.v, g: x, cls: on ? 'on' : (x.gain > EPS ? 'pos' : 'neg'),
          label: x.gain > EPS || on ? fmt(x.gain) : '', labelCls: x.gain > EPS ? 'match' : 'muted', t: 0.3,
          title: `{${x.i + 1},${x.j + 1}} → ${x.v + 1}: Γ${x.i + 1}${x.j + 1} − Γ${x.v + 1}${x.v + 1} = ${fmt(x.gain)}` };
      });
      const s2 = DR.svg(gHost, 400, 56 + Math.max(edges.length, n) * 46, 'Matching dei guadagni fra archi e vertici; clic su un collegamento per sceglierlo');
      bip(s2, left2, right2, links2, { x1: 70, x2: 330, dy: 46, w: 72, titles: ['archi', 'vertici'],
        onLink: (ln) => {
          const x = ln.g;
          if (chosen(x.i, x.j, x.v)) pairs = pairs.filter((p) => !(p.i === x.i && p.j === x.j && p.v === x.v));
          else pairs = pairs.filter((p) => !(p.i === x.i && p.j === x.j) && p.v !== x.v).concat([x]);
          preBtns.forEach((b) => b.classList.remove('on'));
          render();
        } });
      // messaggio
      const raw = pairs.reduce((a, p) => a + p.gain, 0);
      const neg = pairs.filter((p) => p.gain <= EPS);
      const isOpt = Math.abs(raw - mm.value) < 1e-9 && !neg.length;
      let m = `Pseudoforesta (1): peso $w=${fmt(pf.value)}=\\gamma+\\sum\\text{guadagni}=${fmt(g)}+${fmt(raw)}$.`;
      m += isOpt ? ` <span class="ok">Ottimo:</span> $M=${fmt(mm.value)}$ e $w=w(F^*)=${fmt(gr.value)}$.`
        : ` L'ottimo è $\\gamma+M=${fmt(g)}+${fmt(mm.value)}=${fmt(gr.value)}=w(F^*)$.`;
      if (neg.length) m += ` <span class="no">Attenzione:</span> ${neg.map((p) => `$\\{${p.i + 1},${p.j + 1}\\}\\to ${p.v + 1}$ guadagna $${fmt(p.gain)}$`).join(', ')}: meglio tenere il loop.`;
      msg.innerHTML = m; DR.texAll(msg);
    };
    const load = (ex) => {
      G = ex.G; n = G.length; gr = BR.greedyPseudoforest(G); mm = BR.maxGainMatching(G);
      opts = optimalMatchings(G);
      pre.innerHTML = '';
      const items = opts.map((o, k) => ({ label: (opts.length > 1 ? `matching ottimo ${k + 1}: ` : 'matching ottimo: ')
        + (o.length ? o.map((p) => `{${p.i + 1},${p.j + 1}}→${p.v + 1}`).join(', ') : 'vuoto'), value: k }));
      items.push({ label: 'nessuno scambio', value: -1 });
      preBtns = DR.toggle(pre, items, (k) => { pairs = k < 0 ? [] : opts[k].slice(); render(); }, 0);
      pairs = opts.length ? opts[0].slice() : [];
      render();
    };
    exBar($('mt-m-ex'), load);
  })();

  // ================================================================== 4. verifica sugli esempi
  (function scale() {
    const host = $('mt-scale'); if (!host) return;
    let h = '<p class="small muted">Verifica numerica sugli esempi del capitolo (calcolata con <code>BR.chain</code>):</p><table class="t small"><thead><tr><th>esempio</th><th>$\\gamma$</th><th>$M$</th><th>$\\gamma+M$</th><th>$w(F^*)$</th><th>$\\val(R)$</th><th></th></tr></thead><tbody>';
    for (const ex of EX) {
      const c = BR.chain(ex.G, { withEfull: false });
      const ok = Math.abs(c.gamma + c.M - c.pseudoforest) < 1e-9 && Math.abs(c.valR - c.pseudoforest) < 1e-9;
      h += `<tr><td>${ex.label}</td><td>${fmt(c.gamma)}</td><td>${fmt(c.M)}</td><td>${fmt(c.gamma + c.M)}</td><td>${fmt(c.pseudoforest)}</td><td>${fmt(c.valR)}</td><td>${ok ? '<span class="ok">✓</span>' : '<span class="no">✗</span>'}</td></tr>`;
    }
    host.innerHTML = h + '</tbody></table>';
    DR.texAll(host);
  })();
})();
