/* ch-laboratorio.js — Laboratorio interattivo: editor del grafo/matrice, sette strutture a confronto,
 * catena dei bound, moviola del greedy, formulazioni, certificati, sfide. Tutti i numeri vengono da BR. */
(() => {
  const sec = document.getElementById('laboratorio');
  if (!sec || typeof BR === 'undefined' || typeof DR === 'undefined') return;
  const $ = (id) => document.getElementById(id);
  const EPS = 1e-9;
  const fmt = (x) => BR.fmt(x);

  /*PURE-BEGIN*/
  const SUB = '₀₁₂₃₄₅₆₇₈₉';
  const sub = (k) => String(k).split('').map((d) => SUB[+d]).join('');
  const elName = (i, j) => (i === j ? 'ℓ' + sub(i + 1) : '{' + (i + 1) + ',' + (j + 1) + '}');
  const gName = (i, j) => 'Γ' + sub(i + 1) + sub(j + 1);
  const eid = (i, j) => (i === j ? 'l' + (i + 1) : 'e' + (Math.min(i, j) + 1) + (Math.max(i, j) + 1));

  /** Vertici su un poligono regolare nel quadrato unitario (vertice 1 in alto), centrato verticalmente. */
  function defaultPos(n) {
    if (n === 2) return [[0, 0.5], [1, 0.5]];
    const P = [];
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (2 * Math.PI * i) / n; P.push([0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a)]); }
    const ys = P.map((p) => p[1]); const dy = 0.5 - (Math.min(...ys) + Math.max(...ys)) / 2;
    return P.map(([u, v]) => [+u.toFixed(4), +(v + dy).toFixed(4)]);
  }

  /** Stato ↔ stringa dell'hash: "n:v11,v12,…,vnn[:u_v,u_v,…]" (triangolo superiore per righe). */
  function encodeState(st, withPos) {
    const vals = [];
    for (let i = 0; i < st.n; i++) for (let j = i; j < st.n; j++) vals.push(BR.fmt(st.G[i][j]));
    let s = st.n + ':' + vals.join(',');
    if (withPos) s += ':' + st.pos.map(([u, v]) => Math.round(u * 100) + '_' + Math.round(v * 100)).join(',');
    return s;
  }
  function decodeState(s) {
    if (typeof s !== 'string') return null;
    const parts = s.split(':'); const n = parseInt(parts[0], 10);
    if (!(n >= 2 && n <= 6) || parts.length < 2) return null;
    const vals = parts[1].split(',').map(Number);
    if (vals.length !== (n * (n + 1)) / 2 || vals.some((v) => !isFinite(v) || v < 0 || v > 1000)) return null;
    const G = BR.zeros(n); let k = 0;
    for (let i = 0; i < n; i++) for (let j = i; j < n; j++) { G[i][j] = G[j][i] = vals[k++]; }
    let pos = defaultPos(n), custom = false;
    if (parts[2]) {
      const pp = parts[2].split(',').map((t) => t.split('_').map(Number));
      if (pp.length === n && pp.every((p) => p.length === 2 && p.every((x) => isFinite(x) && x >= -20 && x <= 120))) {
        pos = pp.map(([u, v]) => [u / 100, v / 100]); custom = true;
      }
    }
    return { n, G, pos, custom };
  }

  /** Distanza punto–segmento. */
  function segDist(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  }
  /** Geometria di un arco: segmento, oppure curva quadratica se passa vicino al punto da evitare. */
  function edgeGeom(a, b, avoid, bend) {
    let c = null;
    if (avoid && segDist(avoid, a, b) < 16) {
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L, ny = dx / L; const side = (mx - avoid[0]) * nx + (my - avoid[1]) * ny >= 0 ? 1 : -1;
      c = [mx + nx * side * bend, my + ny * side * bend];
    }
    const at = (t) => (c
      ? [(1 - t) * (1 - t) * a[0] + 2 * t * (1 - t) * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * t * (1 - t) * c[1] + t * t * b[1]]
      : [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    const r = (x) => +x.toFixed(2);
    const d = c ? `M${r(a[0])} ${r(a[1])} Q${r(c[0])} ${r(c[1])} ${r(b[0])} ${r(b[1])}` : `M${r(a[0])} ${r(a[1])} L${r(b[0])} ${r(b[1])}`;
    return { d, at, c };
  }
  /** Posizionamento greedy delle etichette: per ogni oggetto, il primo candidato abbastanza lontano da
   *  ostacoli ed etichette già messe (altrimenti il più lontano). obstacles: [{x,y,r}]. */
  function placeLabels(items, obstacles, lr) {
    const occ = obstacles.slice(); const out = new Map();
    for (const it of items) {
      let best = null, bestS = -Infinity;
      for (const [x, y] of it.cands) {
        let s = Infinity; for (const o of occ) s = Math.min(s, Math.hypot(x - o.x, y - o.y) - o.r - lr);
        if (s >= 0) { best = [x, y]; break; }
        if (s > bestS) { bestS = s; best = [x, y]; }
      }
      out.set(it.key, best); occ.push({ x: best[0], y: best[1], r: lr });
    }
    return out;
  }

  /** Elementi che stanno su un ciclo (2-nucleo) in un insieme di loop/archi. */
  function cycleIds(n, F) {
    const alive = new Set(F.map((e) => e.id)); const deg = new Array(n).fill(0);
    for (const e of F) { if (e.type === 'loop') deg[e.i] += 2; else { deg[e.i]++; deg[e.j]++; } }
    let changed = true;
    while (changed) {
      changed = false;
      for (const e of F) {
        if (!alive.has(e.id) || e.type === 'loop') continue;
        if (deg[e.i] === 1 || deg[e.j] === 1) { alive.delete(e.id); deg[e.i]--; deg[e.j]--; changed = true; }
      }
    }
    return alive;
  }

  /** Ordine dei vertici che rende contigui gli insiemi di una famiglia laminare; profondità di ciascun insieme. */
  function laminarLayout(n, sets) {
    const S = sets.slice().sort((a, b) => BR.popcount(b) - BR.popcount(a) || a - b);
    const key = (v) => S.map((U, k) => (BR.has(U, v) ? k : -1)).filter((k) => k >= 0);
    const order = [...Array(n).keys()].sort((a, b) => {
      const ka = key(a), kb = key(b);
      for (let t = 0; t < Math.min(ka.length, kb.length); t++) if (ka[t] !== kb[t]) return ka[t] - kb[t];
      return ka.length - kb.length || a - b;
    });
    const depth = new Map(S.map((U) => [U, S.filter((W) => W !== U && (W & U) === U).length]));
    const contiguous = S.every((U) => { const idx = order.map((v, k) => (BR.has(U, v) ? k : -1)).filter((k) => k >= 0); return idx[idx.length - 1] - idx[0] === idx.length - 1; });
    return { order, depth, contiguous };
  }
  const isLaminar = (sets) => sets.every((a) => sets.every((b) => { const x = a & b; return !x || x === a || x === b; }));

  /** Tutti i numeri del laboratorio (Efull a parte). */
  function computeAll(G) {
    const n = G.length;
    const ch = BR.chain(G, { withEfull: false });
    const offE = BR.rootedEdges(G).filter((e) => !e.root);
    const forest = BR.maxSpanningForest(n, offE);
    const G0 = BR.clone(G); for (let i = 0; i < n; i++) G0[i][i] = 0;
    const oneF = BR.greedyPseudoforest(G0);
    const rooted = BR.maxSpanningForest(n + 1, BR.rootedEdges(G));
    const trans = BR.transversal(n, ch.greedy.F);
    const pe = ch.peeling;
    const alpha = BR.marginals(n, pe.p);
    const chainSets = BR.chainFromAlpha(alpha);
    const lamOk = BR.checkR(G, pe.p, pe.q), chainOk = BR.checkR(G, chainSets, pe.q);
    const valChain = BR.valueR(G, chainSets, pe.q);
    const yM = BR.matchingCertificate(G, ch.matching.pairs); const dM = BR.checkDual(G, yM);
    const beta = alpha.map((a, i) => a - G[i][i]);
    let betaOk = beta.every((b) => b >= -1e-7);
    for (const [i, j] of BR.offPairs(n)) {
      const q = pe.q[eid(i, j)] || 0;
      if (beta[i] + q < G[i][j] - G[i][i] - 1e-7 || beta[j] + q < G[i][j] - G[j][j] - 1e-7) betaOk = false;
    }
    const sumBetaQ = beta.reduce((s, b) => s + b, 0) + Object.values(pe.q).reduce((s, v) => s + v, 0);
    // guadagni lungo l'assegnazione trasversale di F*
    let tGain = 0; const tArrows = [];
    if (trans) for (const e of ch.greedy.F) {
      const v = trans.get(e.id); const g = e.type === 'loop' ? 0 : G[e.i][e.j] - G[v][v];
      tGain += g; tArrows.push({ e, v, g });
    }
    return { n, G, gamma: ch.gamma, ch, forest, oneF, rooted, trans, tGain, tArrows, alpha, chainSets, lamOk, chainOk,
      valChain, lamSets: pe.p.map((t) => t.U), laminar: isLaminar(pe.p.map((t) => t.U)), yM, dM, beta, betaOk, sumBetaQ,
      pseudo: ch.greedy.value, valR: ch.valR, LB: ch.LB, M: ch.M, Zcov: rooted.value, wForest: forest.value, wOne: oneF.value,
      cycOne: cycleIds(n, oneF.F), cycPseudo: cycleIds(n, ch.greedy.F) };
  }
  function computeEf(G) {
    const e = BR.efull(G), d = BR.efullDual(G), cd = BR.checkDual(G, d.y);
    return { value: e.value, H: e.H, terms: e.terms, err: BR.errors(G, e.H), y: d.y, dval: d.value, dok: cd.ok };
  }
  /** Sfide: predicati su (risultati, Efull). */
  const CHALLENGES = [
    { id: 'cyc', t: 'Un ciclo che conta', d: 'Fai pesare la 1-foresta più della foresta.',
      hint: 'Serve un ciclo di archi a peso positivo: il matroide grafico deve scartarne uno, il bicircolare no.',
      test: (r) => r.wOne > r.wForest + 1e-7 },
    { id: 'sep', t: 'Separa i matroidi', d: 'Ottieni $\\Zcov<\\val(P)$: la foresta del grafo bordato pesa meno della pseudoforesta.',
      hint: 'Diagonale piccola e un triangolo di archi pesanti: nel grafo bordato il triangolo è un ciclo vietato, nel bicircolare no.',
      test: (r) => r.Zcov < r.pseudo - 1e-7 },
    { id: 'gap', t: 'Bound non esatto', d: 'Trova $\\Gamma$ (con $n\\le5$) per cui $\\Efull(\\Gamma)>\\LB$.',
      hint: 'Parti dall\'esempio 3×3: due archi pesanti che condividono un vertice e un arco nullo fra gli altri due estremi.',
      test: (r, ef) => !!ef && ef.value > r.LB + 1e-6 },
    { id: 'blind', t: 'Bound cieco', d: 'Ottieni $M=0$ ma $\\Efull(\\Gamma)>0$: nessun guadagno, eppure $\\Gamma$ non sta nel cono.',
      hint: 'Rendi ogni $\\Gamma_{ij}\\le\\min(\\Gamma_{ii},\\Gamma_{jj})$, ma con un «cammino» 1–2–3 e $\\Gamma_{13}=0$.',
      test: (r, ef) => !!ef && r.M <= 1e-9 && ef.value > 1e-6 },
    { id: 'noloop', t: 'Pseudoforesta senza loop', d: 'Fai sì che $F^*$ non contenga loop, pur con $\\gamma>0$.',
      hint: 'Un triangolo di archi molto più pesanti della diagonale chiude il ciclo prima che arrivino i loop.',
      test: (r) => r.gamma > 1e-9 && r.ch.greedy.F.every((e) => e.type !== 'loop') },
  ];
  /*PURE-END*/

  // ================================================================== definizioni dei simboli
  const DEFS = {
    gamma: '$\\gamma=\\sum_i\\Gamma_{ii}$: traccia di $\\Gamma$, cioè la somma dei pesi dei loop $\\ell_i$.',
    Efull: '$\\Efull(\\Gamma)=\\min_{p\\ge0}\\sum_{1\\le i\\le j\\le n}|\\Gamma_{ij}-H_{ij}(p)|$, con $H(p)=\\sum_U p_UX_U$ e $X_U=\\one_U\\one_U^\\top$: il miglior errore $\\ell_1$ (ogni coppia contata una volta, diagonale inclusa). Coincide con $z^*$, la fase A di AWCD con una radice.',
    LB: '$\\LB=\\val(R)-\\gamma$: lower bound su $\\Efull(\\Gamma)$ dal rilassamento unilaterale $(R)$. La sottrazione di $\\gamma$ è essenziale: $\\val(R)$ da solo non è un bound.',
    valR: '$\\val(R)$: valore ottimo del rilassamento unilaterale $(R)$: la diagonale va coperta ($\\sum_{U\\ni i}p_U\\ge\\Gamma_{ii}$) e si paga $\\sum_U|U|p_U$; la sottostima fuori diagonale $q_{ij}$ si paga, la sovrastima fuori diagonale è gratuita.',
    wF: '$w(F^*)$: peso della pseudoforesta ottima $F^*$ (loop $\\ell_i$ di peso $\\Gamma_{ii}$, archi $\\{i,j\\}$ di peso $\\Gamma_{ij}$, al più un ciclo per componente), trovata dal greedy del matroide bicircolare. Vale $w(F^*)=\\val(P)=\\val(R)$.',
    M: '$M$: valore massimo del matching dei guadagni (grafo bipartito archi $\\{i,j\\}$ ↔ vertici; assegnare $\\{i,j\\}$ a $v\\in\\{i,j\\}$ guadagna $(\\Gamma_{ij}-\\Gamma_{vv})^+$; capacità 1 su archi e vertici). È anche il matching bound di AWCD.',
    Zcov: '$\\Zcov(w)=w(T)$, con $T$ massima foresta ricoprente del grafo bordato: vertici $V\\cup\\{r\\}$, $w_{ri}=\\Gamma_{ii}$, $w_{ij}=\\Gamma_{ij}$ (Kruskal, matroide grafico). Vale $\\Zcov\\le z^*+f_2^*$: <b>non</b> è un bound sulla sola distanza $z^*$.',
    zstar: '$z^*$: valore ottimo della fase A di AWCD (minima sotto- più sovra-copertura del grafo bordato con le clique ancorate $C=\\{r\\}\\cup U$). Teorema: $z^*=\\Efull(\\Gamma)$.',
    f2: '$f_2^*$: valore ottimo della fase B di AWCD, cioè il minimo di $\\sum_C(|C|-1)x_C=\\sum_U|U|p_U=\\tr H$ fra gli ottimi della fase A.',
    forest: 'Foresta: insieme di archi ordinari $\\{i,j\\}$ senza cicli (matroide grafico su $V$). Il peso massimo si trova con Kruskal: archi per peso non crescente, si scarta chi chiude un ciclo.',
    oneF: '1-foresta: insieme di archi ordinari $\\{i,j\\}$ in cui ogni componente ha al più un ciclo; i loop non si usano. È il matroide bicircolare ristretto agli archi; qui la diagonale di $\\Gamma$ è ignorata.',
    pseudo: 'Pseudoforesta: loop e archi con al più un ciclo per componente; un loop $\\ell_i$ è un ciclo. Sono gli insiemi indipendenti del matroide bicircolare; equivalente: $|F\\cap E[U]|\\le|U|$ per ogni $U\\ne\\emptyset$, dove $E[U]$ sono gli elementi con estremi in $U$.',
    rooted: 'Grafo bordato di AWCD: grafo completo su $V\\cup\\{r\\}$ con la radice $r$; l\'arco radice $(r,i)$ pesa $\\Gamma_{ii}$ e prende il posto del loop $\\ell_i$. Una foresta non può contenere cicli, nemmeno passando per $r$.',
    matching: 'Matching dei guadagni: a sinistra gli archi $\\{i,j\\}$ con almeno un guadagno positivo, a destra i vertici; il collegamento $\\{i,j\\}\\to v$ pesa $(\\Gamma_{ij}-\\Gamma_{vv})^+$. Ogni nodo usato al più una volta; $M$ è il valore massimo.',
    transv: 'Rappresentazione trasversale del bicircolare: un insieme è indipendente se e solo se ogni elemento si assegna a un suo estremo (un loop al proprio vertice) con vertici tutti distinti. Partendo da tutti i loop (peso $\\gamma$) e sostituendo $\\ell_v$ con l\'arco assegnato a $v$, si guadagna $\\Gamma_{ij}-\\Gamma_{vv}$: la somma dei guadagni è $w(F^*)-\\gamma=M$.',
    efullCard: '$\\Efull(\\Gamma)$ è il valore di un LP con un fattore $X_U=\\one_U\\one_U^\\top$ ($(X_U)_{ij}=1$ se e solo se $i,j\\in U$) per ogni $\\emptyset\\ne U\\subseteq V$ ($2^n-1$ variabili $p_U$). Colori di $H$: rosso = sottostima $H_{ij}<\\Gamma_{ij}$, verde acqua = sovrastima $H_{ij}>\\Gamma_{ij}$, verde = esatto. Il duale $y$ è una soluzione ottima di $(D_A)$.',
    gap: 'gap $=\\Efull(\\Gamma)-\\LB\\ge0$: quanto il lower bound sottostima l\'errore ottimo. È l\'unica disuguaglianza della catena.',
    lam: 'Famiglia laminare: due insiemi qualsiasi sono disgiunti oppure uno contiene l\'altro. Il peeling produce un ottimo $(p,q)$ di $(R)$ con supporto laminare di al più $2n-1$ insiemi.',
    chain: 'Catena: con le marginali $\\alpha_i=\\sum_{U\\ni i}p_U$ e le soglie $\\theta_1<\\theta_2<\\dots$ (valori distinti di $\\alpha$), gli insiemi di superlivello $S_k=\\{v:\\alpha_v\\ge\\theta_k\\}$ con $p_{S_k}=\\theta_k-\\theta_{k-1}$ danno un ottimo di $(R)$ con al più $n$ insiemi annidati. La copertura della coppia $\\{i,j\\}$ diventa $\\min(\\alpha_i,\\alpha_j)$.',
  };

  // ================================================================== stile (scoped)
  const css = `
#laboratorio{position:relative}
#laboratorio .lab-howto{border:1px solid var(--line);border-radius:12px;padding:10px 16px;margin:14px 0;background:#fbfcfe}
#laboratorio .lab-howto>summary{cursor:pointer;font-weight:700;color:var(--brand)}
#laboratorio .lab-howto ul{margin:8px 0 2px;padding-left:20px;font-size:15.5px;color:var(--ink-2)}
#laboratorio .lab-howto li{margin:4px 0}
#laboratorio .lab-dock{position:sticky;top:10px;z-index:15;display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin:18px 0 12px;padding:9px 12px;background:rgba(255,255,255,.94);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid var(--line);border-radius:14px;box-shadow:0 8px 28px rgba(20,30,60,.10)}
@media (max-width:980px){#laboratorio .lab-dock{top:58px}}
#laboratorio .lab-sel{display:flex;align-items:center;gap:8px;min-width:150px}
#laboratorio .lab-chip{font:700 15px var(--mono);padding:3px 10px;border-radius:999px;border:2px solid var(--line-2);background:#fff;white-space:nowrap}
#laboratorio .lab-chip.off{color:var(--off);border-color:var(--off);background:var(--off-bg)}
#laboratorio .lab-chip.diag{color:var(--diag);border-color:var(--diag);background:var(--diag-bg)}
#laboratorio .lab-seld{font-size:13.5px;color:var(--ink-3);line-height:1.25}
#laboratorio .lab-wc{display:flex;align-items:center;gap:6px}
#laboratorio .lab-wc input[type=range]{width:120px;accent-color:var(--brand-2)}
#laboratorio .lab-ib{font:700 16px var(--sans);width:32px;height:32px;padding:0;border-radius:9px;border:1px solid var(--line-2);background:#fff;color:var(--brand);cursor:pointer}
#laboratorio .lab-ib:hover{background:var(--soft)} #laboratorio .lab-ib:disabled{opacity:.4;cursor:default}
#laboratorio .lab-mini{display:flex;align-items:baseline;gap:7px;font:600 14px var(--mono);color:var(--ink-2);margin-left:auto}
#laboratorio .lab-mini b{font-size:17px;color:var(--ink)}
#laboratorio .lab-mini .lab-gapb{font:700 12px var(--sans);border-radius:999px;padding:2px 8px;margin-left:4px}
#laboratorio .lab-gapb.pos{background:var(--under-bg);color:var(--under)} #laboratorio .lab-gapb.zero{background:var(--exact-bg);color:var(--eq)}
#laboratorio .lab-hist{display:flex;gap:6px}
#laboratorio .lab-toast{position:absolute;right:14px;top:calc(100% + 8px);background:var(--eq);color:#fff;font:600 14px var(--sans);padding:7px 14px;border-radius:10px;box-shadow:var(--shadow);opacity:0;transform:translateY(-6px);transition:opacity .3s,transform .3s;pointer-events:none}
#laboratorio .lab-toast.on{opacity:1;transform:none}
#laboratorio .lab-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;margin:0 0 14px;font-size:14.5px;color:var(--ink-2)}
#laboratorio .lab-toolbar select{font:600 14.5px var(--sans);padding:6px 10px;border-radius:9px;border:1px solid var(--line-2);background:#fff;color:var(--brand);max-width:100%}
#laboratorio .lab-toolbar .lab-sp{flex:1}
#laboratorio .lab-ch .lab-relay,#laboratorio .lab-ch .lab-nst{margin-left:auto}
#laboratorio .lab-ch .lab-relay{padding:3px 10px;font-size:13px}
#laboratorio .lab-nst .lab-ib{width:28px;height:28px}
#laboratorio .lab-nst{display:inline-flex;align-items:center;gap:6px;font:600 14.5px var(--mono);color:var(--ink)}
#laboratorio .btn.ghost{background:transparent}
#laboratorio .lab-editor{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:16px;align-items:stretch}
@media (max-width:760px){#laboratorio .lab-editor{grid-template-columns:1fr}}
#laboratorio .lab-card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 16px}
#laboratorio .lab-gcard{background:linear-gradient(180deg,#fbfcff,#fff)}
#laboratorio .lab-ch{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;margin-bottom:4px}
#laboratorio .lab-ct{font:700 16px var(--serif);color:var(--brand)} #laboratorio .lab-cs{font-size:13.5px;color:var(--ink-3)}
#laboratorio #lab-ed-graph svg{max-height:480px}
#laboratorio #lab-ed-graph .wl{font-size:17px;stroke-width:6px}
#laboratorio #lab-ed-graph .vtx text{font-size:19px}
#laboratorio #lab-ed-matrix{max-width:330px;margin:6px auto 0}
#laboratorio .lab-mnote{margin:6px 0 0}
#laboratorio .lab-h3{margin-top:40px}
#laboratorio .lab-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:18px;margin:16px 0 8px}
#laboratorio .lab-panel{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 16px 12px;display:flex;flex-direction:column;transition:box-shadow .2s,border-color .2s}
#laboratorio .lab-panel:hover{box-shadow:0 6px 22px rgba(20,30,60,.07);border-color:var(--line-2)}
#laboratorio .lab-panel.lab-wide{grid-column:1/-1}
#laboratorio .lab-panel header{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
#laboratorio .lab-panel h4{margin:0;font:700 16px var(--sans);color:var(--ink)}
#laboratorio .lab-pn{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--soft);color:var(--brand-2);font:800 12.5px var(--sans)}
#laboratorio .lab-tag{margin-left:auto;font-size:12px;color:var(--ink-3);border:1px solid var(--line);border-radius:999px;padding:1px 8px}
#laboratorio .lab-f{font-size:13.5px;color:var(--ink-2);margin:6px 0 2px;line-height:1.5;min-height:2.9em}
#laboratorio .lab-fig{flex:1;display:flex;align-items:center}
#laboratorio .lab-fig>svg{max-height:290px}
#laboratorio .lab-leg{display:flex;flex-wrap:wrap;gap:3px 14px;font-size:12.5px;color:var(--ink-3);margin:2px 0 4px;min-height:18px}
#laboratorio .lab-leg span{white-space:nowrap}
#laboratorio .lab-swl{width:24px;height:14px;vertical-align:-2px;margin-right:5px;overflow:visible}
#laboratorio .lab-panel footer{display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid var(--line);padding-top:8px;margin-top:6px}
#laboratorio .lab-big{display:flex;align-items:baseline;gap:8px}
#laboratorio .lab-big b{font:700 26px var(--mono);color:var(--brand);transition:color .3s}
#laboratorio .lab-big b.lab-flash{color:var(--match)}
#laboratorio .lab-bl{font-size:13.5px;color:var(--ink-3)}
#laboratorio .lab-foot{font-size:12.5px;color:var(--ink-3);text-align:right}
#laboratorio .lab-play{padding:4px 11px;font-size:13px}
#laboratorio .lab-efull{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px 24px;align-items:center}
@media (max-width:700px){#laboratorio .lab-efull{grid-template-columns:1fr}}
#laboratorio .lab-efig{max-width:360px;width:100%;margin:0 auto}
#laboratorio .lab-eftog .btn{padding:4px 10px;font-size:13px}
#laboratorio .lab-eside{font-size:14.5px;color:var(--ink-2)}
#laboratorio .lab-eside .lab-terms{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}
#laboratorio .lab-msg{padding:22px 16px;border:1px dashed var(--line-2);border-radius:10px;color:var(--ink-3);text-align:center;font-size:14.5px;width:100%}
#laboratorio .lab-tabs{display:flex;flex-wrap:wrap;gap:4px;margin:38px 0 0;border-bottom:2px solid var(--line)}
#laboratorio .lab-tabs [role=tab]{font:600 14.5px var(--sans);padding:9px 14px;border:0;border-bottom:3px solid transparent;margin-bottom:-2px;background:none;color:var(--ink-3);cursor:pointer;border-radius:8px 8px 0 0}
#laboratorio .lab-tabs [role=tab]:hover{color:var(--brand);background:var(--soft)}
#laboratorio .lab-tabs [role=tab][aria-selected=true]{color:var(--brand);border-bottom-color:var(--brand-2)}
#laboratorio .lab-count{font:700 11.5px var(--mono);background:var(--soft);border-radius:999px;padding:1px 7px;margin-left:4px}
#laboratorio .lab-count.some{background:var(--exact-bg);color:var(--eq)}
#laboratorio .lab-tp{padding:20px 2px 6px}
#laboratorio .lab-chain{display:flex;flex-wrap:wrap;align-items:stretch;justify-content:center;gap:8px}
#laboratorio .lab-tok{flex:1 1 140px;max-width:200px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:10px 12px;text-align:center}
#laboratorio .lab-tok .tl{font-size:14.5px;color:var(--ink-2);min-height:26px}
#laboratorio .lab-tok .tv{font:700 30px var(--mono);color:var(--brand);line-height:1.2}
#laboratorio .lab-tok .td{font-size:12.5px;color:var(--ink-3)}
#laboratorio .lab-tok.ef{border-color:var(--brand-2);background:var(--soft)}
#laboratorio .lab-tok.mm .tv{color:var(--match)}
#laboratorio .lab-rel{display:grid;place-items:center;font:800 26px var(--sans);min-width:24px}
#laboratorio .lab-rel.eq{color:var(--eq)} #laboratorio .lab-rel.geq{color:var(--geq)} #laboratorio .lab-rel.unk{color:var(--ink-3)}
#laboratorio .lab-verdict{text-align:center;font-size:15.5px;margin:14px 0 18px}
#laboratorio .lab-bars{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px 12px;align-items:center;max-width:720px;margin:0 auto 6px}
#laboratorio .lab-bars .bl{font-size:14px;color:var(--ink-2);white-space:nowrap}
#laboratorio .lab-bars .bt{height:16px;background:#f1f3f8;border-radius:4px;display:flex;overflow:hidden}
#laboratorio .lab-bars .bt i{display:block;height:100%;transition:width .35s ease;border-right:2px solid #fff}
#laboratorio .lab-bars .bt i:last-child{border-right:0}
#laboratorio .lab-bars .bv{font:700 15px var(--mono);color:var(--ink);text-align:right;min-width:40px}
#laboratorio .lab-bars .sep{grid-column:1/-1;border-top:1px dashed var(--line-2);margin:2px 0}
#laboratorio .b-off{background:var(--off)} #laboratorio .b-offl{background:#8fb0e0} #laboratorio .b-root{background:var(--root)}
#laboratorio .b-diag{background:var(--diag)} #laboratorio .b-match{background:var(--match)}
#laboratorio .b-gap{background:repeating-linear-gradient(45deg,var(--under) 0 4px,#f3b6bf 4px 8px)}
#laboratorio .lab-anim{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:18px;align-items:start}
@media (max-width:760px){#laboratorio .lab-anim{grid-template-columns:1fr}}
#laboratorio .lab-astage{background:#fbfcff;border:1px solid var(--line);border-radius:14px;padding:10px}
#laboratorio .lab-acap{font-size:14.5px;color:var(--ink-2);min-height:3em;margin:6px 4px 2px}
#laboratorio .lab-trace{max-height:380px;overflow:auto}
#laboratorio .lab-trace .row{grid-template-columns:28px 64px 46px 1fr;font-size:13.5px;cursor:pointer}
#laboratorio .lab-trace .row .rs{font-size:12.5px;color:var(--ink-3)}
#laboratorio .lab-sw-cur,#laboratorio .lab-sw-cyc{display:inline-block;width:14px;height:14px;border-radius:4px;vertical-align:-2px;margin-right:6px}
#laboratorio .lab-sw-cur{background:#f0b429} #laboratorio .lab-sw-cyc{background:#fff1c2;border:2px solid #b7791f;border-radius:50%}
#laboratorio .lab-forms{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}
#laboratorio .lab-fcard{border:1px solid var(--line);border-radius:14px;padding:12px 14px;background:#fff}
#laboratorio .lab-fh{font:700 14.5px var(--sans);color:var(--brand);margin-bottom:4px}
#laboratorio .lab-fcard .eq{font-size:15px;padding:8px 10px}
#laboratorio .lab-live{font-size:14.5px;color:var(--ink-2);line-height:1.6}
#laboratorio .lab-live .pill{margin:1px 2px}
#laboratorio .lab-certs{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}
#laboratorio .lab-cfig{margin:0}
#laboratorio .lab-sfide{display:grid;gap:10px}
#laboratorio .lab-sf{display:grid;grid-template-columns:30px 1fr;gap:4px 12px;align-items:start;border:1px solid var(--line);border-radius:12px;padding:10px 14px;background:#fff;transition:border-color .3s,background .3s}
#laboratorio .lab-sf .lamp{width:18px;height:18px;border-radius:50%;margin-top:4px;background:#e4e7ee;border:2px solid #cfd5df;transition:all .4s}
#laboratorio .lab-sf.on{border-color:#9fd3b4;background:#f4fbf7}
#laboratorio .lab-sf.on .lamp{background:#3fbf73;border-color:#2e8b57;box-shadow:0 0 0 5px rgba(63,191,115,.18),0 0 14px rgba(63,191,115,.7)}
#laboratorio .lab-sf.now .lamp{background:#f0b429;border-color:#b7791f}
#laboratorio .lab-sf b{color:var(--ink)} #laboratorio .lab-sf p{margin:2px 0;font-size:14.5px;color:var(--ink-2)}
#laboratorio .lab-sf details{font-size:13.5px;color:var(--ink-3)} #laboratorio .lab-sf summary{cursor:pointer}
#laboratorio .lab-q{display:inline-grid;place-items:center;width:17px;height:17px;border-radius:50%;border:1px solid var(--line-2);background:#fff;color:var(--brand-2);font:700 11px var(--sans);cursor:pointer;vertical-align:1px;margin-left:3px;padding:0}
#laboratorio .lab-q:hover,#laboratorio .lab-q[aria-expanded=true]{background:var(--brand-2);color:#fff;border-color:var(--brand-2)}
#laboratorio .lab-bubble{position:absolute;z-index:40;max-width:min(380px,calc(100% - 16px));background:#fff;border:1px solid var(--line-2);border-radius:12px;box-shadow:0 12px 34px rgba(20,30,60,.18);padding:10px 14px;font-size:14.5px;line-height:1.55;color:var(--ink-2)}
#laboratorio .lab-bubble[hidden]{display:none}
#laboratorio button:focus-visible,#laboratorio select:focus-visible,#laboratorio input:focus-visible,#laboratorio summary:focus-visible{outline:3px solid #f0b429;outline-offset:2px}
#laboratorio .lab-stale{opacity:.45;transition:opacity .2s}
/* SVG */
#laboratorio .lab-svg .edge,#laboratorio .lab-svg .loop{transition:stroke .35s,stroke-width .35s,opacity .35s}
#laboratorio .lab-svg .vtx circle{transition:fill .35s,stroke .35s}
#laboratorio .lab-svg .lab-hide{opacity:0!important;pointer-events:none}
#laboratorio .lab-svg .wl{transition:opacity .3s}
#laboratorio .lab-svg .lab-hit{stroke:transparent;stroke-width:18;fill:none;pointer-events:stroke;cursor:pointer;outline:none}
#laboratorio .lab-svg circle.lab-hit{stroke-width:13}
#laboratorio .lab-svg .lab-hit:focus-visible{stroke:rgba(240,180,41,.45)}
#laboratorio .lab-svg .lab-halo{fill:none;stroke:#fff1c2;stroke-width:0;stroke-linecap:round;transition:stroke-width .35s}
#laboratorio .lab-svg .lab-halo.on{stroke-width:13}
#laboratorio .lab-svg .loop.ghost{stroke:#c9d1df;stroke-width:2;stroke-dasharray:4 5}
#laboratorio .lab-svg .lab-out{stroke:#d5dbe6!important;stroke-width:1.6!important;stroke-dasharray:3 4}
#laboratorio .lab-svg .edge.lab-in,#laboratorio .lab-svg .loop.lab-in{stroke-width:4.4}
#laboratorio .lab-svg .lab-pick{filter:drop-shadow(0 0 3px #f0b429) drop-shadow(0 0 2px #f0b429)}
#laboratorio .lab-svg .lab-hov{filter:drop-shadow(0 0 2px #9ab6e6)}
#laboratorio .lab-svg .lab-cur{stroke:#e0a106!important;stroke-width:7!important;stroke-dasharray:none!important;filter:drop-shadow(0 0 4px rgba(240,180,41,.8))}
#laboratorio .lab-svg .vtx.lab-cyc circle{fill:#fff1c2;stroke:#b7791f}
#laboratorio .lab-svg .vtx.lab-grab{cursor:grab;touch-action:none}
#laboratorio .lab-svg .vtx.lab-grab:active{cursor:grabbing}
#laboratorio .lab-svg .vtx.lab-pick circle{fill:#fff4d6;stroke:#e0a106;stroke-width:3.4}
#laboratorio .lab-svg .vtx.lab-tv circle{stroke:var(--match);stroke-width:3.2}
#laboratorio .lab-svg .vtx.lab-tl circle{stroke:var(--diag);stroke-width:3.2}
#laboratorio .lab-svg .vtx.lab-tf circle{stroke-dasharray:4 4;stroke:#a0a8b8}
#laboratorio .lab-svg .lab-tarr{stroke:var(--match);stroke-width:2.6;fill:none}
#laboratorio .lab-svg .lab-gl{font:700 12.5px var(--mono);fill:var(--match);paint-order:stroke;stroke:#fff;stroke-width:4px;text-anchor:middle;dominant-baseline:central}
#laboratorio .lab-svg .cell{transition:none}
#laboratorio .lab-svg .cell.lab-zero text{fill:#a0a8b8}
#laboratorio .lab-svg .cell.lab-hov rect{stroke:#9ab6e6;stroke-width:3}
#laboratorio .lab-svg .cell.hl rect{stroke:#e0a106;stroke-width:3.5}
#laboratorio .lab-svg .cell[tabindex]{outline:none}
#laboratorio .lab-svg .cell[tabindex]:focus-visible rect{stroke:#f0b429;stroke-width:4}
#laboratorio .lab-svg .cell.lab-yp rect{fill:#dbe7fb;stroke:var(--brand-2);stroke-width:2}
#laboratorio .lab-svg .cell.lab-yn rect{fill:#eceef3;stroke:#8a94a6;stroke-width:2}
#laboratorio .lab-svg .cell.lab-y0 rect{fill:#fff;stroke:#e2e6ef;stroke-width:1.5}
#laboratorio .lab-svg .lab-lam rect{stroke:#fff;stroke-width:2}
#laboratorio .lab-svg .lab-lam text{font:600 12.5px var(--mono);fill:#fff;text-anchor:middle;dominant-baseline:central}
#laboratorio .lab-svg .lab-tick{stroke:var(--diag);stroke-width:3;stroke-linecap:round}
#laboratorio .lab-svg .lab-lvl{stroke:#9aa5b8;stroke-width:1;stroke-dasharray:3 4}
#laboratorio .lab-svg .lab-sm{font:600 12.5px var(--mono);fill:var(--ink-2);text-anchor:middle;dominant-baseline:central}
#laboratorio .lab-svg .lab-smd{font:600 12px var(--mono);fill:var(--diag);text-anchor:middle;dominant-baseline:central}
@media (prefers-reduced-motion:reduce){#laboratorio .lab-svg *,#laboratorio .lab-bars i,#laboratorio .lab-sf .lamp{transition:none!important}}
`;
  const styleEl = document.createElement('style'); styleEl.textContent = css; sec.prepend(styleEl);

  // ================================================================== bolle di definizione «?»
  const bubble = DR.h('div', 'lab-bubble', '', sec); bubble.hidden = true; bubble.setAttribute('role', 'note');
  let bubbleBtn = null;
  function qBtn(key, label) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'lab-q'; b.textContent = '?';
    b.dataset.def = key; b.setAttribute('aria-label', 'Definizione: ' + (label || key)); b.setAttribute('aria-expanded', 'false');
    return b;
  }
  function showBubble(btn) {
    if (bubbleBtn === btn) { hideBubble(); return; }
    hideBubble();
    bubble.innerHTML = DEFS[btn.dataset.def] || ''; DR.texAll(bubble); bubble.hidden = false;
    const sr = sec.getBoundingClientRect(), br = btn.getBoundingClientRect();
    const w = Math.min(380, sr.width - 16);
    bubble.style.width = w + 'px';
    bubble.style.left = Math.max(8, Math.min(br.left - sr.left - 24, sr.width - w - 8)) + 'px';
    bubble.style.top = (br.bottom - sr.top + 8) + 'px';
    btn.setAttribute('aria-expanded', 'true'); bubbleBtn = btn;
  }
  function hideBubble() { bubble.hidden = true; if (bubbleBtn) bubbleBtn.setAttribute('aria-expanded', 'false'); bubbleBtn = null; }
  sec.addEventListener('click', (ev) => {
    const b = ev.target.closest('.lab-q');
    if (b) { ev.stopPropagation(); showBubble(b); return; }
    if (!ev.target.closest('.lab-bubble')) hideBubble();
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && bubbleBtn) { const b = bubbleBtn; hideBubble(); b.focus(); } });
  sec.querySelectorAll('span.lab-q[data-def]').forEach((s) => s.replaceWith(qBtn(s.dataset.def, s.dataset.label)));

  // ================================================================== vista di grafo persistente
  function GraphView(host, o) {
    const W = o.W, H = o.H, vr = o.vr || 18, pad = o.pad ?? vr + 34, lr = o.lr || Math.round(vr * 0.8);
    const self = { n: 0, P: [], R: null, E: new Map(), Lp: new Map(), Rt: new Map(), V: [], RV: null, svg: null, vr, W, H };
    self.build = (n) => {
      self.n = n; self.E.clear(); self.Lp.clear(); self.Rt.clear(); self.V = [];
      const s = DR.svg(host, W, H, o.label); s.classList.add('lab-svg'); self.svg = s;
      const g = (c) => DR.el('g', { class: c }, s);
      const Lh = g('lab-l-halo'), Le = g('lab-l-e'), Ll = g('lab-l-loop'), Lhit = g('lab-l-hit');
      self.La = g('lab-l-ar'); const Lv = g('lab-l-v'); const Lt = g('lab-l-t'); self.Lx = g('lab-l-x');
      const mk = (map, key, kind, i, j) => {
        const tag = kind === 'loop' ? 'circle' : 'path';
        const halo = DR.el(tag, { class: 'lab-halo' }, Lh);
        const vis = DR.el(tag, { class: kind === 'loop' ? 'loop' : 'edge' }, kind === 'loop' ? Ll : Le);
        const hit = DR.el(tag, { class: 'lab-hit', 'data-i': i, 'data-j': j }, Lhit);
        const tt = DR.el('title', {}, hit);
        if (o.focusable) { hit.setAttribute('tabindex', '0'); hit.setAttribute('role', 'button'); }
        const lab = DR.text(Lt, 0, 0, '', 'wl');
        map.set(key, { halo, vis, hit, tt, lab, i, j, kind });
      };
      if (o.root) for (let v = 0; v < n; v++) mk(self.Rt, v, 'root', v, v);
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) mk(self.E, i + '-' + j, 'edge', i, j);
      for (let i = 0; i < n; i++) mk(self.Lp, i, 'loop', i, i);
      for (let i = 0; i < n; i++) {
        const v = DR.el('g', { class: 'vtx', 'data-v': i }, Lv);
        DR.el('circle', { r: vr }, v); DR.text(v, 0, 0, String(i + 1));
        if (o.focusable) { v.setAttribute('tabindex', '0'); v.setAttribute('role', 'button'); v.setAttribute('aria-label', 'Vertice ' + (i + 1) + ': seleziona il loop ℓ' + sub(i + 1) + ', trascina per spostarlo'); }
        self.V.push(v);
      }
      if (o.root) { self.RV = DR.el('g', { class: 'vtx root' }, Lv); DR.el('circle', { r: vr + 1 }, self.RV); DR.text(self.RV, 0, 0, 'r'); }
    };
    self.toView = ([u, v]) => { const m = self.m; return [m.ox + u * m.s, m.oy + v * m.s]; };
    self.toUnit = (x, y) => { const m = self.m; return [(x - m.ox) / m.s, (y - m.oy) / m.s]; };
    self.place = (pos) => {
      const n = self.n; const s = Math.min(W - 2 * pad, H - 2 * pad); self.m = { s, ox: (W - s) / 2, oy: (H - s) / 2 };
      const P = pos.map(self.toView); self.P = P;
      const cx = P.reduce((a, p) => a + p[0], 0) / n, cy = P.reduce((a, p) => a + p[1], 0) / n;
      self.R = o.root ? [cx, cy] : null;
      const obst = P.map(([x, y]) => ({ x, y, r: vr + 3 })); const items = [];
      const lab = o.fs || 1;
      for (const [i, it] of self.Lp) {
        const [x, y] = P[i]; let dx = x - cx, dy = y - cy; let L = Math.hypot(dx, dy);
        if (L < 1) { dx = 0; dy = -1; L = 1; }
        const ux = dx / L, uy = dy / L, d0 = vr + lr - 5, c = [x + ux * d0, y + uy * d0];
        for (const e of [it.vis, it.halo, it.hit]) { e.setAttribute('cx', c[0].toFixed(2)); e.setAttribute('cy', c[1].toFixed(2)); e.setAttribute('r', lr); }
        it.c = c; it.u = [ux, uy];
        obst.push({ x: c[0], y: c[1], r: lr });
        items.push({ key: 'L' + i, cands: [[c[0] + ux * (lr + 11 * lab), c[1] + uy * (lr + 11 * lab)], [c[0] + uy * (lr + 12), c[1] - ux * (lr + 12)], [c[0] - uy * (lr + 12), c[1] + ux * (lr + 12)]] });
      }
      if (o.root) {
        obst.push({ x: cx, y: cy, r: vr + 3 });
        for (const [v, it] of self.Rt) {
          const g = edgeGeom(self.R, P[v], null, 0); for (const e of [it.vis, it.halo, it.hit]) e.setAttribute('d', g.d);
          it.g = g; items.push({ key: 'R' + v, cands: [0.55, 0.45, 0.65, 0.38].map((t) => g.at(t)) });
        }
        self.RV.setAttribute('transform', `translate(${cx.toFixed(2)} ${cy.toFixed(2)})`);
      }
      for (const [k, it] of self.E) {
        const g = edgeGeom(P[it.i], P[it.j], self.R, Math.max(26, vr * 1.8));
        for (const e of [it.vis, it.halo, it.hit]) e.setAttribute('d', g.d);
        it.g = g; items.push({ key: 'E' + k, cands: [0.5, 0.4, 0.6, 0.32, 0.68, 0.25, 0.75].map((t) => g.at(t)) });
      }
      const pl = placeLabels(items, obst, 10 * lab);
      const setL = (it, p) => { it.lab.setAttribute('x', p[0].toFixed(2)); it.lab.setAttribute('y', p[1].toFixed(2)); };
      for (const [i, it] of self.Lp) setL(it, pl.get('L' + i));
      for (const [v, it] of self.Rt) setL(it, pl.get('R' + v));
      for (const [k, it] of self.E) setL(it, pl.get('E' + k));
      self.V.forEach((v, i) => v.setAttribute('transform', `translate(${P[i][0].toFixed(2)} ${P[i][1].toFixed(2)})`));
    };
    const apply = (it, a, base) => {
      a = a || { hide: true };
      it.vis.setAttribute('class', base + (a.cls ? ' ' + a.cls : '') + (a.hide ? ' lab-hide' : ''));
      it.vis.style.strokeWidth = a.sw ? a.sw.toFixed(2) + 'px' : '';
      it.halo.setAttribute('class', 'lab-halo' + (a.halo && !a.hide ? ' on' : ''));
      it.hit.style.display = a.hide && !a.hit ? 'none' : '';
      const L = a.label ?? '';
      it.lab.textContent = L; it.lab.setAttribute('class', 'wl ' + (a.lcls || 'off') + (L === '' || a.hide ? ' lab-hide' : ''));
      const tt = a.title || ''; if (it.tt.textContent !== tt) it.tt.textContent = tt;
      if (o.focusable) it.hit.setAttribute('aria-label', tt);
    };
    self.paint = (spec) => {
      for (const it of self.E.values()) apply(it, spec.edge(it.i, it.j), 'edge');
      for (const it of self.Lp.values()) apply(it, spec.loop ? spec.loop(it.i) : null, 'loop');
      for (const it of self.Rt.values()) apply(it, spec.root ? spec.root(it.i) : null, 'edge root');
      self.V.forEach((v, i) => v.setAttribute('class', 'vtx ' + (spec.vtx ? spec.vtx(i) || '' : '')));
      if (self.RV) self.RV.style.display = spec.root ? '' : 'none';
      self.La.innerHTML = ''; self.Lx.innerHTML = '';
    };
    return self;
  }

  // ================================================================== stato, storia, hash
  const PRESETS = [
    { id: 'ex3', label: 'Esempio 3×3 (bound non esatto)', G: () => [[0, 1, 2], [1, 1, 0], [2, 0, 1]] },
    { id: 'ex2', label: 'Esempio 2×2 (bound esatto)', G: () => [[1, 3], [3, 2]] },
    { id: 'tri0', label: 'Triangolo con diagonale nulla', G: () => [[0, 1, 1], [1, 0, 1], [1, 1, 0]] },
    { id: 'bowtie', label: 'Grafico vs bicircolare: la farfalla', G: () => {
      const G = BR.zeros(5); for (const [i, j] of [[0, 1], [0, 2], [1, 2], [2, 3], [2, 4], [3, 4]]) G[i][j] = G[j][i] = 2; return G; } },
    { id: 'rank1', label: 'Rank-one bbᵀ, b = (1,2,2,3)', G: () => { const b = [1, 2, 2, 3]; return b.map((x) => b.map((y) => x * y)); } },
    { id: 'cone', label: 'Nel cono: X{1,2,3} + 2·X{3,4} + X{1}', G: () => BR.combine(4, [{ U: 7, c: 1 }, { U: 12, c: 2 }, { U: 1, c: 1 }]) },
    { id: 'star', label: 'Stella con diagonale grande', G: () => {
      const G = BR.zeros(5); for (let i = 0; i < 5; i++) G[i][i] = 4; for (let j = 1; j < 5; j++) G[0][j] = G[j][0] = 2; return G; } },
  ];
  let st = null; let presetId = null; let sel = null; let posCustom = false;
  const undoS = [], redoS = []; let lastKey = null, lastT = 0; let userEdited = false; let hashOn = false;
  const snap = () => ({ n: st.n, G: BR.clone(st.G), pos: st.pos.map((p) => p.slice()), presetId, posCustom, userEdited });
  const restore = (s) => { st = { n: s.n, G: BR.clone(s.G), pos: s.pos.map((p) => p.slice()) }; presetId = s.presetId; posCustom = s.posCustom; userEdited = s.userEdited; };
  function pushHistory(s, key) {
    const now = Date.now();
    if (key && key === lastKey && now - lastT < 1200) { lastT = now; return; }
    undoS.push(s || snap()); if (undoS.length > 200) undoS.shift(); redoS.length = 0; lastKey = key || null; lastT = now;
  }
  function setState(G, pos, opt = {}) {
    const nOld = st ? st.n : 0;
    st = { n: G.length, G: BR.clone(G), pos: pos ? pos.map((p) => p.slice()) : defaultPos(G.length) };
    if (sel && (sel.i >= st.n || sel.j >= st.n)) sel = null;
    changed(st.n !== nOld ? 'n' : 'w');
  }
  function loadPreset(id) {
    const p = PRESETS.find((x) => x.id === id); if (!p) return;
    pushHistory(); presetId = id; userEdited = false; posCustom = false; hashOn = true; lastKey = null;
    const G = p.G(); sel = firstEdge(G); setState(G, null);
  }
  function firstEdge(G) {
    const n = G.length; let best = null;
    for (const [i, j] of BR.offPairs(n)) if (!best || G[i][j] > G[best.i][best.j]) best = { i, j };
    return best;
  }
  function randomG(kind) {
    pushHistory(); presetId = null; userEdited = false; hashOn = true; lastKey = null;
    const n = st.n, G = BR.zeros(n);
    for (let i = 0; i < n; i++) for (let j = i; j < n; j++) {
      let v = Math.random() < 0.22 ? 0 : kind === 'int' ? 1 + Math.floor(Math.random() * 5) : Math.round(Math.random() * 50) / 10;
      G[i][j] = G[j][i] = v;
    }
    setState(G, st.pos);
  }
  function setWeight(i, j, w, key) {
    w = Math.max(0, Math.min(1000, +(+w).toFixed(4))); if (!isFinite(w)) return;
    if (Math.abs(st.G[i][j] - w) < 1e-12) return;
    pushHistory(null, key || ('w' + i + ',' + j));
    st.G[i][j] = st.G[j][i] = w; presetId = null; userEdited = true; hashOn = true;
    changed('w');
  }
  function resize(delta) {
    const n = st.n + delta; if (n < 2 || n > 6) return;
    pushHistory(); presetId = null; userEdited = true; hashOn = true; lastKey = null; posCustom = false;
    const G = BR.zeros(n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) G[i][j] = i < st.n && j < st.n ? st.G[i][j] : i === j ? 1 : 0;
    if (delta > 0) sel = { i: n - 1, j: n - 1 };
    setState(G, null);
  }
  function undo() { if (!undoS.length) return; redoS.push(snap()); restore(undoS.pop()); lastKey = null; hashOn = true; afterRestore(); }
  function redo() { if (!redoS.length) return; undoS.push(snap()); restore(redoS.pop()); lastKey = null; hashOn = true; afterRestore(); }
  function afterRestore() { if (sel && (sel.i >= st.n || sel.j >= st.n)) sel = null; changed(views.ed.n !== st.n ? 'n' : 'w'); }

  let hashTimer = 0;
  function scheduleHash() {
    if (!hashOn) return;
    clearTimeout(hashTimer);
    hashTimer = setTimeout(() => {
      try { history.replaceState(null, '', '#laboratorio=' + encodeState(st, posCustom)); } catch (e) { /* file:// o sandbox */ }
    }, 300);
  }

  // ================================================================== costruzione dell'interfaccia
  // --- barra fissa (dock)
  const dock = $('lab-dock');
  dock.innerHTML = `
    <div class="lab-sel"><span class="lab-chip" id="lab-chip">–</span><span class="lab-seld" id="lab-seld"></span></div>
    <div class="lab-wc">
      <button type="button" class="lab-ib" id="lab-wm" aria-label="Diminuisci il peso di 1">−</button>
      <input class="num" id="lab-wn" type="number" min="0" step="0.5" aria-label="Peso dell'elemento selezionato">
      <button type="button" class="lab-ib" id="lab-wp" aria-label="Aumenta il peso di 1">+</button>
      <input type="range" id="lab-wr" min="0" max="10" step="0.1" aria-label="Slider del peso dell'elemento selezionato">
      <button type="button" class="btn ghost" id="lab-w0" style="padding:4px 9px;font-size:13px" title="Peso 0: arco assente">0</button>
    </div>
    <div class="lab-mini" id="lab-mini" aria-live="polite"></div>
    <div class="lab-hist">
      <button type="button" class="lab-ib" id="lab-undo" aria-label="Annulla (Ctrl/⌘+Z)" title="Annulla">↶</button>
      <button type="button" class="lab-ib" id="lab-redo" aria-label="Ripristina (Maiusc+Ctrl/⌘+Z)" title="Ripristina">↷</button>
    </div>
    <div class="lab-toast" id="lab-toast" role="status"></div>`;
  const wn = $('lab-wn'), wr = $('lab-wr');
  let dragging = false;
  const selW = () => (sel ? st.G[sel.i][sel.j] : 0);
  $('lab-wm').addEventListener('click', (ev) => sel && setWeight(sel.i, sel.j, selW() - (ev.shiftKey ? 0.1 : 1)));
  $('lab-wp').addEventListener('click', (ev) => sel && setWeight(sel.i, sel.j, selW() + (ev.shiftKey ? 0.1 : 1)));
  $('lab-w0').addEventListener('click', () => sel && setWeight(sel.i, sel.j, 0, 'zero'));
  wn.addEventListener('input', () => { if (sel && wn.value !== '' && +wn.value >= 0) setWeight(sel.i, sel.j, +wn.value); });
  wr.addEventListener('input', () => { if (sel) setWeight(sel.i, sel.j, +wr.value, 'slider' + sel.i + ',' + sel.j); });
  wr.addEventListener('pointerdown', () => { dragging = true; });
  const endDrag = () => { if (dragging) { dragging = false; changed('w'); } };
  wr.addEventListener('pointerup', endDrag); wr.addEventListener('change', endDrag);
  $('lab-undo').addEventListener('click', undo); $('lab-redo').addEventListener('click', redo);

  // --- barra degli strumenti
  const tb = $('lab-toolbar');
  tb.innerHTML = `
    <label for="lab-preset" class="small">Esempio</label>
    <select id="lab-preset"><option value="">— matrice personalizzata —</option>${PRESETS.map((p) => `<option value="${p.id}">${p.label}</option>`).join('')}</select>
    <button type="button" class="btn ghost" id="lab-ri">Casuale intera</button>
    <button type="button" class="btn ghost" id="lab-rr">Casuale reale</button>
    <span class="lab-sp"></span>
    <button type="button" class="btn ghost" id="lab-share">Copia link</button>`;
  sec.querySelector('.lab-gcard .lab-ch').insertAdjacentHTML('beforeend', '<button type="button" class="btn ghost lab-relay" id="lab-relay" title="Rimetti i vertici sul poligono regolare">Riallinea</button>');
  sec.querySelector('.lab-mcard .lab-ch').insertAdjacentHTML('beforeend', `<span class="lab-nst"><button type="button" class="lab-ib" id="lab-nm" aria-label="Rimuovi l'ultimo vertice">−</button><span id="lab-nv">n = 3</span><button type="button" class="lab-ib" id="lab-np" aria-label="Aggiungi un vertice">+</button></span>`);
  $('lab-preset').addEventListener('change', (ev) => { if (ev.target.value) loadPreset(ev.target.value); });
  $('lab-ri').addEventListener('click', () => randomG('int'));
  $('lab-rr').addEventListener('click', () => randomG('real'));
  $('lab-nm').addEventListener('click', () => resize(-1));
  $('lab-np').addEventListener('click', () => resize(+1));
  $('lab-relay').addEventListener('click', () => { pushHistory(); lastKey = null; posCustom = false; st.pos = defaultPos(st.n); hashOn = true; changed('pos'); });
  $('lab-share').addEventListener('click', () => {
    const url = location.href.split('#')[0] + '#laboratorio=' + encodeState(st, posCustom);
    try { history.replaceState(null, '', url); } catch (e) { /* ignora */ }
    const b = $('lab-share'); const done = (ok) => { b.textContent = ok ? 'Link copiato ✓' : 'Link nella barra degli indirizzi'; setTimeout(() => { b.textContent = 'Copia link'; }, 2200); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(() => done(true), () => done(false));
    else done(false);
  });

  // --- viste
  const views = {
    ed: GraphView($('lab-ed-graph'), { W: 500, H: 430, vr: 22, pad: 58, lr: 17, fs: 1.25, focusable: true, label: 'Editor del grafo: vertici trascinabili, clic su archi e loop per selezionarli' }),
    forest: GraphView($('lab-p-forest'), { W: 320, H: 250, vr: 16, pad: 44, lr: 12, label: 'Foresta di peso massimo sugli archi ordinari' }),
    oneforest: GraphView($('lab-p-oneforest'), { W: 320, H: 250, vr: 16, pad: 44, lr: 12, label: '1-foresta di peso massimo' }),
    pseudo: GraphView($('lab-p-pseudo'), { W: 320, H: 250, vr: 16, pad: 44, lr: 12, label: 'Pseudoforesta con loop di peso massimo' }),
    rooted: GraphView($('lab-p-rooted'), { W: 320, H: 250, vr: 16, pad: 44, lr: 12, root: true, label: 'Massima foresta ricoprente del grafo bordato con radice r' }),
    transv: GraphView($('lab-p-transv'), { W: 320, H: 250, vr: 16, pad: 44, lr: 12, label: 'Assegnazione trasversale della pseudoforesta ottima' }),
    anim: GraphView($('lab-an-graph'), { W: 520, H: 400, vr: 21, pad: 62, lr: 16, root: true, label: 'Moviola del greedy' }),
  };
  const panelKeys = ['forest', 'oneforest', 'pseudo', 'rooted', 'transv'];

  // --- selezione (clic su archi/loop/vertici in tutte le viste)
  function select(i, j) {
    if (i > j) [i, j] = [j, i];
    sel = { i, j }; lastKey = null; renderSelection();
  }
  for (const k of Object.keys(views)) {
    const host = views[k].svg ? views[k].svg.parentNode : null;
    const node = { ed: 'lab-ed-graph', forest: 'lab-p-forest', oneforest: 'lab-p-oneforest', pseudo: 'lab-p-pseudo', rooted: 'lab-p-rooted', transv: 'lab-p-transv', anim: 'lab-an-graph' }[k];
    $(node).addEventListener('click', (ev) => {
      const h = ev.target.closest('.lab-hit'); if (h) { select(+h.dataset.i, +h.dataset.j); return; }
      if (k !== 'ed') { const v = ev.target.closest('.vtx'); if (v && v.dataset.v !== undefined) select(+v.dataset.v, +v.dataset.v); }
    });
    void host;
  }
  // trascinamento dei vertici nell'editor
  const edHost = $('lab-ed-graph'); let drag = null;
  edHost.addEventListener('pointerdown', (ev) => {
    const vt = ev.target.closest('.vtx'); if (!vt || vt.dataset.v === undefined) return;
    drag = { v: +vt.dataset.v, x: ev.clientX, y: ev.clientY, moved: false, before: snap(), id: ev.pointerId };
    try { views.ed.svg.setPointerCapture(ev.pointerId); } catch (e) { /* ignora */ }
    ev.preventDefault();
  });
  edHost.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(ev.clientX - drag.x, ev.clientY - drag.y) < 4) return;
    drag.moved = true;
    const svg = views.ed.svg; const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    const [u, v] = views.ed.toUnit(q.x, q.y);
    st.pos[drag.v] = [Math.max(-0.12, Math.min(1.12, u)), Math.max(-0.12, Math.min(1.12, v))];
    posCustom = true; placeAll();
  });
  const endVDrag = () => {
    if (!drag) return;
    if (drag.moved) { pushHistory(drag.before); lastKey = null; hashOn = true; scheduleHash(); renderHistory(); }
    else select(drag.v, drag.v);
    drag = null;
  };
  edHost.addEventListener('pointerup', endVDrag); edHost.addEventListener('pointercancel', () => { drag = null; });

  // rotella e tastiera sull'elemento selezionato
  const isSelTarget = (t) => {
    const h = t.closest('.lab-hit, .cell, .vtx'); if (!h || !sel) return false;
    const i = +(h.dataset.i ?? h.dataset.v), j = +(h.dataset.j ?? h.dataset.v);
    return (Math.min(i, j) === sel.i && Math.max(i, j) === sel.j);
  };
  for (const node of [edHost, $('lab-ed-matrix')]) node.addEventListener('wheel', (ev) => {
    if (!isSelTarget(ev.target)) return;
    ev.preventDefault();
    const step = ev.shiftKey ? 0.1 : 1; dragging = true; clearTimeout(wheelT); wheelT = setTimeout(endDrag, 250);
    setWeight(sel.i, sel.j, selW() + (ev.deltaY < 0 ? step : -step), 'wheel' + sel.i + ',' + sel.j);
  }, { passive: false });
  let wheelT = 0;
  sec.addEventListener('keydown', (ev) => {
    const t = ev.target;
    if ((ev.metaKey || ev.ctrlKey) && (ev.key === 'z' || ev.key === 'Z' || ev.key === 'y')) {
      if (t.matches('input[type=number]')) return;
      ev.preventDefault(); if (ev.key === 'y' || ev.shiftKey) redo(); else undo(); return;
    }
    const h = t.closest && t.closest('.lab-hit, .cell[tabindex], .vtx[tabindex]'); if (!h) return;
    const i = +(h.dataset.i ?? h.dataset.v), j = +(h.dataset.j ?? h.dataset.v);
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); select(i, j); return; }
    const inc = { ArrowUp: 1, ArrowRight: 1, '+': 1, ArrowDown: -1, ArrowLeft: -1, '-': -1 }[ev.key];
    if (inc) { ev.preventDefault(); if (!isSelTarget(t)) select(i, j); setWeight(sel.i, sel.j, selW() + inc * (ev.shiftKey ? 0.1 : 1), 'key' + sel.i + ',' + sel.j); }
    else if (ev.key === 'Delete' || ev.key === 'Backspace' || ev.key === '0') { ev.preventDefault(); select(i, j); setWeight(i < j ? i : j, i < j ? j : i, 0, 'zero'); }
  });

  // --- matrice
  let mat = null;
  const cs = () => (st.n <= 4 ? 52 : 44);
  function buildMatrix() {
    const host = $('lab-ed-matrix'); const c = cs(); const W = 30 + st.n * c + 6;
    const svg = DR.svg(host, W, W, 'Matrice Γ: clic su una cella per selezionarne il peso'); svg.classList.add('lab-svg');
    mat = DR.matrix(svg, st.G, { x: 30, y: 30, cell: c });
    for (const [k, g] of mat.cells) {
      const [i, j] = k.split(',').map(Number); g.style.cursor = 'pointer';
      if (i <= j) { g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); }
      g.addEventListener('click', () => select(i, j));
      g.addEventListener('mouseenter', () => hover(i, j, true)); g.addEventListener('mouseleave', () => hover(i, j, false));
    }
  }
  function hover(i, j, on) {
    if (i > j) [i, j] = [j, i];
    const it = i === j ? views.ed.Lp.get(i) : views.ed.E.get(i + '-' + j); if (it) it.vis.classList.toggle('lab-hov', on);
    for (const k of [i + ',' + j, j + ',' + i]) { const c = mat && mat.cells.get(k); if (c) c.classList.toggle('lab-hov', on); }
  }
  edHost.addEventListener('mouseover', (ev) => { const h = ev.target.closest('.lab-hit'); if (h) hover(+h.dataset.i, +h.dataset.j, true); });
  edHost.addEventListener('mouseout', (ev) => { const h = ev.target.closest('.lab-hit'); if (h) hover(+h.dataset.i, +h.dataset.j, false); });

  // --- schede: toggle della vista E_full
  let efView = 'H';
  DR.toggle($('lab-ef-tog'), [{ label: 'H ottima ed errori', value: 'H' }, { label: 'duale ottimo y', value: 'y' }, { label: 'certificato del matching', value: 'yM' }], (v) => { efView = v; renderEfull(); }, 'H');
  sec.querySelectorAll('.lab-play').forEach((b) => b.addEventListener('click', () => {
    anim.mode = b.dataset.mode; anim.k = 0; selectTab('anim'); buildAnimMode(); renderAnim(); play(true);
    $('lab-tab-anim').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }));

  // --- linguette
  const TABS = ['bound', 'anim', 'form', 'cert', 'sfide'];
  let tab = 'bound';
  function selectTab(t) {
    tab = t;
    for (const x of TABS) {
      const b = $('lab-tab-' + x), p = $('lab-tp-' + x); const on = x === t;
      b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; p.hidden = !on;
    }
    if (t !== 'anim') stop();
    renderTab();
  }
  TABS.forEach((x, k) => {
    const b = $('lab-tab-' + x);
    b.addEventListener('click', () => selectTab(x));
    b.addEventListener('keydown', (ev) => {
      const d = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
      ev.preventDefault(); const nx = TABS[(k + d + TABS.length) % TABS.length]; selectTab(nx); $('lab-tab-' + nx).focus();
    });
  });

  // ================================================================== aggiornamento
  let res = null, ef = null, efStale = false, efTimer = 0, raf = 0, pendingN = false;
  const efCache = new Map();
  function changed(kind) {
    if (kind === 'n') pendingN = true;
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); });
    scheduleHash();
  }
  function update() {
    if (pendingN || views.ed.n !== st.n) { pendingN = false; for (const k of Object.keys(views)) views[k].build(st.n); buildMatrix(); anim.k = Infinity; }
    placeAll(true);
    res = computeAll(st.G);
    // E_full: subito se possibile, con debounce durante il trascinamento
    clearTimeout(efTimer);
    if (st.n <= 5) {
      const key = encodeState(st, false);
      if (efCache.has(key)) { ef = efCache.get(key); efStale = false; }
      else {
        const run = () => { const r = computeEf(st.G); efCache.set(encodeState(st, false), r); if (efCache.size > 300) efCache.delete(efCache.keys().next().value); ef = r; efStale = false; renderEfDependent(); };
        if (dragging) { efStale = !!ef; efTimer = setTimeout(run, 150); } else run();
      }
    } else { ef = null; efStale = false; }
    renderAll();
  }
  function placeAll(skipPaint) {
    for (const k of Object.keys(views)) views[k].place(st.pos);
    if (!skipPaint && res) { renderEditor(); renderPanels(); if (tab === 'anim') renderAnim(); }
  }
  function renderAll() {
    renderEditor(); renderDock(); renderPanels(); renderEfull(); renderTab(); renderChallenges(); renderToolbar(); renderHistory();
  }
  function renderEfDependent() { renderDock(); renderEfull(); if (tab === 'bound' || tab === 'form') renderTab(); renderChallenges(); }
  function renderSelection() { renderEditor(); renderDock(); renderPanelsSelection(); }
  function renderHistory() { $('lab-undo').disabled = !undoS.length; $('lab-redo').disabled = !redoS.length; }
  function renderToolbar() {
    $('lab-preset').value = presetId || '';
    $('lab-nv').textContent = 'n = ' + st.n; $('lab-nm').disabled = st.n <= 2; $('lab-np').disabled = st.n >= 6;
    $('lab-mnote').textContent = st.n <= 5 ? '' : 'Con n = 6 l\'LP esatto (63 fattori) non viene risolto nel browser: tutto il resto sì.';
  }

  // --- editor
  function renderEditor() {
    const G = st.G, n = st.n; let mx = 0; for (let i = 0; i < n; i++) for (let j = i; j < n; j++) mx = Math.max(mx, G[i][j]);
    mx = Math.max(mx, 1);
    const isSel = (i, j) => sel && sel.i === i && sel.j === j;
    const sw = (w) => 1.8 + 4.6 * (w / mx);
    views.ed.paint({
      edge: (i, j) => { const w = G[i][j]; return w > EPS
        ? { cls: isSel(i, j) ? 'lab-pick' : '', sw: sw(w), label: fmt(w), lcls: 'off', title: `arco {${i + 1},${j + 1}}, peso ${gName(i, j)} = ${fmt(w)}` }
        : { cls: 'ghost' + (isSel(i, j) ? ' lab-pick' : ''), label: '', title: `arco {${i + 1},${j + 1}} assente (${gName(i, j)} = 0)` }; },
      loop: (i) => { const w = G[i][i]; return w > EPS
        ? { cls: isSel(i, i) ? 'lab-pick' : '', sw: sw(w), label: fmt(w), lcls: 'diag', title: `loop ℓ${sub(i + 1)}, peso ${gName(i, i)} = ${fmt(w)}` }
        : { cls: 'ghost' + (isSel(i, i) ? ' lab-pick' : ''), label: '', title: `loop ℓ${sub(i + 1)} di peso 0` }; },
      vtx: (i) => 'lab-grab' + (isSel(i, i) ? ' lab-pick' : ''),
    });
    if (mat) for (const [k, g] of mat.cells) {
      const [i, j] = k.split(',').map(Number); const a = Math.min(i, j), b = Math.max(i, j);
      g.querySelector('text').textContent = fmt(G[i][j]);
      g.setAttribute('class', 'cell ' + (i === j ? 'diag' : 'off') + (isSel(a, b) ? ' hl' : '') + (i !== j && G[i][j] <= EPS ? ' lab-zero' : ''));
      if (i <= j) g.setAttribute('aria-label', `${gName(i, j)} = ${fmt(G[i][j])}`);
    }
  }
  // --- dock
  function renderDock() {
    const chip = $('lab-chip'), seld = $('lab-seld');
    const on = !!sel;
    for (const id of ['lab-wm', 'lab-wp', 'lab-w0']) $(id).disabled = !on;
    wn.disabled = wr.disabled = !on;
    if (on) {
      const { i, j } = sel; const w = st.G[i][j];
      chip.textContent = gName(i, j) + ' = ' + fmt(w); chip.className = 'lab-chip ' + (i === j ? 'diag' : 'off');
      seld.innerHTML = i === j ? `loop ℓ${sub(i + 1)}<br>e arco radice (r,${i + 1})` : `arco {${i + 1},${j + 1}}<br>${w > EPS ? 'presente' : 'assente (peso 0)'}`;
      if (document.activeElement !== wn) wn.value = fmt(w);
      wr.max = Math.max(10, Math.ceil(w)); wr.value = w;
    } else { chip.textContent = 'nessuna selezione'; chip.className = 'lab-chip'; seld.textContent = 'clic su arco, vertice o cella'; }
    const r = res; if (!r) return;
    const efv = ef ? `<b class="${efStale ? 'lab-stale' : ''}" title="E_full(Γ): errore ℓ1 ottimo (LP esatto)">${fmt(ef.value)}</b>` : `<b title="E_full non calcolato per n = 6">·</b>`;
    const gap = ef ? ef.value - r.LB : null;
    const rel = gap === null ? '≥' : gap > 1e-6 ? '<span class="rel-geq">≥</span>' : '<span class="rel-eq">=</span>';
    $('lab-mini').innerHTML = `<span title="E_full(Γ): errore ℓ1 ottimo">E<sub>full</sub></span> ${efv} ${rel} <span title="LB = val(R) − γ: lower bound del rilassamento unilaterale">LB</span> <span class="rel-eq">=</span> <span title="M: valore del matching dei guadagni">M</span> <b>${fmt(r.M)}</b>` +
      (gap === null ? '' : gap > 1e-6 ? `<span class="lab-gapb pos" title="gap = E_full − LB">gap ${fmt(gap)}</span>` : '<span class="lab-gapb zero">esatto</span>');
  }

  // --- schede
  const chosenSpec = (G, ids, cyc, opt = {}) => ({
    edge: (i, j) => { const w = G[i][j], id = eid(i, j); if (w <= EPS) return { hide: true };
      const inn = ids.has(id); return { cls: inn ? 'lab-in' : 'lab-out', label: inn ? fmt(w) : '', lcls: 'off', halo: cyc && cyc.has(id), hit: true, title: `${elName(i, j)}: ${fmt(w)}${inn ? ' (scelto)' : ''}` }; },
    loop: opt.loops ? (i) => { const w = G[i][i], id = eid(i, i); if (w <= EPS) return { hide: true };
      const inn = ids.has(id); return { cls: inn ? 'lab-in' : 'lab-out', label: inn ? fmt(w) : '', lcls: 'diag', halo: cyc && cyc.has(id), title: `${elName(i, i)}: ${fmt(w)}${inn ? ' (scelto)' : ''}` }; } : null,
    root: opt.root ? (v) => { const w = G[v][v], id = 'r' + (v + 1); if (w <= EPS) return { hide: true };
      const inn = ids.has(id); return { cls: inn ? 'lab-in' : 'lab-out', label: inn ? fmt(w) : '', lcls: 'diag', title: `(r,${v + 1}): ${fmt(w)}${inn ? ' (scelto)' : ''}` }; } : null,
    vtx: (i) => (sel && sel.i === i && sel.j === i ? 'lab-pick' : ''),
  });
  // mini-legende vicine ai disegni (solo le voci usate)
  const SW = {
    line: (c, w = 4, dash = '') => `<svg class="lab-swl" viewBox="0 0 24 14" aria-hidden="true"><line x1="2" y1="7" x2="22" y2="7" stroke="${c}" stroke-width="${w}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/></svg>`,
    loop: (c, w = 3.5, dash = '') => `<svg class="lab-swl" viewBox="0 0 24 14" aria-hidden="true"><circle cx="12" cy="7" r="5.5" fill="none" stroke="${c}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/></svg>`,
    halo: () => '<svg class="lab-swl" viewBox="0 0 24 14" aria-hidden="true"><line x1="3" y1="7" x2="21" y2="7" stroke="#fff1c2" stroke-width="12" stroke-linecap="round"/><line x1="3" y1="7" x2="21" y2="7" stroke="#2563b8" stroke-width="3.5" stroke-linecap="round"/></svg>',
    ring: (c, dash = '', fill = '#fff') => `<svg class="lab-swl" viewBox="0 0 24 14" aria-hidden="true"><circle cx="12" cy="7" r="5.8" fill="${fill}" stroke="${c}" stroke-width="2.4"${dash ? ` stroke-dasharray="${dash}"` : ''}/></svg>`,
    arrow: (c) => `<svg class="lab-swl" viewBox="0 0 24 14" aria-hidden="true"><line x1="2" y1="7" x2="17" y2="7" stroke="${c}" stroke-width="2.6"/><path d="M15 2.5L22 7L15 11.5Z" fill="${c}"/></svg>`,
    box: (fill, stroke) => `<svg class="lab-swl" viewBox="0 0 24 14" aria-hidden="true"><rect x="5" y="1" width="14" height="12" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="2"/></svg>`,
  };
  const C = { off: '#2563b8', diag: '#c47a12', out: '#c3cbd8', match: '#d4570f', root: '#6b3fa0' };
  function legend(id, items) {
    const el = $(id); if (!el) return;
    const html = items.filter((x) => x[0]).map((x) => `<span>${x[1]}${x[2]}</span>`).join('');
    if (el.innerHTML !== html) el.innerHTML = html;
  }
  let lastVals = {};
  function setBig(id, v) {
    const el = $('lab-v-' + id); const s = fmt(v);
    if (el.textContent !== s) { el.textContent = s; if (lastVals[id] !== undefined) { el.classList.add('lab-flash'); setTimeout(() => el.classList.remove('lab-flash'), 450); } lastVals[id] = s; }
  }
  function renderPanels() {
    const r = res, G = st.G, n = st.n;
    views.forest.paint(chosenSpec(G, new Set(r.forest.T.map((e) => eid(e.u, e.v))), null));
    views.oneforest.paint(chosenSpec(G, new Set(r.oneF.F.map((e) => e.id)), r.cycOne));
    views.pseudo.paint(chosenSpec(G, new Set(r.ch.greedy.F.map((e) => e.id)), r.cycPseudo, { loops: true }));
    views.rooted.paint(chosenSpec(G, new Set(r.rooted.T.map((e) => (e.root ? 'r' + (e.v + 1) : eid(e.u, e.v)))), null, { root: true }));
    // trasversale
    const tv = views.transv; const owner = new Map();
    const ids = new Set(r.ch.greedy.F.map((e) => e.id));
    for (const a of r.tArrows) owner.set(a.v, a.e.type);
    tv.paint(Object.assign(chosenSpec(G, ids, null, { loops: true }), {
      vtx: (i) => (owner.get(i) === 'edge' ? 'lab-tv' : owner.get(i) === 'loop' ? 'lab-tl' : 'lab-tf'),
    }));
    for (const a of r.tArrows) {
      if (a.e.type === 'loop') continue;
      const it = tv.E.get(a.e.i + '-' + a.e.j); const from = it.g.at(0.5); const to = tv.P[a.v];
      const dx = to[0] - from[0], dy = to[1] - from[1], L = Math.hypot(dx, dy) || 1; const end = [to[0] - (dx / L) * (tv.vr + 5), to[1] - (dy / L) * (tv.vr + 5)];
      DR.arrow(tv.La, from[0], from[1], end[0], end[1], { bend: 16, cls: 'lab-tarr', marker: 'arrowhead-match' });
      const mid = [(from[0] + end[0]) / 2 - (dy / L) * 14, (from[1] + end[1]) / 2 + (dx / L) * 14];
      DR.text(tv.Lx, mid[0], mid[1], (a.g >= 0 ? '+' : '') + fmt(a.g), 'lab-gl');
    }
    const anyOut = (chosenIds, withLoops, withRoot) => {
      for (const [i, j] of BR.offPairs(n)) if (G[i][j] > EPS && !chosenIds.has(eid(i, j))) return true;
      for (let i = 0; i < n; i++) if (G[i][i] > EPS && ((withLoops && !chosenIds.has(eid(i, i))) || (withRoot && !chosenIds.has('r' + (i + 1))))) return true;
      return false;
    };
    const idsF = new Set(r.forest.T.map((e) => eid(e.u, e.v))), idsO = new Set(r.oneF.F.map((e) => e.id));
    const idsR = new Set(r.rooted.T.map((e) => (e.root ? 'r' + (e.v + 1) : eid(e.u, e.v))));
    const hasLoop = r.ch.greedy.F.some((e) => e.type === 'loop'), hasEdge = r.ch.greedy.F.some((e) => e.type === 'edge');
    legend('lab-lg-forest', [[idsF.size, SW.line(C.off), 'arco scelto'], [anyOut(idsF), SW.line(C.out, 2, '3 4'), 'arco scartato (chiuderebbe un ciclo)']]);
    legend('lab-lg-oneforest', [[idsO.size, SW.line(C.off), 'arco scelto'], [r.cycOne.size, SW.halo(), 'arco sul ciclo di una componente'], [anyOut(idsO), SW.line(C.out, 2, '3 4'), 'arco scartato']]);
    legend('lab-lg-pseudo', [[hasEdge, SW.line(C.off), 'arco scelto'], [hasLoop, SW.loop(C.diag), 'loop scelto'], [r.cycPseudo.size, SW.halo(), 'sul ciclo della componente'], [anyOut(ids, true), SW.line(C.out, 2, '3 4'), 'scartato']]);
    legend('lab-lg-rooted', [[r.rooted.T.some((e) => !e.root), SW.line(C.off), 'arco scelto'], [r.rooted.T.some((e) => e.root), SW.line(C.diag), 'arco radice $(r,i)$ scelto'], [anyOut(idsR, false, true), SW.line(C.out, 2, '3 4'), 'scartato'], [true, SW.ring(C.root, '', '#efe7fa'), 'radice $r$']]);
    legend('lab-lg-transv', [[r.tArrows.some((a) => a.e.type === 'edge'), SW.arrow(C.match), 'arco $\\to$ vertice, con il guadagno'], [r.tArrows.some((a) => a.e.type === 'loop'), SW.ring(C.diag), 'vertice preso dal suo loop'], [[...Array(n).keys()].some((v) => !owner.has(v)), SW.ring('#a0a8b8', '3 3'), 'vertice libero ($\\Gamma_{vv}=0$)']]);
    for (const k of ['rooted', 'transv']) DR.texAll($('lab-lg-' + k));
    setBig('forest', r.wForest); setBig('oneforest', r.wOne); setBig('pseudo', r.pseudo); setBig('rooted', r.Zcov);
    setBig('matching', r.M); setBig('transv', r.tGain);
    $('lab-n-transv').innerHTML = r.trans ? `$=w(F^*)-\\gamma=${fmt(r.pseudo)}-${fmt(r.gamma)}$` : 'nessuna assegnazione';
    renderMatching();
    DR.texAll($('lab-n-transv'));
  }
  function renderPanelsSelection() {
    // aggiorna solo l'evidenziazione del loop selezionato nelle schede
    for (const k of panelKeys) views[k].V.forEach((v, i) => v.classList.toggle('lab-pick', !!(sel && sel.i === i && sel.j === i)));
  }
  function renderMatching() {
    const r = res, G = st.G, n = st.n; const host = $('lab-p-matching');
    const left = [], links = [];
    for (const [i, j] of BR.offPairs(n)) {
      const gs = [i, j].map((v) => G[i][j] - G[v][v]);
      if (G[i][j] > EPS && (gs[0] > EPS || gs[1] > EPS)) {
        left.push({ id: eid(i, j), label: `{${i + 1},${j + 1}}`, cls: 'edge' });
        [i, j].forEach((v, k) => { if (gs[k] > EPS) links.push({ l: eid(i, j), r: 'v' + v, g: gs[k], i, j, v }); });
      }
    }
    const matched = new Set(r.ch.matching.pairs.map((p) => eid(p.i, p.j) + '|v' + p.v));
    const right = [...Array(n).keys()].map((v) => ({ id: 'v' + v, label: String(v + 1), cls: 'vert' }));
    const rows = Math.max(left.length, right.length), dy = rows > 9 ? 24 : 30, H = 46 + rows * dy;
    const svg = DR.svg(host, 320, H, 'Grafo bipartito archi-vertici del matching dei guadagni'); svg.classList.add('lab-svg');
    if (!left.length) {
      DR.text(svg, 160, H / 2, 'nessun guadagno positivo: M = 0', 'note', { 'text-anchor': 'middle' });
    } else {
      const bp = DR.bipartite(svg, left, right, links.map((l) => ({ l: l.l, r: l.r, cls: matched.has(l.l + '|' + l.r) ? 'on' : '', label: matched.has(l.l + '|' + l.r) ? '+' + fmt(l.g) : '', t: 0.42 })),
        { x1: 62, x2: 262, y0: 38, dy, w: 62, h: dy - 8, titles: ['archi', 'vertici'] });
      for (const l of links) { const e = bp.linkEls.get(l.l + '|' + l.r); if (e) DR.el('title', {}, e).textContent = `{${l.i + 1},${l.j + 1}} → ${l.v + 1}: guadagno ${gName(l.i, l.j)} − ${gName(l.v, l.v)} = ${fmt(l.g)}`; }
    }
    legend('lab-lg-matching', [[matched.size, SW.line(C.match, 4), 'assegnazione scelta (+ guadagno)'], [links.length > matched.size, SW.line('#c9d1df', 2), 'assegnazione possibile, guadagno > 0'], [left.length, SW.box('#e3edfb', C.off), 'arco $\\{i,j\\}$'], [left.length, SW.box('#fff', '#33405a'), 'vertice']]);
    DR.texAll($('lab-lg-matching'));
    const nz = BR.offPairs(n).filter(([i, j]) => G[i][j] > EPS).length - left.length;
    $('lab-n-matching').textContent = nz > 0 ? `${nz} ${nz === 1 ? 'arco' : 'archi'} senza guadagno positivo non ${nz === 1 ? 'mostrato' : 'mostrati'}` : '';
  }
  function renderEfull() {
    const host = $('lab-p-efull'), side = $('lab-ef-side'); const n = st.n, G = st.G;
    const big = $('lab-v-efull');
    if (n > 5 && efView !== 'yM') {
      host.innerHTML = '<div class="lab-msg">Troppo grande per l\'LP nel browser: con $n=6$ ci sono $2^6-1=63$ fattori $X_U$. Riduci $n$ (o guarda il certificato del matching).</div>';
      side.innerHTML = ''; big.textContent = '–'; $('lab-n-efull').textContent = ''; DR.texAll(host); return;
    }
    big.textContent = ef ? fmt(ef.value) : '–'; big.classList.toggle('lab-stale', efStale);
    $('lab-n-efull').innerHTML = ef && res ? (ef.value > res.LB + 1e-6 ? `<span class="no">gap ${fmt(ef.value - res.LB)}</span> sopra $\\LB=${fmt(res.LB)}$` : `<span class="ok">= LB</span>: bound esatto`) : '';
    DR.texAll($('lab-n-efull'));
    const c = n <= 4 ? 48 : 40; const W = 30 + n * c + 6;
    const svg = DR.svg(host, W, W + 4, efView === 'H' ? 'Matrice H ottima con errori colorati' : 'Matrice del certificato duale'); svg.classList.add('lab-svg');
    if (efView === 'H' && ef) {
      const kind = new Map(ef.err.cells.map((c2) => [c2.i + ',' + c2.j, c2.kind]));
      DR.matrix(svg, ef.H, { x: 30, y: 30, cell: c, upperOnly: true, cls: (i, j) => (i <= j ? kind.get(i + ',' + j) : '') });
      const terms = ef.terms.map((t) => `<span class="pill">$p_{${BR.setLabel(t.U).replace(/[{}]/g, '').length ? '\\{' + BR.toList(t.U).map((x) => x + 1).join(',') + '\\}' : ''}}=${fmt(t.c)}$</span>`).join('');
      side.innerHTML = `<div>$H=\\sum_U p_UX_U$ con</div><div class="lab-terms">${terms || '<span class="muted">tutti i $p_U=0$</span>'}</div>
        <div class="legend">${[['under', 'sottostima $H_{ij}<\\Gamma_{ij}$'], ['over', 'sovrastima $H_{ij}>\\Gamma_{ij}$'], ['exact', 'esatto']].filter(([k]) => ef.err.cells.some((c2) => c2.kind === k)).map(([k, t]) => `<span><i class="sw ${k}"></i>${t}</span>`).join('')}</div>
        <div class="small">errore: sottostime $${fmt(ef.err.diagUnder + ef.err.offUnder)}$ + sovrastime $${fmt(ef.err.diagOver + ef.err.offOver)}$ $=${fmt(ef.err.full)}$. L'ottimo può non essere unico.</div>`;
    } else if (efView === 'y' && ef) {
      DR.matrix(svg, ef.y, { x: 30, y: 30, cell: c, upperOnly: true, cls: (i, j) => (i > j ? '' : ef.y[i][j] > 1e-7 ? 'lab-yp' : ef.y[i][j] < -1e-7 ? 'lab-yn' : 'lab-y0') });
      side.innerHTML = `<div>Soluzione ottima di $(D_A)$ in coordinate di matrice.</div>${yLeg(ef.y)}
        <div class="small" style="margin-top:6px">$\\sum_{i\\le j}\\Gamma_{ij}y_{ij}=${fmt(ef.dval)}=\\Efull(\\Gamma)$; vincoli $\\sum_{i\\le j\\in U}y_{ij}\\le0$ per tutti i $2^n-1$ insiemi $U$ e $-1\\le y\\le1$: ${ef.dok ? '<span class="ok">ammissibile ✓</span>' : '<span class="no">non ammissibile</span>'}.</div>`;
    } else if (efView === 'yM' && res) {
      const y = res.yM;
      DR.matrix(svg, y, { x: 30, y: 30, cell: c, upperOnly: true, cls: (i, j) => (i > j ? '' : y[i][j] > 1e-7 ? 'lab-yp' : y[i][j] < -1e-7 ? 'lab-yn' : 'lab-y0') });
      side.innerHTML = `${yLeg(y)}<div>Certificato del matching: $+1$ su ogni arco assegnato $\\{i,j\\}\\to v$, $-1$ sulla diagonale $(v,v)$, cioè sull'arco radice $(r,v)$.</div>
        <div class="small" style="margin-top:6px">Valore $\\sum_{i\\le j}\\Gamma_{ij}y_{ij}=${fmt(res.dM.value)}=M$; ${res.dM.ok ? '<span class="ok">ammissibile per $(D_A)$ ✓</span>' : '<span class="no">non ammissibile</span>'}. È solo una famiglia di soluzioni di $(D_A)$${ef ? `: l'ottimo vale $${fmt(ef.value)}$` : ''}.</div>`;
    } else {
      host.innerHTML = '<div class="lab-msg">calcolo…</div>'; side.innerHTML = '';
    }
    DR.texAll(side);
  }

  function yLeg(y) {
    const n = y.length; let p = false, m = false;
    for (let i = 0; i < n; i++) for (let j = i; j < n; j++) { if (y[i][j] > 1e-7) p = true; if (y[i][j] < -1e-7) m = true; }
    return `<div class="legend">${p ? '<span><i class="sw" style="background:#dbe7fb;border-color:#2f5ea8"></i>$y_{ij}>0$</span>' : ''}${m ? '<span><i class="sw" style="background:#eceef3;border-color:#8a94a6"></i>$y_{ij}<0$</span>' : ''}</div>`;
  }
  // --- linguetta: catena dei bound
  function renderTab() {
    if (!res) return;
    if (tab === 'bound') renderBound(); else if (tab === 'anim') { buildAnimMode(); renderAnim(); }
    else if (tab === 'form') renderForms(); else if (tab === 'cert') renderCerts(); else if (tab === 'sfide') renderChallenges();
  }
  let chainBuilt = false;
  function renderBound() {
    const r = res; const box = $('lab-chain');
    if (!chainBuilt) {
      box.innerHTML = `
        <div class="lab-tok ef"><div class="tl">$\\Efull(\\Gamma)$<span class="lab-q" data-def="Efull"></span></div><div class="tv" id="lab-k-ef">–</div><div class="td">LP esatto $=z^*$<span class="lab-q" data-def="zstar"></span></div></div>
        <div class="lab-rel" id="lab-k-rel">≥</div>
        <div class="lab-tok"><div class="tl">$\\LB=\\val(R)-\\gamma$<span class="lab-q" data-def="LB"></span></div><div class="tv" id="lab-k-lb">–</div><div class="td" id="lab-k-lbd"></div></div>
        <div class="lab-rel eq">=</div>
        <div class="lab-tok"><div class="tl">$w(F^*)-\\gamma$<span class="lab-q" data-def="wF"></span></div><div class="tv" id="lab-k-wf">–</div><div class="td" id="lab-k-wfd"></div></div>
        <div class="lab-rel eq">=</div>
        <div class="lab-tok mm"><div class="tl">$M$<span class="lab-q" data-def="M"></span></div><div class="tv" id="lab-k-m">–</div><div class="td">matching dei guadagni</div></div>`;
      box.querySelectorAll('span.lab-q').forEach((s) => s.replaceWith(qBtn(s.dataset.def)));
      DR.texAll(box); chainBuilt = true;
    }
    $('lab-k-ef').textContent = ef ? fmt(ef.value) : st.n > 5 ? 'n = 6' : '…'; $('lab-k-ef').classList.toggle('lab-stale', efStale);
    $('lab-k-lb').textContent = fmt(r.LB); $('lab-k-wf').textContent = fmt(r.pseudo - r.gamma); $('lab-k-m').textContent = fmt(r.M);
    $('lab-k-lbd').textContent = `= ${fmt(r.valR)} − ${fmt(r.gamma)}  (peeling)`; $('lab-k-wfd').textContent = `= ${fmt(r.pseudo)} − ${fmt(r.gamma)}  (greedy)`;
    const gap = ef ? ef.value - r.LB : null; const rel = $('lab-k-rel');
    rel.textContent = gap !== null && gap <= 1e-6 ? '=' : '≥'; rel.className = 'lab-rel ' + (gap === null ? 'unk' : gap > 1e-6 ? 'geq' : 'eq');
    const v = $('lab-verdict');
    v.innerHTML = gap === null ? 'Con $n=6$ l\'ottimo $\\Efull$ non è calcolato; le tre uguaglianze valgono comunque.'
      : gap > 1e-6 ? `<span class="no">Il bound non è esatto:</span> gap $=\\Efull(\\Gamma)-\\LB=${fmt(gap)}$<span class="lab-q" data-def="gap"></span>. Le uguaglianze a destra valgono sempre; l'unica disuguaglianza è la prima.`
        : `<span class="ok">Bound esatto:</span> $\\Efull(\\Gamma)=\\LB=${fmt(r.LB)}$. (L'uguaglianza dei bound fra loro, invece, vale sempre.)`;
    v.querySelectorAll('span.lab-q').forEach((s) => s.replaceWith(qBtn(s.dataset.def))); DR.texAll(v);
    // barre
    const mx = Math.max(1, r.pseudo, ef ? ef.value : 0, r.Zcov);
    const pc = (x) => (100 * Math.max(0, x) / mx).toFixed(2) + '%';
    const row = (lab, def, segs, val, title) => `<div class="bl">${lab}${def ? `<span class="lab-q" data-def="${def}"></span>` : ''}</div><div class="bt" title="${title}">${segs.map(([c, x, t]) => `<i class="${c}" style="width:${pc(x)}" title="${t}"></i>`).join('')}</div><div class="bv">${val}</div>`;
    const bars = $('lab-bars');
    bars.innerHTML = [
      row('foresta', 'forest', [['b-offl', r.wForest, 'foresta: ' + fmt(r.wForest)]], fmt(r.wForest), 'peso della foresta massima'),
      row('1-foresta', 'oneF', [['b-off', r.wOne, '1-foresta: ' + fmt(r.wOne)]], fmt(r.wOne), 'peso della 1-foresta massima'),
      row('$\\Zcov$', 'Zcov', [['b-root', r.Zcov, 'Z_cov: ' + fmt(r.Zcov)]], fmt(r.Zcov), 'foresta del grafo bordato'),
      row('$\\val(P)=\\gamma+M$', 'gamma', [['b-diag', r.gamma, 'γ = ' + fmt(r.gamma)], ['b-match', r.M, 'M = ' + fmt(r.M)]], fmt(r.pseudo), 'pseudoforesta: γ (ambra) + M (arancio)'),
      '<div class="sep"></div>',
      ef ? row('$\\Efull=\\LB+\\text{gap}$', 'gap', [['b-match', r.LB, 'LB = M = ' + fmt(r.LB)], ['b-gap', ef.value - r.LB, 'gap = ' + fmt(ef.value - r.LB)]], fmt(ef.value), 'errore ottimo: LB (arancio) + gap (rosso)')
        : row('$\\LB=M$', 'LB', [['b-match', r.LB, 'LB = ' + fmt(r.LB)]], fmt(r.LB), 'lower bound'),
    ].join('');
    bars.querySelectorAll('span.lab-q').forEach((s) => s.replaceWith(qBtn(s.dataset.def))); DR.texAll(bars);
  }

  // --- linguetta: formulazioni
  const setTex = (id, html) => { const e = $(id); e.innerHTML = html; DR.texAll(e); };
  const pU = (U) => `p_{\\{${BR.toList(U).map((x) => x + 1).join(',')}\\}}`;
  const qL = (k) => `q_{${k.slice(1, 2)}${k.slice(2)}}`;
  function renderForms() {
    const r = res, pe = r.ch.peeling;
    const ps = pe.p.map((t) => `$${pU(t.U)}=${fmt(t.c)}$`).join(', ') || '$p=0$';
    const qs = Object.entries(pe.q).map(([k, v]) => `$${qL(k)}=${fmt(v)}$`).join(', ') || 'nessuna ($q=0$)';
    setTex('lab-fv-R', `$\\val(R)=${fmt(r.valR)}$<span class="lab-q" data-def="valR"></span>. Un ottimo dal peeling: ${ps}; sottostime pagate ${qs}. ${r.lamOk.ok ? '<span class="ok">ammissibile ✓</span>' : '<span class="no">non ammissibile</span>'} · $\\LB=${fmt(r.valR)}-${fmt(r.gamma)}=${fmt(r.LB)}$.`);
    const F = r.ch.greedy.F; const nl = F.filter((e) => e.type === 'loop').length;
    setTex('lab-fv-P', `$\\val(P)=w(F^*)=${fmt(r.pseudo)}$<span class="lab-q" data-def="wF"></span> con $F^*=\\{${F.map((e) => (e.type === 'loop' ? '\\ell_{' + (e.i + 1) + '}' : '\\{' + (e.i + 1) + ',' + (e.j + 1) + '\\}')).join(',\\ ')}\\}$ (${nl} loop, ${F.length - nl} archi). Dualità LP: $\\val(P)=\\val(R)$ ${Math.abs(r.pseudo - r.valR) < 1e-7 ? '<span class="ok">✓</span>' : '<span class="no">✗</span>'}.`);
    setTex('lab-fv-D', (ef ? `Ottimo $=\\dist_1(w,\\C(G,\\{r\\}))=\\Efull(\\Gamma)=${fmt(ef.value)}$<span class="lab-q" data-def="Efull"></span>. ` : 'Ottimo non calcolato per $n=6$. ') +
      `Il certificato del matching ($+1$ sugli archi assegnati, $-1$ sugli archi radice dei vertici usati) vale $M=${fmt(r.dM.value)}$: ${r.dM.ok ? '<span class="ok">ammissibile ✓</span>' : '<span class="no">non ammissibile</span>'}.`);
    setTex('lab-fv-B', `Dalla catena: $\\beta_i=\\alpha_i-\\Gamma_{ii}$, cioè $\\beta=(${r.beta.map(fmt).join(',\\ ')})$, con le stesse $q$. ${r.betaOk ? '<span class="ok">ammissibile ✓</span>' : '<span class="no">non ammissibile</span>'}; $\\sum_i\\beta_i+\\sum_{i<j}q_{ij}=${fmt(r.sumBetaQ)}$ e $M=${fmt(r.M)}$ ${Math.abs(r.sumBetaQ - r.M) < 1e-7 ? '<span class="ok">✓</span>' : ''}.`);
    for (const id of ['lab-fv-R', 'lab-fv-P', 'lab-fv-D', 'lab-fv-B']) $(id).querySelectorAll('span.lab-q').forEach((s) => s.replaceWith(qBtn(s.dataset.def)));
  }

  // --- linguetta: certificati
  function renderCerts() {
    const r = res, n = st.n, G = st.G, pe = r.ch.peeling;
    // laminare
    const sets = pe.p.map((t) => t.U); const lay = laminarLayout(n, sets);
    const D = Math.max(1, ...sets.map((U) => lay.depth.get(U) + 1)); const cw = Math.min(70, 380 / n), x0 = 20, rh = 30;
    const W = x0 * 2 + n * cw, Hh = 20 + D * (rh + 6) + 64;
    const svg = DR.svg($('lab-c-lam'), W, Hh, 'Famiglia laminare del peeling disegnata a livelli'); svg.classList.add('lab-svg');
    const col = (v) => x0 + lay.order.indexOf(v) * cw;
    const shades = ['#1f3a68', '#2f5ea8', '#5482c6', '#7ea2d6', '#a9c1e6'];
    if (!sets.length) DR.text(svg, W / 2, 30, 'p = 0: nessun insieme', 'note', { 'text-anchor': 'middle' });
    for (const t of pe.p) {
      const idx = BR.toList(t.U).map((v) => lay.order.indexOf(v)); const a = Math.min(...idx), b = Math.max(...idx);
      const d = lay.depth.get(t.U); const y = 14 + d * (rh + 6);
      const g = DR.el('g', { class: 'lab-lam' }, svg);
      DR.el('rect', { x: x0 + a * cw + 2, y, width: (b - a + 1) * cw - 4, height: rh, rx: 7, fill: shades[Math.min(d, 4)] }, g);
      const full = BR.setLabel(t.U) + '  p = ' + fmt(t.c), short = 'p=' + fmt(t.c);
      DR.text(g, x0 + ((a + b + 1) * cw) / 2, y + rh / 2, (b - a + 1) * cw > full.length * 7.6 + 8 ? full : short);
      DR.el('title', {}, g).textContent = `p_${BR.setLabel(t.U)} = ${fmt(t.c)}`;
    }
    const yb = 20 + D * (rh + 6);
    for (let v = 0; v < n; v++) {
      const x = col(v) + cw / 2;
      const g = DR.el('g', { class: 'vtx', transform: `translate(${x} ${yb + 14})` }, svg); DR.el('circle', { r: 13 }, g); DR.text(g, 0, 0, String(v + 1));
      DR.text(svg, x, yb + 42, 'α=' + fmt(r.alpha[v]), 'lab-sm');
    }
    const qs = Object.entries(pe.q).map(([k, v]) => `$${qL(k)}=${fmt(v)}$`).join(', ');
    setTex('lab-c-lamcap', `${sets.length} insiemi (al più $2n-1=${2 * n - 1}$), ${r.laminar ? '<span class="ok">laminare ✓</span>' : '<span class="no">non laminare</span>'}<span class="lab-q" data-def="lam"></span>; $(p,q)$ ${r.lamOk.ok ? '<span class="ok">ammissibile per $(R)$ ✓</span>' : '<span class="no">non ammissibile</span>'}; valore $\\sum_U|U|p_U+\\sum q=${fmt(pe.value)}=\\val(R)$. ${qs ? 'Sottostime pagate: ' + qs + '.' : 'Nessuna sottostima pagata.'}`);
    // catena
    const ord = [...Array(n).keys()].sort((a, b) => r.alpha[b] - r.alpha[a] || a - b);
    const top = Math.max(1, ...r.alpha, ...ord.map((v) => G[v][v]));
    const cw2 = Math.min(56, 300 / n), X0 = 34, Hc = 190, Y0 = 20, yS = (x) => Y0 + Hc - (Hc * x) / top;
    const W2 = X0 + n * cw2 + 170; const svg2 = DR.svg($('lab-c-chain'), W2, Hc + 70, 'Marginali alfa e insiemi di superlivello della catena'); svg2.classList.add('lab-svg');
    const cs2 = r.chainSets; const blues = ['#a9c1e6', '#7ea2d6', '#5482c6', '#2f5ea8', '#1f3a68', '#142a4f'];
    DR.el('line', { x1: X0 - 6, y1: yS(0), x2: X0 + n * cw2, y2: yS(0), class: 'axis', stroke: '#cfd6e4' }, svg2);
    cs2.forEach((t, k) => {
      const lo = k ? cs2[k - 1].level : 0;
      DR.el('line', { x1: X0 - 6, y1: yS(t.level), x2: X0 + n * cw2, y2: yS(t.level), class: 'lab-lvl' }, svg2);
      DR.text(svg2, X0 - 12, yS(t.level), 'θ' + sub(k + 1), 'lab-sm', { 'text-anchor': 'end' });
      ord.forEach((v, c) => { if (BR.has(t.U, v)) DR.el('rect', { x: X0 + c * cw2 + 4, y: yS(t.level), width: cw2 - 8, height: Math.max(0.5, yS(lo) - yS(t.level)), fill: blues[Math.min(k, 5)], stroke: '#fff', 'stroke-width': 2 }, svg2); });
      const lx = X0 + n * cw2 + 16;
      DR.el('rect', { x: lx, y: 14 + k * 24, width: 12, height: 12, rx: 3, fill: blues[Math.min(k, 5)] }, svg2);
      DR.text(svg2, lx + 18, 20 + k * 24, `S${sub(k + 1)}=${BR.setLabel(t.U)}  p=${fmt(t.c)}`, 'lab-sm', { 'text-anchor': 'start' });
    });
    ord.forEach((v, c) => {
      const x = X0 + c * cw2 + cw2 / 2;
      if (G[v][v] > EPS) { DR.el('line', { x1: x - cw2 / 2 + 2, x2: x + cw2 / 2 - 2, y1: yS(G[v][v]), y2: yS(G[v][v]), class: 'lab-tick' }, svg2); }
      DR.text(svg2, x, yS(r.alpha[v]) - 10, fmt(r.alpha[v]), 'lab-sm');
      const g = DR.el('g', { class: 'vtx', transform: `translate(${x} ${Y0 + Hc + 22})` }, svg2); DR.el('circle', { r: 13 }, g); DR.text(g, 0, 0, String(v + 1));
      DR.text(svg2, x, Y0 + Hc + 48, 'Γ=' + fmt(G[v][v]), 'lab-smd');
    });
    setTex('lab-c-chaincap', `Colonne: $\\alpha_i$ (vertici ordinati per $\\alpha$ decrescente); tacca ambra: $\\Gamma_{ii}$, da coprire ($\\alpha_i\\ge\\Gamma_{ii}$). ${cs2.length} insiemi annidati<span class="lab-q" data-def="chain"></span> (al più $n=${n}$); con le stesse $q$: ${r.chainOk.ok ? '<span class="ok">ammissibile ✓</span>' : '<span class="no">non ammissibile</span>'}, valore $${fmt(r.valChain)}=\\val(R)$ ${Math.abs(r.valChain - r.valR) < 1e-7 ? '<span class="ok">✓</span>' : ''}.`);
    for (const id of ['lab-c-lamcap', 'lab-c-chaincap']) $(id).querySelectorAll('span.lab-q').forEach((s) => s.replaceWith(qBtn(s.dataset.def)));
    // passi del peeling
    const lis = pe.steps.map((s) => s.kind === 'cycle'
      ? `<li>componente $${'\\{' + s.verts.map((v) => v + 1).join(',') + '\\}'}$ con un ciclo: $${pU(s.U)}\\mathrel{+}=${fmt(s.delta)}$, tutti i suoi elementi scendono di ${fmt(s.delta)}${s.removed.length ? '; si esauriscono ' + s.removed.map((id) => (id[0] === 'l' ? '$\\ell_{' + id.slice(1) + '}$' : '$\\{' + id[1] + ',' + id[2] + '\\}$')).join(', ') : ''}.</li>`
      : `<li>componente $${'\\{' + s.verts.map((v) => v + 1).join(',') + '\\}'}$ è un albero: i suoi archi diventano sottostime pagate (${s.elems.map((e) => `$${qL(e.id)}=${fmt(e.rest)}$`).join(', ')}).</li>`);
    const extra = pe.augmented.length ? `<li class="muted">archi aggiunti per connettere (a peso residuo): ${pe.augmented.map((e) => '$\\{' + (e.i + 1) + ',' + (e.j + 1) + '\\}$').join(', ')}.</li>` : '';
    setTex('lab-c-steps', (lis.join('') || '<li>nessun passo: $\\Gamma=0$.</li>') + extra);
  }

  // --- linguetta: moviola del greedy
  const anim = { mode: 'pseudo', k: Infinity, steps: [], timer: 0 };
  const MODES = [{ label: 'Foresta', value: 'forest' }, { label: '1-foresta', value: 'oneforest' }, { label: 'Pseudoforesta', value: 'pseudo' }, { label: 'Foresta bordata', value: 'rooted' }];
  let modeBtns = DR.toggle($('lab-an-mode'), MODES, (v) => { anim.mode = v; anim.k = Infinity; stop(); buildAnimMode(); renderAnim(); }, anim.mode);
  const ctl = $('lab-an-ctl');
  ctl.innerHTML = `<button type="button" class="btn" id="lab-a0" aria-label="Torna all'inizio">⏮</button><button type="button" class="btn" id="lab-ab">◀ Indietro</button><button type="button" class="btn primary" id="lab-ap">▶ Riproduci</button><button type="button" class="btn" id="lab-af">Avanti ▶</button><button type="button" class="btn" id="lab-ae" aria-label="Vai alla fine">⏭</button>`;
  $('lab-a0').addEventListener('click', () => { stop(); anim.k = 0; renderAnim(); });
  $('lab-ab').addEventListener('click', () => { stop(); anim.k = Math.max(0, Math.min(anim.k, anim.steps.length) - 1); renderAnim(); });
  $('lab-af').addEventListener('click', () => { stop(); anim.k = Math.min(anim.steps.length, anim.k + 1); renderAnim(); });
  $('lab-ae').addEventListener('click', () => { stop(); anim.k = anim.steps.length; renderAnim(); });
  $('lab-ap').addEventListener('click', () => (anim.timer ? stop() : play()));
  $('lab-an-trace').addEventListener('click', (ev) => { const row = ev.target.closest('.row'); if (row && row.dataset.k) { stop(); anim.k = +row.dataset.k; renderAnim(); } });
  function play(fromStart) {
    stop(); if (fromStart || anim.k >= anim.steps.length) anim.k = 0;
    $('lab-ap').textContent = '⏸ Pausa'; renderAnim();
    anim.timer = setInterval(() => { if (anim.k >= anim.steps.length) { stop(); return; } anim.k++; renderAnim(); }, 950);
  }
  function stop() { if (anim.timer) clearInterval(anim.timer); anim.timer = 0; const b = $('lab-ap'); if (b) b.textContent = '▶ Riproduci'; }
  function buildAnimMode() {
    if (!res) return;
    modeBtns.forEach((b, k) => b.classList.toggle('on', MODES[k].value === anim.mode));
    const n = st.n, r = res; let steps;
    if (anim.mode === 'forest') steps = r.forest.steps.map((s) => ({ key: eid(s.e.u, s.e.v), i: s.e.u, j: s.e.v, type: 'edge', w: s.e.w, accepted: s.accepted, reason: s.reason }));
    else if (anim.mode === 'rooted') steps = r.rooted.steps.map((s) => (s.e.root ? { key: 'r' + (s.e.v + 1), i: s.e.v, j: s.e.v, type: 'root', w: s.e.w, accepted: s.accepted, reason: s.reason }
      : { key: eid(s.e.u, s.e.v), i: s.e.u, j: s.e.v, type: 'edge', w: s.e.w, accepted: s.accepted, reason: s.reason }));
    else steps = (anim.mode === 'pseudo' ? r.ch.greedy : r.oneF).steps.map((s) => ({ key: s.el.id, i: s.el.i, j: s.el.j, type: s.el.type, w: s.el.w, accepted: s.accepted, reason: s.reason, comps: s.comps }));
    anim.steps = steps; void n;
  }
  function renderAnim() {
    if (!res) return;
    const steps = anim.steps, N = steps.length, k = Math.min(anim.k, N); const G = st.G, n = st.n;
    const status = new Map(); steps.forEach((s, t) => status.set(s.key, t < k - 1 ? (s.accepted ? 'acc' : 'rej') : t === k - 1 ? 'cur' : 'todo'));
    const last = k > 0 ? steps[k - 1] : null;
    const cyc = new Set(); if (last && last.comps) for (const c of last.comps) if (c.cyclic) c.verts.forEach((v) => cyc.add(v));
    const cls = (key) => { const s = status.get(key); return s === 'acc' ? 'sel' : s === 'rej' ? 'rej' : s === 'cur' ? 'lab-cur' : 'lab-out'; };
    const lc = (key, base) => (status.get(key) === 'todo' ? 'muted' : base);
    const m = anim.mode;
    views.anim.paint({
      edge: (i, j) => { const w = G[i][j]; if (w <= EPS) return { hide: true }; const key = eid(i, j); return { cls: cls(key), label: fmt(w), lcls: lc(key, 'off'), title: elName(i, j) }; },
      loop: m === 'pseudo' ? (i) => { const w = G[i][i]; if (w <= EPS) return { hide: true }; const key = eid(i, i); return { cls: cls(key), label: fmt(w), lcls: lc(key, 'diag'), title: elName(i, i) }; } : null,
      root: m === 'rooted' ? (v) => { const w = G[v][v]; if (w <= EPS) return { hide: true }; const key = 'r' + (v + 1); return { cls: cls(key), label: fmt(w), lcls: lc(key, 'diag'), title: '(r,' + (v + 1) + ')' }; } : null,
      vtx: (i) => (cyc.has(i) ? 'lab-cyc' : ''),
    });
    // le etichette dell'elemento in esame e degli accettati restano visibili, quelle in attesa sono attenuate
    const acc = steps.slice(0, k).filter((s) => s.accepted).reduce((s, x) => s + x.w, 0);
    const nm = (s) => (s.type === 'root' ? `(r,${s.i + 1})` : elName(s.i, s.j));
    const cap = $('lab-an-cap');
    cap.textContent = !N ? 'Nessun elemento di peso positivo: la soluzione è vuota.'
      : k === 0 ? `Ordine del greedy: ${N} elementi per peso non crescente${m === 'pseudo' ? ' (a parità, loop prima degli archi)' : ''}. Premi «Riproduci» o «Avanti».`
        : `Passo ${k} di ${N} — ${nm(last)}, peso ${fmt(last.w)}: ${last.accepted ? '✓ accettato' : '✗ rifiutato'} (${last.reason}). Peso accumulato: ${fmt(acc)}.` + (k === N ? ' Fine: soluzione ottima.' : '');
    const tr = $('lab-an-trace');
    tr.innerHTML = steps.map((s, t) => `<div class="row ${t < k - 1 ? (s.accepted ? 'acc' : 'rej') : t === k - 1 ? 'cur ' + (s.accepted ? 'acc' : 'rej') : 'todo'}" data-k="${t + 1}"><span>${t + 1}</span><span>${nm(s)}</span><span>${fmt(s.w)}</span><span><span class="st">${t < k ? (s.accepted ? '✓' : '✗') : '·'}</span> <span class="rs">${t < k ? s.reason : ''}</span></span></div>`).join('') || '<div class="row todo"><span></span><span>—</span><span></span><span>nessun elemento</span></div>';
    const cur = tr.querySelector('.row.cur'); if (cur) { const top = cur.offsetTop - tr.clientHeight / 2; tr.scrollTop = Math.max(0, top); }
    const seen = steps.slice(0, k);
    legend('lab-an-leg', [[seen.some((s, t) => s.accepted && t < k - 1), SW.line('#2e8b57', 5), 'accettato'], [seen.some((s, t) => !s.accepted && t < k - 1), SW.line('#c7354a', 3.4, '6 5'), 'rifiutato'], [k > 0 && k <= N, SW.line('#e0a106', 6), 'in esame'], [k < N, SW.line(C.out, 2, '3 4'), 'da esaminare'], [cyc.size > 0, SW.ring('#b7791f', '', '#fff1c2'), 'vertice di una componente che ha già il suo ciclo'], [m === 'rooted', SW.ring(C.root, '', '#efe7fa'), 'radice $r$']]);
    if (m === 'rooted') DR.texAll($('lab-an-leg'));
    $('lab-ab').disabled = k <= 0; $('lab-a0').disabled = k <= 0; $('lab-af').disabled = k >= N; $('lab-ae').disabled = k >= N;
  }

  // --- sfide
  let solved = new Set();
  try { solved = new Set(JSON.parse(localStorage.getItem('lab-sfide') || '[]')); } catch (e) { /* storage non disponibile */ }
  const sfBox = $('lab-sfide');
  sfBox.innerHTML = CHALLENGES.map((c) => `<div class="lab-sf" id="lab-sf-${c.id}"><span class="lamp" aria-hidden="true"></span><div><b>${c.t}</b> <span class="small muted" id="lab-sfs-${c.id}"></span><p>${c.d}</p><details><summary>Suggerimento</summary>${c.hint}</details></div></div>`).join('');
  DR.texAll(sfBox);
  let toastT = 0;
  function renderChallenges() {
    if (!res) return;
    for (const c of CHALLENGES) {
      const now = c.test(res, ef);
      if (now && userEdited && !solved.has(c.id)) {
        solved.add(c.id);
        try { localStorage.setItem('lab-sfide', JSON.stringify([...solved])); } catch (e) { /* ignora */ }
        const t = $('lab-toast'); t.textContent = '★ Sfida riuscita: ' + c.t; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3800);
      }
      const box = $('lab-sf-' + c.id); box.classList.toggle('on', solved.has(c.id)); box.classList.toggle('now', now && !solved.has(c.id));
      $('lab-sfs-' + c.id).textContent = solved.has(c.id) ? '— riuscita ✓' : now ? '— vera ora (ma su un esempio: modificalo a mano)' : '';
    }
    const cnt = $('lab-sfide-count'); cnt.textContent = solved.size + '/' + CHALLENGES.length; cnt.classList.toggle('some', solved.size > 0);
  }

  // ================================================================== avvio
  const h0 = decodeURIComponent(location.hash || '');
  const fromHash = h0.startsWith('#laboratorio=') ? decodeState(h0.slice('#laboratorio='.length)) : null;
  if (fromHash) {
    st = { n: fromHash.n, G: fromHash.G, pos: fromHash.pos }; posCustom = fromHash.custom; hashOn = true;
    const m = PRESETS.find((p) => encodeState({ n: fromHash.n, G: p.G(), pos: [] }, false) === encodeState(st, false)); presetId = m ? m.id : null;
  } else { const p = PRESETS[0]; st = { n: 3, G: p.G(), pos: defaultPos(3) }; presetId = p.id; }
  sel = firstEdge(st.G);
  for (const k of Object.keys(views)) views[k].build(st.n);
  buildMatrix();
  update();
  selectTab('bound');
  DR.texAll(sec);
  if (fromHash) {
    const go = () => sec.scrollIntoView({ block: 'start' });
    if (document.readyState === 'complete') setTimeout(go, 50); else window.addEventListener('load', () => setTimeout(go, 50));
  }
})();
