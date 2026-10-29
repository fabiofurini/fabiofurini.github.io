/* ch-giovanni.js — Chapter F: the AWCD matching bound (dual certificates of Stage A). English version. */
(() => {
  const sec = document.getElementById('giovanni');
  if (!sec) return;
  const $ = (id) => sec.querySelector('#' + id);
  const { h } = DR;

  // ---------------------------------------------------------------- stile locale (solo per questa sezione)
  const css = `
  #giovanni .d .cell.yp rect { fill: var(--match-bg); stroke: var(--match); stroke-width: 2.5; }
  #giovanni .d .cell.yn rect { fill: var(--diag-bg); stroke: var(--diag); stroke-width: 2.5; }
  #giovanni .d .cell.yn.offneg rect { fill: #e7ebf3; stroke: #4a5568; }
  #giovanni .d .cell.yz rect { fill: #fff; stroke: #e2e6ef; stroke-width: 1.5; }
  #giovanni .d .cell.yz text { fill: #a0a8b8; font-weight: 500; }
  #giovanni .d .cell.ybad rect { fill: var(--under-bg); stroke: var(--under); stroke-width: 3.5; }
  #giovanni .d .cell.ybad text { fill: var(--under); font-weight: 800; }
  #giovanni .d .cell.inU rect { stroke: var(--brand-2); stroke-width: 3.5; }
  #giovanni .d .cell.outU { opacity: .38; }
  #giovanni .d .ylab { font: 800 15px var(--mono); paint-order: stroke; stroke: #fff; stroke-width: 5px; text-anchor: middle; dominant-baseline: central; }
  #giovanni .d .ylab.p { fill: var(--match); } #giovanni .d .ylab.n { fill: var(--diag); }
  #giovanni .d .vtx.inU circle { fill: #e6eefb; stroke: var(--brand-2); stroke-width: 3.4; }
  #giovanni .d .vtx { cursor: pointer; }
  #giovanni .d .edge.inC { stroke-width: 4.2; }
  #giovanni .d .edge.outC { opacity: .16; stroke-width: 2; }
  #giovanni .d .edge.cplus { stroke: var(--match); }
  #giovanni .d .edge.cminus { stroke: var(--diag); stroke-dasharray: 8 5; }
  #giovanni .d .edge.cminus.inC { stroke-dasharray: none; }
  #giovanni .d .hull { fill: rgba(47,94,168,.08); stroke: rgba(47,94,168,.45); stroke-width: 1.5; stroke-dasharray: 5 4; }
  #giovanni .d .bp-link.neg { stroke-dasharray: 4 5; }
  #giovanni .d .bp-link.bad { stroke: var(--under); stroke-width: 4; }
  #giovanni .d .bp-node.bad rect { stroke: var(--under); stroke-width: 3; fill: var(--under-bg); }
  #giovanni .d .hit { stroke: transparent; stroke-width: 18; cursor: pointer; }
  #giovanni .d .hit:hover + .hov, #giovanni .d .hov { pointer-events: none; }
  #giovanni .d .bp-node text { stroke: none; }
  #giovanni #gv2-y svg.d { max-width: 290px; margin: 0 auto; }
  #giovanni #gv1-mat svg.d { max-width: 320px; margin: 0 auto; }
  #giovanni .gv-small svg.d { max-width: 250px; margin: 0 auto; }
  #giovanni .gv-sw-n, #giovanni .gv-sw-d { display: inline-block; width: 14px; height: 14px; border-radius: 4px; vertical-align: -2px; margin-right: 6px; }
  #giovanni .gv-sw-n { background: #e7ebf3; border: 2px solid #4a5568; }
  #giovanni .gv-sw-d { height: 0; width: 22px; border-top: 2px dashed #c9d1df; border-radius: 0; vertical-align: 4px; }
  #giovanni .gv-sw-u { display: inline-block; width: 14px; height: 14px; border-radius: 4px; vertical-align: -2px; margin-right: 6px; border: 3px solid var(--brand-2); background: #e6eefb; }
  #giovanni .gv-sum { font-size: 15.5px; }
  #giovanni .gv-big { font: 700 26px var(--mono); }
  #giovanni table.gv-tt td, #giovanni table.gv-tt th { text-align: center; padding: 5px 8px; }
  #giovanni table.gv-tt tr.cur td { background: #fff4d6; font-weight: 700; }
  #giovanni .gv-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  #giovanni .gv-chip { font: 600 13.5px var(--mono); border-radius: 8px; padding: 4px 8px; border: 1.5px solid var(--line-2); background: #fff; cursor: pointer; color: var(--ink); }
  #giovanni .gv-chip b { margin-left: 6px; }
  #giovanni .gv-chip.z b { color: var(--ink-3); } #giovanni .gv-chip.m b { color: var(--diag); }
  #giovanni .gv-chip.cur { border-color: var(--brand-2); background: #e6eefb; }
  #giovanni .gv-status { margin: 4px 0 0; font-size: 15px; text-align: center; }
  #giovanni .gv-val { margin: 6px 0 0; text-align: center; font-size: 19px; }
  #giovanni .gv-tab { max-height: 340px; overflow: auto; }
  #giovanni .gv-tab table.t td, #giovanni .gv-tab table.t th { padding: 4px 9px; font-size: 14.5px; }
  #giovanni .gv-tab td.num { font-family: var(--mono); text-align: right; }
  #giovanni .kpi.hl { border-color: var(--match); background: #fff8f2; } #giovanni .kpi.hl .v { color: var(--match); }
  #giovanni .gv-btnrow .btn.warn { color: var(--under); }
  `;
  const st = document.createElement('style'); st.textContent = css; sec.appendChild(st);

  // ---------------------------------------------------------------- utilità
  const sgn = (x) => (Math.abs(x) < 1e-9 ? '0' : x > 0 ? '+' + BR.fmt(x) : '−' + BR.fmt(-x));
  const minus = (s) => String(s).replace(/^-/, '−');
  /** Matrice di y (triangolo superiore), colorata per segno. extra(i,j) → classi aggiuntive. */
  function yMatrix(svg, y, { x = 30, yy = 30, cell = 52, extra = () => '' } = {}) {
    const n = y.length;
    return DR.matrix(svg, y, {
      x, y: yy, cell, upperOnly: true,
      value: (i, j) => (j < i ? '' : sgn(y[i][j])),
      cls: (i, j) => {
        const v = y[i][j]; let c = v > 1e-9 ? 'yp' : v < -1e-9 ? 'yn' + (i !== j ? ' offneg' : '') : 'yz';
        if (Math.abs(v) > 1 + 1e-9) c += ' ybad';
        return c + ' ' + extra(i, j);
      },
    });
  }
  const pairLabel = (i, j) => `{${i + 1},${j + 1}}`;

  // ================================================================ Figura 1: un certificato e una clique
  (() => {
    const n = 4;
    const S = { a: 0, b: 1, v: 0, U: BR.toMask([0, 1]) };
    const pos = [[60, 175], [160, 60], [340, 60], [440, 175]];
    const root = [250, 305];

    const arcBox = $('gv1-arc'), ownBox = $('gv1-own');
    const arcs = BR.offPairs(n);
    DR.toggle(arcBox, arcs.map(([i, j]) => ({ label: pairLabel(i, j), value: i + ',' + j })), (val) => {
      const [a, b] = val.split(',').map(Number); S.a = a; S.b = b; S.v = a; buildOwn(); draw();
    }, '0,1');
    function buildOwn() {
      DR.toggle(ownBox, [S.a, S.b].map((v) => ({ label: 'v = ' + (v + 1), value: v })), (v) => { S.v = v; draw(); }, S.v);
    }
    buildOwn();
    function toggleU(k) {
      const U = S.U ^ (1 << k);
      if (U === 0) return; // U ≠ ∅
      S.U = U; draw();
    }

    function yOf() {
      const y = BR.zeros(n); y[S.a][S.b] = y[S.b][S.a] = 1; y[S.v][S.v] = -1; return y;
    }

    function draw() {
      const y = yOf(); const U = S.U; const inU = (i) => BR.has(U, i);

      // --- grafo bordato
      const svg = DR.svg($('gv1-graph'), 500, 362, `Bordered graph with 4 vertices and root r; clique C = {r} ∪ ${BR.setLabel(U)}; y = +1 on edge {${S.a + 1},${S.b + 1}} and −1 on root edge (r,${S.v + 1}).`);
      const edges = arcs.map(([i, j]) => {
        const inC = inU(i) && inU(j); const cert = i === S.a && j === S.b;
        const bend = 0;
        return { i, j, bend, cls: (inC ? 'inC' : 'outC') + (cert ? ' cplus' : ''),
          label: cert ? '' : '', labelCls: 'off' };
      });
      const rootEdges = [...Array(n).keys()].map((v) => ({ v, cls: (inU(v) ? 'inC' : 'outC') + (v === S.v ? ' cminus' : ''), label: '' }));
      const gr = DR.graph(svg, n, { pos, edges, root, rootEdges, vcls: (i) => (inU(i) ? 'inU' : '') });
      gr.vEls.forEach((v, k) => {
        v.setAttribute('role', 'button'); v.setAttribute('tabindex', '0');
        v.setAttribute('aria-label', `vertex ${k + 1}: ${inU(k) ? 'remove from' : 'add to'} U`);
        v.addEventListener('click', () => toggleU(k));
        v.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggleU(k); } });
      });
      // etichette dei valori di y
      const [x1, y1] = pos[S.a], [x2, y2] = pos[S.b];
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      let nx = -(y2 - y1), ny = x2 - x1; const nl = Math.hypot(nx, ny); nx /= nl; ny /= nl;
      if (nx * (mx - root[0]) + ny * (my - root[1]) < 0) { nx = -nx; ny = -ny; } // verso l'esterno
      DR.text(svg, mx + nx * 15, my + ny * 15, '+1', 'ylab p');
      const [rx, ry] = root, [vx, vy] = pos[S.v];
      DR.text(svg, rx + (vx - rx) * 0.5 + (vx < rx ? -16 : 16), ry + (vy - ry) * 0.5, '−1', 'ylab n');
      DR.text(svg, 250, 352, 'solid lines: edges of the clique C = {r} ∪ U', 'note', { 'text-anchor': 'middle' });

      // --- matrice
      const msvg = DR.svg($('gv1-mat'), 300, 280, `Matrix of y (upper triangle), highlighting the cells (i,j), i ≤ j, with i,j in ${BR.setLabel(U)}.`);
      yMatrix(msvg, y, { x: 40, yy: 40, cell: 56, extra: (i, j) => (inU(i) && inU(j) ? 'inU' : 'outU') });

      // --- somma sulla clique (una riga) + verifica su tutti i sottoinsiemi
      const o = S.v === S.a ? S.b : S.a; const vIn = inU(S.v), oIn = inU(o);
      const tPlus = vIn && oIn ? 1 : 0, tMin = vIn ? 1 : 0;
      const chk = BR.checkDual(BR.zeros(n), y);
      const mx2 = Math.max(...chk.rows.map((r) => r.sum));
      const box = $('gv1-sum');
      const Ul = BR.toList(U).map((i) => i + 1).join(',');
      box.innerHTML = `<div class="eq">$U=\\{${Ul}\\}:\\quad \\sum_{e\\in E(C)}y_e=\\underbrace{[\\,${S.a + 1},${S.b + 1}\\in U\\,]}_{${tPlus}}-\\underbrace{[\\,${S.v + 1}\\in U\\,]}_{${tMin}}=${tPlus - tMin < 0 ? '-1' : '0'}\\le 0$</div>
        <p class="small muted" style="text-align:center">Over all ${chk.rows.length} subsets $U$, the maximum of the sum is <b class="ok">${minus(BR.fmt(mx2))}</b>.</p>`;
      DR.texAll(box);
    }
    draw();
  })();

  // ================================================================ esempi
  const EX = {
    '2': { label: '2×2', G: [[1, 3], [3, 2]] },
    '3': { label: '3×3', G: [[0, 1, 2], [1, 1, 0], [2, 0, 1]] },
    'tri': { label: 'triangle, zero diagonal', G: [[0, 1, 1], [1, 0, 1], [1, 1, 0]] },
  };

  // ================================================================ Figura 2: costruttore di certificati
  (() => {
    const S = { key: '3', sel: [] }; // sel: [{i,j,v}] (con ripetizioni ammesse per mostrare le violazioni)
    let G, n, chainData;
    const exBox = $('gv2-ex'), act = $('gv2-act');
    act.classList.add('gv-btnrow');
    DR.toggle(exBox, Object.entries(EX).map(([k, e]) => ({ label: e.label, value: k })), (k) => { S.key = k; load(); S.sel = optimal(); draw(); }, S.key);

    const mk = (label, fn, cls = '') => { const b = h('button', 'btn ' + cls, label, act); b.type = 'button'; b.addEventListener('click', fn); return b; };
    mk('Optimal matching ($M$)', () => { S.sel = optimal(); draw(); }, 'primary');
    mk('Clear', () => { S.sel = []; draw(); });
    const bArc = mk('Try: edge reused', () => {
      const [i, j] = BR.offPairs(n).reduce((b, e) => (G[e[0]][e[1]] > G[b[0]][b[1]] ? e : b));
      S.sel = [{ i, j, v: i }, { i, j, v: j }]; draw();
    }, 'warn');
    const bVert = mk('Try: vertex reused', () => {
      // il vertice v e due archi che lo contengono, con guadagno complessivo massimo
      let best = null;
      for (let v = 0; v < n; v++) {
        const inc = BR.offPairs(n).filter(([i, j]) => i === v || j === v).sort((a, b) => G[b[0]][b[1]] - G[a[0]][a[1]]);
        if (inc.length >= 2) { const s = G[inc[0][0]][inc[0][1]] + G[inc[1][0]][inc[1][1]] - 2 * G[v][v]; if (!best || s > best.s) best = { s, v, e: inc.slice(0, 2) }; }
      }
      if (best) { S.sel = best.e.map(([i, j]) => ({ i, j, v: best.v })); draw(); }
    }, 'warn');
    DR.texAll(act);

    function load() { G = EX[S.key].G; n = G.length; chainData = BR.chain(G); }
    const optimal = () => chainData.matching.pairs.map(({ i, j, v }) => ({ i, j, v }));
    const key = (p) => `${p.i}-${p.j}|${p.v}`;

    function toggleLink(i, j, v) {
      const k = key({ i, j, v }); const idx = S.sel.findIndex((p) => key(p) === k);
      if (idx >= 0) S.sel.splice(idx, 1); else S.sel.push({ i, j, v });
      draw();
    }

    function draw() {
      bVert.disabled = n < 3;
      const y = BR.matchingCertificate(G, S.sel);
      const chk = BR.checkDual(G, y);
      const arcUse = new Map(), vUse = new Map();
      for (const p of S.sel) { arcUse.set(p.i + '-' + p.j, (arcUse.get(p.i + '-' + p.j) || 0) + 1); vUse.set(p.v, (vUse.get(p.v) || 0) + 1); }
      const selKeys = new Set(S.sel.map(key));

      // --- grafo bipartito
      const pairs = BR.offPairs(n);
      const left = pairs.map(([i, j]) => ({ id: i + '-' + j, label: pairLabel(i, j), cls: 'edge' + ((arcUse.get(i + '-' + j) || 0) > 1 ? ' bad' : '') }));
      const right = [...Array(n).keys()].map((v) => ({ id: 'v' + v, label: 'vertex ' + (v + 1), cls: 'vert' + ((vUse.get(v) || 0) > 1 ? ' bad' : '') }));
      const links = [];
      for (const [i, j] of pairs) for (const v of [i, j]) {
        const g = G[i][j] - G[v][v]; const on = selKeys.has(key({ i, j, v }));
        const bad = on && ((arcUse.get(i + '-' + j) || 0) > 1 || (vUse.get(v) || 0) > 1);
        links.push({ l: i + '-' + j, r: 'v' + v, cls: (on ? (bad ? 'bad' : 'on') : '') + (g <= 1e-9 ? ' neg' : ''), label: sgn(g), labelCls: g > 1e-9 ? 'match' : 'muted', t: v === i ? 0.22 : 0.42, _i: i, _j: j, _v: v });
      }
      const rows = Math.max(left.length, right.length);
      const H = 60 + rows * 54;
      const svg = DR.svg($('gv2-bip'), 400, H, `Edge–vertex bipartite graph with gains; chosen pairs: ${S.sel.map((p) => pairLabel(p.i, p.j) + '→' + (p.v + 1)).join(', ') || 'none'}.`);
      const bp = DR.bipartite(svg, left, right, links, { x1: 60, x2: 340, y0: 52, dy: 54, w: 92, h: 34, titles: ['edges {i,j}', 'vertices v'] });
      // linee di aggancio larghe e trasparenti per il clic
      const hitG = DR.el('g', {}, svg);
      for (const ln of links) {
        const [ax, ay] = bp.L.get(ln.l), [bx, by] = bp.Rt.get(ln.r);
        const hl = DR.el('line', { x1: ax + 46, y1: ay, x2: bx - 46, y2: by, class: 'hit', tabindex: 0, role: 'button',
          'aria-label': `pair: edge ${pairLabel(ln._i, ln._j)} to vertex ${ln._v + 1}` }, hitG);
        hl.addEventListener('click', () => toggleLink(ln._i, ln._j, ln._v));
        hl.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggleLink(ln._i, ln._j, ln._v); } });
      }

      // --- matrice y
      const cs = n === 2 ? 66 : 58;
      const msvg = DR.svg($('gv2-y'), 60 + n * cs + 20, 60 + n * cs + 10, 'Matrix of the certificate y in the upper triangle');
      yMatrix(msvg, y, { x: 44, yy: 40, cell: cs });
      const bx = $('gv2-box');
      const bad = [];
      for (let i = 0; i < n; i++) for (let j = i; j < n; j++) if (Math.abs(y[i][j]) > 1 + 1e-9) bad.push({ i, j, v: y[i][j] });
      let html = `<p class="gv-val">$w^\\top y=${minus(BR.fmt(chk.value))}$</p>`;
      if (bad.length) {
        const b0 = bad[0];
        html += `<p class="gv-status"><span class="no">Box violated:</span> ` + (b0.i === b0.j
          ? `$y_{r${b0.i + 1}}=${b0.v}<-1$ (vertex ${b0.i + 1} reused).`
          : `$y_{${b0.i + 1}${b0.j + 1}}=${b0.v}>1$ (edge ${pairLabel(b0.i, b0.j)} reused).`) + ' No bound is guaranteed.</p>';
      } else if (Math.abs(chk.value - chainData.M) < 1e-9) {
        html += `<p class="gv-status"><span class="ok">Feasible, and optimal within the family:</span> $w^\\top y=M$.</p>`;
      } else {
        html += `<p class="gv-status"><span class="ok">Feasible.</span> The best in the family is worth $M=${BR.fmt(chainData.M)}$.</p>`;
      }
      bx.innerHTML = html; DR.texAll(bx);

      // --- tabella di tutti i vincoli di clique (dentro un <details>)
      const tab = $('gv2-tab'); tab.innerHTML = '';
      const wrap = h('div', 'gv-tab', '', tab);
      wrap.innerHTML = `<table class="t"><thead><tr><th>$U$</th><th style="text-align:right">$\\sum_{i\\le j\\in U}y_{ij}$</th><th></th></tr></thead><tbody>` +
        chk.rows.map((r) => `<tr><td class="mono">${BR.setLabel(r.U)}</td><td class="num">${minus(BR.fmt(r.sum))}</td><td>${r.ok ? '<span class="ok">≤ 0 ✓</span>' : '<span class="no">✗</span>'}</td></tr>`).join('') + '</tbody></table>';
      DR.texAll(tab);
    }
    load(); S.sel = optimal(); draw();
  })();

  // ================================================================ Figura 3: famiglia ≠ duale completo
  (() => {
    const G = EX['3'].G; const n = 3;
    const ch = BR.chain(G);
    const yM = BR.matchingCertificate(G, ch.matching.pairs);
    const yF = BR.zeros(n);
    const setY = (i, j, v) => { yF[i][j] = yF[j][i] = v; };
    setY(0, 0, -1); setY(0, 1, 1); setY(0, 2, 1); setY(1, 2, -1);
    const cM = BR.checkDual(G, yM), cF = BR.checkDual(G, yF);
    const draw = (box, y, chk, title) => {
      const svg = DR.svg(box, 250, 236, title);
      yMatrix(svg, y, { x: 40, yy: 36, cell: 54 });
      DR.text(svg, 121, 222, `value ${BR.fmt(chk.value)}  ·  ${chk.ok ? 'feasible ✓' : 'infeasible'}`, 'note', { 'text-anchor': 'middle', 'font-weight': 700 });
    };
    draw($('gv3-m'), yM, cM, 'Matching certificate on the 3×3: y11 = −1, y13 = +1; value 2');
    draw($('gv3-f'), yF, cF, 'Optimal certificate of (D_A) on the 3×3: y11 = −1, y12 = y13 = +1, y23 = −1; value 3');
    const tb = $('gv3-tab');
    tb.innerHTML = `<table class="t"><thead><tr><th>$U$</th>${cM.rows.map((r) => `<th class="mono">${BR.setLabel(r.U)}</th>`).join('')}<th>value</th></tr></thead><tbody>
      <tr><td>matching</td>${cM.rows.map((r) => `<td class="mono">${minus(BR.fmt(r.sum))}</td>`).join('')}<td class="mono"><b>${BR.fmt(cM.value)}</b> = $M$</td></tr>
      <tr><td>full dual</td>${cF.rows.map((r) => `<td class="mono">${minus(BR.fmt(r.sum))}</td>`).join('')}<td class="mono"><b>${BR.fmt(cF.value)}</b> = $\\Efull$</td></tr></tbody></table>
      <p class="small">All $7$ clique sums are $\\le 0$ in both cases (<code>BR.checkDual</code>: ${cM.ok && cF.ok ? '<span class="ok">both feasible</span>' : '<span class="no">error</span>'}); the value of the full dual, ${BR.fmt(cF.value)}, equals $\\Efull(\\Gamma)=${BR.fmt(ch.efull.value)}$ computed from the primal, and exceeds the matching bound $M=${BR.fmt(ch.M)}$.</p>`;
    tb.style.overflowX = 'auto';
    DR.texAll(tb);
  })();
})();
