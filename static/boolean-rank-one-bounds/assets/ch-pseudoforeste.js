/* ch-pseudoforeste.js — Capitolo D: (R) e (P), pseudoforeste, greedy, component peeling, laminare vs catena.
 * Tutti i numeri vengono da BR (core.js); qui solo disegno e interazione. */
(() => {
  const sec = document.getElementById('pseudoforeste');
  if (!sec) return;
  const $ = (id) => document.getElementById(id);
  const EPS = 1e-9;
  const fmt = BR.fmt;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------------ stile locale
  const css = `
  #pseudoforeste .cc{border-radius:5px;padding:1px 2px;transition:opacity .2s,background .2s}
  #pseudoforeste .cc-p{color:#1f3a68} #pseudoforeste .cc-q{color:var(--under)}
  #pseudoforeste .cc-d{color:var(--diag)} #pseudoforeste .cc-o{color:var(--off)}
  #pseudoforeste .pf-lp.pick .cc{opacity:.32}
  #pseudoforeste .pf-lp.pick-p .cc-p{opacity:1;background:#e3e9f5;box-shadow:inset 0 -2px 0 #1f3a68}
  #pseudoforeste .pf-lp.pick-q .cc-q{opacity:1;background:var(--under-bg);box-shadow:inset 0 -2px 0 var(--under)}
  #pseudoforeste .pf-lp.pick-d .cc-d{opacity:1;background:var(--diag-bg);box-shadow:inset 0 -2px 0 var(--diag)}
  #pseudoforeste .pf-lp.pick-o .cc-o{opacity:1;background:var(--off-bg);box-shadow:inset 0 -2px 0 var(--off)}
  #pseudoforeste .pf-lp .eq{background:#f7f9fd}
  #pseudoforeste .btn .dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:7px;vertical-align:0}
  #pseudoforeste .pf-explain{min-height:2.6em;color:var(--ink-2);border-left:3px solid var(--line-2);padding:2px 0 2px 12px}
  #pseudoforeste .pf-ol,#pseudoforeste .pf-ul{margin:4px 0 0;padding-left:22px}
  #pseudoforeste .pf-ol li,#pseudoforeste .pf-ul li{margin:3px 0}
  #pseudoforeste .pf-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  @media (max-width:640px){#pseudoforeste .pf-gallery{grid-template-columns:repeat(2,1fr)}}
  #pseudoforeste .pf-card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px 8px 10px;text-align:center}
  #pseudoforeste .pf-card.good{border-top:4px solid var(--accept)} #pseudoforeste .pf-card.bad{border-top:4px solid var(--reject)}
  #pseudoforeste .pf-card .nm{font-weight:700;font-size:14.5px;color:var(--ink)}
  #pseudoforeste .pf-card .ct{font-size:13.5px;color:var(--ink-2)}
  #pseudoforeste .pf-card .vd{font-size:14px;margin-top:2px}
  #pseudoforeste .pf-comps{display:flex;flex-direction:column;gap:4px;font-size:14px;margin-top:6px;min-height:28px}
  #pseudoforeste .pf-comps .c{display:flex;gap:8px;align-items:center;color:var(--ink-2)}
  #pseudoforeste .pf-comps .sw2{width:14px;height:14px;border-radius:50%;border:2.5px solid;flex:none}
  #pseudoforeste .pf-comps .tag{font-size:12.5px;font-weight:700;border-radius:999px;padding:0 8px}
  #pseudoforeste .tag.cyc{background:#fbe9d0;color:#9a5b06} #pseudoforeste .tag.acy{background:#e7f4ec;color:#1f6f43}
  #pseudoforeste .trace .row{grid-template-columns:28px 64px 44px 1fr}
  #pseudoforeste .trace .el-l{color:var(--diag);font-weight:700} #pseudoforeste .trace .el-e{color:var(--off);font-weight:700}
  #pseudoforeste .trace .why{color:var(--ink-2);font-size:13.5px}
  #pseudoforeste .trace .row.cur{box-shadow:inset 3px 0 0 #b7791f}
  #pseudoforeste .stepinfo{font-size:14.5px;color:var(--ink-2);margin-left:auto}
  #pseudoforeste .pf-msg{background:var(--soft);border-radius:10px;padding:9px 14px;margin:10px 0 0;min-height:48px;font-size:15.5px}
  #pseudoforeste .pf-side table.t td{padding:5px 8px}
  #pseudoforeste .pf-side .tot{font-weight:700}
  #pseudoforeste .pf-side .new td{background:#fff4d6}
  #pseudoforeste .gamma-line{font-size:14.5px;color:var(--ink-2);margin-left:6px}
  #pseudoforeste .d .uline{stroke:#f3c95a;stroke-width:13;fill:none;stroke-linecap:round;opacity:.75}
  #pseudoforeste .d .edge.acc{stroke-width:5} #pseudoforeste .d .loop.acc{stroke-width:4.6}
  #pseudoforeste .d .loop.ghost{stroke:#c9d1df;stroke-width:2;stroke-dasharray:4 5}
  #pseudoforeste .d .loop.rej{stroke:var(--reject)}
  #pseudoforeste .d .edge.aug{stroke-dasharray:9 6;stroke-width:4}
  #pseudoforeste .d .edge.gone,#pseudoforeste .d .loop.gone{stroke:#c9d1df;stroke-width:1.8;stroke-dasharray:3 5}
  #pseudoforeste .d .setbox{fill:rgba(47,94,168,.07);stroke:#2f5ea8;stroke-width:1.6}
  #pseudoforeste .d .setlab{font:600 12.5px var(--mono);fill:#1f3a68}
  #pseudoforeste .d .alab{font:600 13px var(--mono);fill:var(--diag);text-anchor:middle}
  #pseudoforeste .sw.hlsw{background:#fde7a6;border-color:#f3c95a}
  #pseudoforeste .sw.ghostsw{background:#fff;border:2px dashed #c9d1df}
  #pseudoforeste .sw.augsw{background:#fff;border:2px dashed var(--off)}
  #pseudoforeste .sw.setsw{background:rgba(47,94,168,.1);border-color:#2f5ea8;border-radius:5px}
  #pseudoforeste .panel .legend{font-size:13px;gap:4px 12px;margin:6px 0 0}
  #pseudoforeste .pf-sum{font-size:15px;color:var(--ink-2);margin-top:10px;display:flex;flex-wrap:wrap;gap:6px 18px}
  `;
  const st = document.createElement('style'); st.textContent = css; sec.appendChild(st);

  // ------------------------------------------------------------------ esempi
  const EX = [
    { key: 'q4', label: '4 vertici', G: [[2, 6, 3, 4], [6, 9, 1, 10], [3, 1, 8, 7], [4, 10, 7, 5]] },
    { key: 's3', label: '3×3', G: [[0, 1, 2], [1, 1, 0], [2, 0, 1]] },
    { key: 's2', label: '2×2', G: [[1, 3], [3, 2]] },
  ];
  const texMatrix = (G) => '\\Gamma=\\begin{pmatrix}' + G.map((r) => r.map((v) => fmt(v)).join('&')).join('\\\\') + '\\end{pmatrix}';
  const exBar = (host, onChange, withMatrix = false) => {
    host.innerHTML = '';
    const btnBox = DR.h('span', 'controls', '', host); btnBox.style.margin = '0';
    const g = withMatrix ? DR.h('span', 'gamma-line', '', host) : null;
    const set = (k) => { if (g) DR.tex(g, texMatrix(EX[k].G)); onChange(EX[k]); };
    DR.toggle(btnBox, EX.map((e, k) => ({ label: e.label, value: k })), set, 0);
    set(0);
  };

  // ------------------------------------------------------------------ disegno del grafo con loop
  const W = 400, H = 345;
  function geometry(n) {
    let P, loopA, lab = {};
    if (n === 4) {
      P = [[200, 52], [345, 286], [55, 286], [200, 196]];
      loopA = [-Math.PI / 2, Math.PI / 5, Math.PI - Math.PI / 5, Math.PI / 2];
      lab = { '0-1': [288, 162], '0-2': [112, 162], '0-3': [215, 118], '1-2': [200, 304], '1-3': [282, 230], '2-3': [118, 230] };
    } else if (n === 3) {
      P = DR.layout(3, { cx: 200, cy: 185, r: 118 }).pos;
      loopA = P.map(([x, y]) => Math.atan2(y - 185, x - 200));
    } else {
      P = [[110, 175], [290, 175]]; loopA = [Math.PI, 0]; lab = { '0-1': [200, 157] };
    }
    const cx = P.reduce((s, p) => s + p[0], 0) / n, cy = P.reduce((s, p) => s + p[1], 0) / n;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const k = i + '-' + j; if (lab[k]) continue;
      const mx = (P[i][0] + P[j][0]) / 2, my = (P[i][1] + P[j][1]) / 2;
      const ox = mx - cx, oy = my - cy, L = Math.hypot(ox, oy) || 1;
      lab[k] = [mx + (ox / L) * 16, my + (oy / L) * 16];
    }
    return { P, loopA, lab };
  }
  const R0 = 21, RL = 17;
  const loopCenter = (geo, i) => { const a = geo.loopA[i], d = R0 + RL - 6; return [geo.P[i][0] + Math.cos(a) * d, geo.P[i][1] + Math.sin(a) * d]; };
  /** elems: [{e (elemento BR), cls, label, labelCls, hl}] ; vstyle(i) → {fill, stroke} | null ; vcls(i) */
  function drawGraph(svg, n, geo, elems, o = {}) {
    const gU = DR.el('g', {}, svg), gE = DR.el('g', {}, svg), gV = DR.el('g', {}, svg), gT = DR.el('g', {}, svg);
    for (const it of elems) {
      const e = it.e;
      if (e.type === 'loop') {
        const [x, y] = loopCenter(geo, e.i);
        if (it.hl) DR.el('circle', { cx: x, cy: y, r: RL, class: 'uline' }, gU);
        DR.el('circle', { cx: x, cy: y, r: RL, class: 'loop ' + (it.cls || '') }, gE);
        if (it.label !== undefined && it.label !== '') {
          const a = geo.loopA[e.i];
          DR.text(gT, x + Math.cos(a) * (RL + 15), y + Math.sin(a) * (RL + 13), it.label, 'wl ' + (it.labelCls || 'diag'));
        }
      } else {
        const [x1, y1] = geo.P[e.i], [x2, y2] = geo.P[e.j];
        if (it.hl) DR.el('line', { x1, y1, x2, y2, class: 'uline' }, gU);
        DR.el('line', { x1, y1, x2, y2, class: 'edge ' + (it.cls || '') }, gE);
        if (it.label !== undefined && it.label !== '') {
          const [lx, ly] = geo.lab[e.i + '-' + e.j];
          DR.text(gT, lx, ly, it.label, 'wl ' + (it.labelCls || 'off'));
        }
      }
    }
    for (let i = 0; i < n; i++) {
      const v = DR.el('g', { class: 'vtx ' + (o.vcls ? o.vcls(i) || '' : '') }, gV);
      const c = DR.el('circle', { cx: geo.P[i][0], cy: geo.P[i][1], r: R0 }, v);
      const s = o.vstyle ? o.vstyle(i) : null;
      if (s) c.setAttribute('style', `fill:${s.fill};stroke:${s.stroke};stroke-width:3`);
      DR.text(v, geo.P[i][0], geo.P[i][1], String(i + 1));
    }
  }
  const elLabelTex = (e) => (e.type === 'loop' ? '\\ell_{' + (e.i + 1) + '}' : '\\{' + (e.i + 1) + ',' + (e.j + 1) + '\\}');
  const elHtml = (e) => `<span class="${e.type === 'loop' ? 'el-l' : 'el-e'}">${BR.elemLabel(e)}</span>`;
  const setTex = (U) => '\\{' + BR.toList(U).map((i) => i + 1).join(',') + '\\}';
  const COMP = [{ fill: '#e6e9fb', stroke: '#4757b8' }, { fill: '#fae6f0', stroke: '#b0407a' },
    { fill: '#eef2d8', stroke: '#6f7d1e' }, { fill: '#e6edf3', stroke: '#4b5d73' }];

  // ------------------------------------------------------------------ stepper riutilizzabile
  function stepper(host, nFrames, render, { delay = 1300 } = {}) {
    host.innerHTML = '';
    const mk = (lab, aria) => { const b = DR.h('button', 'btn', lab, host); b.type = 'button'; b.setAttribute('aria-label', aria); return b; };
    const b0 = mk('⏮ Inizio', 'Torna all\'inizio'), bp = mk('◀ Indietro', 'Passo precedente'),
      bn = mk('Avanti ▶', 'Passo successivo'), bplay = mk('▶ Riproduci', 'Riproduci automaticamente');
    bn.classList.add('primary');
    const info = DR.h('span', 'stepinfo', '', host);
    let k = 0, timer = null;
    const stop = () => { if (timer) clearInterval(timer); timer = null; bplay.textContent = '▶ Riproduci'; };
    const go = (x) => {
      k = Math.max(0, Math.min(nFrames - 1, x));
      b0.disabled = bp.disabled = k === 0; bn.disabled = k === nFrames - 1;
      info.textContent = `passo ${k} di ${nFrames - 1}`;
      render(k);
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

  // ================================================================== 1. corrispondenze (R) ↔ (P)
  (function pairs() {
    const host = $('pf-pick'); const lp = sec.querySelector('.pf-lp'); const ex = $('pf-explain');
    if (!host || !lp) return;
    const items = [
      { k: 'p', c: '#1f3a68', lab: '$p_U \\leftrightarrow x(E[U])\\le|U|$',
        txt: 'Il fattore $X_U$ costa la sua traccia $|U|$ e copre tutti gli elementi di $E[U]$: la colonna di $p_U$ diventa il vincolo $x(E[U])\\le|U|$.' },
      { k: 'q', c: 'var(--under)', lab: '$q_{ij} \\leftrightarrow x_{ij}\\le 1$',
        txt: 'La sottostima $q_{ij}$ costa 1 e compare solo nella riga $(i,j)$: diventa il vincolo $x_{ij}\\le 1$.' },
      { k: 'd', c: 'var(--diag)', lab: 'diagonale $\\leftrightarrow x_{\\ell_i}$',
        txt: 'Il vincolo sulla cella diagonale $(i,i)$ diventa la variabile del loop $\\ell_i$, con peso $\\Gamma_{ii}$.' },
      { k: 'o', c: 'var(--off)', lab: 'fuori diagonale $\\leftrightarrow x_{ij}$',
        txt: 'Il vincolo sulla cella $(i,j)$ diventa la variabile dell\'arco $\\{i,j\\}$, con peso $\\Gamma_{ij}$.' },
    ];
    for (const eq of lp.querySelectorAll('.eq')) {
      const src = eq.textContent.trim().replace(/^\$\$/, '').replace(/\$\$$/, '');
      if (window.katex) katex.render(src, eq, { displayMode: true, throwOnError: false, trust: true, strict: false, macros: DR.MACROS });
    }
    let sel = 'p';
    const show = (k) => {
      lp.classList.remove('pick-p', 'pick-q', 'pick-d', 'pick-o'); lp.classList.add('pick', 'pick-' + k);
      const it = items.find((x) => x.k === k); ex.innerHTML = it.txt; DR.texAll(ex);
    };
    const btns = items.map((it) => {
      const b = DR.h('button', 'btn' + (it.k === sel ? ' on' : ''), `<i class="dot" style="background:${it.c}"></i>${it.lab}`, host);
      b.type = 'button';
      b.addEventListener('click', () => { sel = it.k; btns.forEach((x) => x.classList.remove('on')); b.classList.add('on'); show(sel); });
      b.addEventListener('mouseenter', () => show(it.k));
      b.addEventListener('mouseleave', () => show(sel));
      return b;
    });
    DR.texAll(host);
    // passaggio del mouse sulle formule stesse
    lp.addEventListener('mouseover', (ev) => {
      const t = ev.target.closest && ev.target.closest('.cc'); if (!t) return;
      const k = ['p', 'q', 'd', 'o'].find((x) => t.classList.contains('cc-' + x)); if (k) show(k);
    });
    lp.addEventListener('mouseleave', () => show(sel));
    show(sel);
  })();

  // ================================================================== 2. galleria
  (function gallery() {
    const host = $('pf-gallery'); if (!host) return;
    const L = (i) => ({ id: 'l' + (i + 1), type: 'loop', i, j: i });
    const E = (i, j) => ({ id: 'e' + (i + 1) + (j + 1), type: 'edge', i, j });
    const cards = [
      { nm: 'Albero', n: 4, P: [[100, 30], [100, 82], [45, 125], [155, 125]], F: [E(0, 1), E(1, 2), E(1, 3)], la: [] },
      { nm: 'Un ciclo', n: 3, P: [[100, 32], [158, 120], [42, 120]], F: [E(0, 1), E(1, 2), E(0, 2)], la: [] },
      { nm: 'Un loop', n: 3, P: [[40, 105], [100, 105], [160, 105]], F: [E(0, 1), E(1, 2), L(1)], la: [0, -Math.PI / 2, 0] },
      { nm: 'Due cicli', n: 4, P: [[50, 40], [150, 40], [150, 125], [50, 125]], F: [E(0, 1), E(1, 2), E(2, 3), E(0, 3), E(0, 2)], la: [] },
      { nm: 'Due loop', n: 2, P: [[62, 95], [138, 95]], F: [E(0, 1), L(0), L(1)], la: [-Math.PI / 2, -Math.PI / 2] },
      { nm: 'Loop + ciclo', n: 3, P: [[100, 58], [155, 132], [45, 132]], F: [E(0, 1), E(1, 2), E(0, 2), L(0)], la: [-Math.PI / 2] },
    ];
    for (const c of cards) {
      const comps = BR.components(c.n, c.F); const ok = BR.isPseudoforest(c.n, c.F);
      const K = comps[0];
      const card = DR.h('div', 'pf-card ' + (ok ? 'good' : 'bad'), '', host);
      const box = DR.h('div', '', '', card);
      const s = DR.svg(box, 200, 160, `${c.nm}: ${K.elems.length} elementi su ${K.verts.length} vertici, ${ok ? 'ammessa' : 'vietata'}`);
      const geo = { P: c.P, loopA: c.la, lab: {} };
      const r0 = 15, rl = 13;
      for (const e of c.F) {
        if (e.type === 'loop') {
          const a = c.la[e.i], d = r0 + rl - 5;
          DR.el('circle', { cx: c.P[e.i][0] + Math.cos(a) * d, cy: c.P[e.i][1] + Math.sin(a) * d, r: rl, class: 'loop acc' }, s);
        } else DR.el('line', { x1: c.P[e.i][0], y1: c.P[e.i][1], x2: c.P[e.j][0], y2: c.P[e.j][1], class: 'edge acc' }, s);
      }
      for (let i = 0; i < c.n; i++) {
        const v = DR.el('g', { class: 'vtx' }, s);
        DR.el('circle', { cx: c.P[i][0], cy: c.P[i][1], r: r0 }, v);
      }
      void geo;
      DR.h('div', 'nm', c.nm, card);
      DR.h('div', 'ct', `${K.elems.length} elementi · ${K.verts.length} vertici`, card);
      DR.h('div', 'vd ' + (ok ? 'ok' : 'no'), ok ? '✓ ammessa' : '✗ vietata', card);
    }
  })();

  // ================================================================== 3. greedy
  (function greedy() {
    const gHost = $('pf-g-graph'), tHost = $('pf-g-trace'), cHost = $('pf-g-comps'), ctl = $('pf-g-ctl');
    if (!gHost) return;
    let cur = null;
    const load = (ex) => {
      const G = ex.G, n = G.length, gr = BR.greedyPseudoforest(G), geo = geometry(n);
      const all = BR.elements(G).filter((e) => e.w > EPS);
      // tabella (costruita una volta)
      tHost.innerHTML = '';
      const tr = DR.h('div', 'trace', '', tHost);
      const rows = gr.order.map((e, k) => {
        const r = DR.h('div', 'row todo', '', tr);
        DR.h('span', 'muted', String(k + 1), r); DR.h('span', '', elHtml(e), r); DR.h('span', 'mono', fmt(e.w), r);
        DR.h('span', 'res', '<span class="muted">in attesa</span>', r);
        return r;
      });
      const render = (k) => {
        // k = numero di elementi già esaminati
        const done = gr.steps.slice(0, k), last = done[done.length - 1];
        const F = last ? last.F : []; const comps = last ? last.comps : [];
        const inF = new Set(F.map((e) => e.id)), rej = new Set(done.filter((s) => !s.accepted).map((s) => s.el.id));
        const colorOf = new Map(); comps.forEach((c, ci) => c.verts.forEach((v) => colorOf.set(v, COMP[ci % COMP.length])));
        const svg = DR.svg(gHost, W, H, `Greedy, passo ${k}: pseudoforesta con ${F.length} elementi`);
        drawGraph(svg, n, geo, all.map((e) => {
          const acc = inF.has(e.id), rj = rej.has(e.id), isCur = last && last.el.id === e.id;
          const cls = acc ? 'acc' : rj ? 'rej' : 'ghost';
          return { e, cls, hl: isCur, label: fmt(e.w), labelCls: acc ? (e.type === 'loop' ? 'diag' : 'off') : 'muted' };
        }), { vstyle: (i) => colorOf.get(i) || null });
        cHost.innerHTML = comps.length ? '' : '<span class="muted">Nessun elemento ancora: ogni vertice è una componente banale.</span>';
        comps.forEach((c, ci) => {
          const col = COMP[ci % COMP.length];
          const d = DR.h('div', 'c', '', cHost);
          DR.h('span', 'sw2', '', d).style.cssText = `background:${col.fill};border-color:${col.stroke}`;
          DR.h('span', 'mono', `{${c.verts.map((v) => v + 1).join(',')}}`, d);
          DR.h('span', 'mono small', `${c.elems.length} el. / ${c.verts.length} v.`, d);
          DR.h('span', 'tag ' + (c.cyclic ? 'cyc' : 'acy'), c.cyclic ? 'ha già un ciclo' : 'aciclica', d);
        });
        rows.forEach((r, j) => {
          const s = gr.steps[j]; const res = r.querySelector('.res');
          r.className = 'row ' + (j < k ? (s.accepted ? 'acc' : 'rej') : 'todo') + (j === k - 1 ? ' cur' : '');
          res.innerHTML = j < k ? `<span class="st">${s.accepted ? '✓ accettato' : '✗ rifiutato'}</span> <span class="why">— ${s.reason}</span>`
            : '<span class="muted">in attesa</span>';
        });
        const wF = F.reduce((s, e) => s + e.w, 0);
        info.innerHTML = k === gr.steps.length
          ? `Fine: $F^*$ ha ${F.length} elementi e $w(F^*)=${fmt(gr.value)}$.`
          : `Peso accumulato $w(F)=${fmt(wF)}$.`;
        DR.texAll(info);
      };
      if (cur) cur.stop();
      const info = DR.h('div', 'pf-msg', '', null);
      ctl.innerHTML = '';
      const ctlBox = DR.h('div', 'controls', '', ctl); ctlBox.style.margin = '0';
      ctl.appendChild(info);
      cur = stepper(ctlBox, gr.steps.length + 1, render, { delay: 1200 });
    };
    exBar($('pf-g-ex'), load, true);
  })();

  // ================================================================== 4. peeling
  (function peeling() {
    const gHost = $('pf-p-graph'), side = $('pf-p-side'), msg = $('pf-p-msg'), ctl = $('pf-p-ctl');
    if (!gHost) return;
    let cur = null;
    const load = (ex) => {
      const G = ex.G, n = G.length, geo = geometry(n), pe = BR.peeling(G), gr = pe.greedy;
      const augIds = new Set(pe.augmented.map((e) => e.id));
      // fotogrammi: 0 = F*, 1 = aumentazione, poi un passo di peeling ciascuno, infine verifica
      const frames = [];
      const res = new Map(pe.Fbar.map((e) => [e.id, e.w]));
      frames.push({ kind: 'start', res: new Map(gr.F.map((e) => [e.id, e.w])), show: new Set(gr.F.map((e) => e.id)), p: [], q: [] });
      frames.push({ kind: 'aug', res: new Map(res), show: new Set(pe.Fbar.map((e) => e.id)), p: [], q: [] });
      const pAcc = [], qAcc = [];
      for (const s of pe.steps) {
        const V = new Set(s.verts);
        let comp;
        if (s.kind === 'cycle') {
          comp = pe.Fbar.filter((e) => res.get(e.id) > EPS && V.has(e.i) && V.has(e.j));
          for (const e of comp) res.set(e.id, Math.max(0, res.get(e.id) - s.delta));
          pAcc.push({ U: s.U, c: s.delta });
        } else {
          comp = pe.Fbar.filter((e) => s.elems.some((x) => x.id === e.id));
          for (const x of s.elems) { res.set(x.id, 0); const e = pe.Fbar.find((y) => y.id === x.id); qAcc.push({ e, c: x.rest }); }
        }
        frames.push({ kind: s.kind, step: s, comp: new Set(comp.map((e) => e.id)), verts: V, res: new Map(res),
          show: new Set(pe.Fbar.map((e) => e.id)), p: pAcc.slice(), q: qAcc.slice() });
      }
      frames.push({ kind: 'end', res: new Map(res), show: new Set(pe.Fbar.map((e) => e.id)), p: pAcc.slice(), q: qAcc.slice() });
      const chk = BR.checkR(G, pe.p, pe.q);

      const render = (k) => {
        const f = frames[k];
        const svg = DR.svg(gHost, W, H, `Component peeling, passo ${k}`);
        const els = pe.Fbar.filter((e) => f.show.has(e.id)).map((e) => {
          const r = f.res.get(e.id); const alive = r > EPS; const inC = f.comp && f.comp.has(e.id);
          let cls = alive ? 'acc' : 'gone';
          if (augIds.has(e.id) && alive) cls += ' aug';
          return { e, cls, hl: inC, label: fmt(r), labelCls: alive ? (e.type === 'loop' ? 'diag' : 'off') : 'muted' };
        });
        drawGraph(svg, n, geo, els, { vcls: (i) => (f.verts ? (f.verts.has(i) ? 'hl' : 'dim') : '') });
        // pannello laterale
        let h = '<table class="t"><tbody>';
        const lastNew = f.kind === 'cycle' ? 'p' : f.kind === 'tree' ? 'q' : '';
        f.p.forEach((t, j) => {
          const isNew = lastNew === 'p' && j === f.p.length - 1;
          h += `<tr class="${isNew ? 'new' : ''}"><td>$p_{${setTex(t.U)}}=${fmt(t.c)}$</td><td class="muted">costo $${BR.popcount(t.U)}\\cdot ${fmt(t.c)}=${fmt(BR.popcount(t.U) * t.c)}$</td></tr>`;
        });
        f.q.forEach((t, j) => {
          const isNew = lastNew === 'q' && f.step.elems.some((x) => x.id === t.e.id);
          h += `<tr class="${isNew ? 'new' : ''}"><td>$q_{${t.e.i + 1}${t.e.j + 1}}=${fmt(t.c)}$</td><td class="muted">costo $${fmt(t.c)}$</td></tr>`;
          void j;
        });
        if (!f.p.length && !f.q.length) h += '<tr><td class="muted" colspan="2">ancora nessun $p_U$ o $q_{ij}$</td></tr>';
        const tot = f.p.reduce((s, t) => s + BR.popcount(t.U) * t.c, 0) + f.q.reduce((s, t) => s + t.c, 0);
        h += `</tbody></table><div class="tot">Valore di $(R)$ finora: $${fmt(tot)}$</div><div class="muted small">obiettivo: $w(F^*)=${fmt(gr.value)}$</div>`;
        side.innerHTML = h; side.className = 'pf-side';
        // messaggio
        let m = '';
        if (f.kind === 'start') m = `Partenza: la pseudoforesta ottima $F^*$ del greedy, con $w(F^*)=${fmt(gr.value)}$. Le etichette sono i residui da coprire.`;
        else if (f.kind === 'aug') m = pe.augmented.length
          ? `Aumentazione: si aggiunge ${pe.augmented.map((e) => '$' + elLabelTex(e) + '$ (peso ' + fmt(e.w) + ')').join(', ')}, che collega due componenti di $F^*$ già cicliche. Ora $\\bar F$ è connesso dove serve.`
          : 'Aumentazione: nessun elemento di peso positivo collega due componenti diverse; $\\bar F=F^*$.';
        else if (f.kind === 'cycle') {
          const s = f.step;
          m = `La componente su $${setTex(s.U)}$ contiene un ciclo: livello comune $p_{${setTex(s.U)}}=\\delta=${fmt(s.delta)}$ (residuo minimo), sottratto a tutti i suoi elementi. Esce ${s.removed.map((id) => '$' + elLabelTex(pe.Fbar.find((e) => e.id === id)) + '$').join(', ')}.`;
        } else if (f.kind === 'tree') {
          const s = f.step;
          m = `La componente su $${setTex(BR.toMask(s.verts))}$ è un albero: ogni arco è pagato con la sottostima ${s.elems.map((x) => { const e = pe.Fbar.find((y) => y.id === x.id); return `$q_{${e.i + 1}${e.j + 1}}=${fmt(x.rest)}$`; }).join(', ')}.`;
        } else {
          m = `Fine. Valore $\\sum_U|U|p_U+\\sum q_{ij}=${fmt(pe.value)}=w(F^*)$. Vincoli di $(R)$: ${chk.ok ? '<span class="ok">tutti soddisfatti ✓</span>' : '<span class="no">violati: ' + chk.bad.join(', ') + '</span>'}.`;
        }
        msg.innerHTML = m;
        DR.texAll(side); DR.texAll(msg);
      };
      if (cur) cur.stop();
      cur = stepper(ctl, frames.length, render, { delay: 1800 });
    };
    exBar($('pf-p-ex'), load);
  })();

  // ================================================================== 5. laminare vs catena
  (function chainFig() {
    const lamHost = $('pf-c-lam'), chHost = $('pf-c-chain'), sum = $('pf-c-sum'), tab = $('pf-c-table');
    if (!lamHost) return;
    /** Diagramma di insiemi annidati per una famiglia laminare (array {U,c}) su n vertici. */
    function nested(host, n, fam, alpha, label) {
      const sets = fam.slice().sort((a, b) => BR.popcount(b.U) - BR.popcount(a.U));
      // albero di contenimento
      const nodes = sets.map((t) => ({ t, kids: [], own: [] }));
      const roots = [];
      nodes.forEach((nd, k) => {
        let par = null;
        for (let j = k - 1; j >= 0; j--) if ((nodes[j].t.U & nd.t.U) === nd.t.U) { par = nodes[j]; break; }
        (par ? par.kids : roots).push(nd);
      });
      const covered = (nd) => nd.kids.reduce((m, c) => m | c.t.U, 0);
      nodes.forEach((nd) => { nd.own = BR.toList(nd.t.U & ~covered(nd)); });
      const rootCover = roots.reduce((m, r) => m | r.t.U, 0);
      const freeV = BR.toList(((1 << n) - 1) & ~rootCover);
      const VR = 19, GAP = 12, SIDE = 9, TOP = 24, BOT = 24;
      const size = (nd) => {
        const items = [...nd.own.map(() => ({ w: 2 * VR, h: 2 * VR })), ...nd.kids.map(size)];
        const w = items.reduce((s, it) => s + it.w, 0) + GAP * (items.length - 1) + 2 * SIDE;
        const hh = Math.max(...items.map((it) => it.h)) + TOP + BOT;
        nd.w = Math.max(w, 86); nd.h = hh; return nd;
      };
      roots.forEach(size);
      const items = [...freeV.map((v) => ({ v, w: 2 * VR, h: 2 * VR })), ...roots];
      const totW = items.reduce((s, it) => s + it.w, 0) + GAP * 2 * (items.length - 1);
      const maxH = Math.max(...items.map((it) => it.h));
      const Wd = Math.max(totW + 20, 300), Hd = maxH + 54;
      const s = DR.svg(host, Wd, Hd, label);
      const vx = new Array(n).fill(0); let vy = 0;
      const gBox = DR.el('g', {}, s), gV = DR.el('g', {}, s);
      const place = (nd, x, yTop) => {
        DR.el('rect', { x, y: yTop, width: nd.w, height: nd.h, rx: 14, class: 'setbox' }, gBox);
        DR.text(gBox, x + 10, yTop + 14, `${BR.setLabel(nd.t.U)}  p=${fmt(nd.t.c)}`, 'setlab', { 'dominant-baseline': 'central' });
        const sub = [...nd.own.map((v) => ({ v, w: 2 * VR, h: 2 * VR })), ...nd.kids];
        const inner = sub.reduce((a, it) => a + it.w, 0) + GAP * (sub.length - 1);
        let cx = x + (nd.w - inner) / 2; const cyMid = yTop + TOP + (nd.h - TOP - BOT) / 2;
        for (const it of sub) {
          if (it.v !== undefined) { vx[it.v] = cx + VR; vy = cyMid; }
          else place(it, cx, cyMid - (it.h - TOP - BOT) / 2 - TOP);
          cx += it.w + GAP;
        }
      };
      let x = (Wd - totW) / 2; const yTop0 = 6;
      for (const it of items) {
        if (it.v !== undefined) { vx[it.v] = x + VR; }
        else place(it, x, yTop0 + (maxH - it.h) / 2);
        x += it.w + 2 * GAP;
      }
      if (!vy) vy = yTop0 + maxH / 2;
      for (let v = 0; v < n; v++) {
        const g = DR.el('g', { class: 'vtx' }, gV);
        DR.el('circle', { cx: vx[v], cy: vy, r: VR }, g); DR.text(g, vx[v], vy, String(v + 1));
        DR.text(gV, vx[v], yTop0 + maxH + 24, 'α=' + fmt(alpha[v]), 'alab');
      }
    }
    const laminar = (fam) => fam.every((a) => fam.every((b) => (a.U & b.U) === 0 || (a.U & b.U) === a.U || (a.U & b.U) === b.U));
    const load = (ex) => {
      const G = ex.G, n = G.length, pe = BR.peeling(G);
      const alpha = BR.marginals(n, pe.p), ch = BR.chainFromAlpha(alpha);
      nested(lamHost, n, pe.p, alpha, `Certificato laminare con ${pe.p.length} insiemi`);
      nested(chHost, n, ch, BR.marginals(n, ch), `Certificato a catena con ${ch.length} insiemi`);
      const vL = BR.valueR(G, pe.p, pe.q), vC = BR.valueR(G, ch, pe.q);
      const okL = BR.checkR(G, pe.p, pe.q).ok, okC = BR.checkR(G, ch, pe.q).ok;
      const isLam = laminar(pe.p), isChain = ch.every((a, k) => k === 0 || (a.U & ch[k - 1].U) === a.U);
      sum.innerHTML = `<div class="pf-sum"><span>Laminare: <b>${pe.p.length}</b> insiemi (≤ $2n-1=${2 * n - 1}$) ${isLam ? '<span class="ok">✓</span>' : '<span class="no">✗</span>'}</span>`
        + `<span>Catena: <b>${ch.length}</b> insiemi (≤ $n=${n}$) ${isChain ? '<span class="ok">✓</span>' : '<span class="no">✗</span>'}</span>`
        + `<span>Valore di $(R)$: $${fmt(vL)}$ e $${fmt(vC)}$ ${okL && okC && Math.abs(vL - vC) < 1e-9 ? '<span class="ok">✓ uguali e ammissibili</span>' : '<span class="no">✗</span>'}</span></div>`;
      const HL = BR.combine(n, pe.p), HC = BR.combine(n, ch);
      let t = '<table class="t small"><thead><tr><th>coppia</th><th>$\\Gamma_{ij}$</th><th>laminare</th><th>catena $=\\min(\\alpha_i,\\alpha_j)$</th><th>$q_{ij}$</th></tr></thead><tbody>';
      for (const [i, j] of BR.offPairs(n)) {
        const q = pe.q['e' + (i + 1) + (j + 1)] || 0;
        t += `<tr><td>$\\{${i + 1},${j + 1}\\}$</td><td>${fmt(G[i][j])}</td><td>${fmt(HL[i][j])}</td><td>${fmt(HC[i][j])}${HC[i][j] > HL[i][j] + EPS ? ' <span class="muted">(↑)</span>' : ''}</td><td>${fmt(q)}</td></tr>`;
      }
      t += '</tbody></table>';
      tab.innerHTML = t;
      DR.texAll(sum); DR.texAll(tab);
    };
    exBar($('pf-c-ex'), load);
  })();
})();
