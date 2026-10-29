/* core.js — matematica del sito (nessuna dipendenza).
 *
 * Convenzioni
 *  - Γ è una matrice simmetrica non negativa n×n (array di array), indici interni 0..n-1,
 *    mostrati all'utente come 1..n.
 *  - Un sottoinsieme U ⊆ V = {1..n} è una bitmask intera (bit i ↔ vertice i+1).
 *  - Elementi del grafo con loop: { id:'l2', type:'loop', i:1, w } e { id:'e13', type:'edge', i:0, j:2, w }.
 *  - Errore L1 "completo" (E_full): somma su 1 ≤ i ≤ j ≤ n di |Γ_ij − H_ij|.
 *  - γ = Σ_i Γ_ii.  LB = val(R) − γ = w(F*) − γ = M (valore del matching dei guadagni).
 */
const BR = (() => {
  const EPS = 1e-9;
  // Messaggi mostrati all'utente, in due lingue (la lingua è quella di <html lang>).
  const MSG = {
    it: {
      loopAcc: 'loop in una componente aciclica: crea il suo unico ciclo',
      loopRej: 'loop rifiutato: la componente ha già un ciclo',
      joinMixed: 'unisce una componente con un ciclo e una aciclica',
      joinAcyc: 'unisce due componenti acicliche',
      joinRej: 'arco rifiutato: unirebbe due componenti che hanno già un ciclo ciascuna',
      innerAcc: 'arco interno a una componente aciclica: chiude il suo unico ciclo',
      innerRej: 'arco rifiutato: chiuderebbe un secondo ciclo nella stessa componente',
      treeAcc: 'collega due componenti',
      treeRej: 'chiuderebbe un ciclo (vietato nel matroide grafico)',
    },
    en: {
      loopAcc: 'loop in an acyclic component: it creates its only cycle',
      loopRej: 'loop rejected: the component already has a cycle',
      joinMixed: 'joins a component with a cycle and an acyclic one',
      joinAcyc: 'joins two acyclic components',
      joinRej: 'edge rejected: it would join two components that already have a cycle each',
      innerAcc: 'edge inside an acyclic component: it closes its only cycle',
      innerRej: 'edge rejected: it would close a second cycle in the same component',
      treeAcc: 'joins two components',
      treeRej: 'would close a cycle (forbidden in the graphic matroid)',
    },
  };
  const lang = () => (typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'it');
  const msg = (k) => MSG[lang()][k];

  // ------------------------------------------------------------------ insiemi
  const popcount = (U) => { let c = 0; while (U) { U &= U - 1; c++; } return c; };
  const has = (U, i) => ((U >> i) & 1) === 1;
  const toList = (U) => { const a = []; for (let i = 0; U >> i; i++) if (has(U, i)) a.push(i); return a; };
  const toMask = (list) => list.reduce((m, i) => m | (1 << i), 0);
  const setLabel = (U) => '{' + toList(U).map((i) => i + 1).join(',') + '}';
  const allSubsets = (n) => { const a = []; for (let U = 1; U < 1 << n; U++) a.push(U); return a; };

  // ------------------------------------------------------------------ matrici
  const size = (G) => G.length;
  const gamma = (G) => G.reduce((s, row, i) => s + row[i], 0);
  const clone = (G) => G.map((r) => r.slice());
  const zeros = (n) => Array.from({ length: n }, () => new Array(n).fill(0));
  const offPairs = (n) => { const a = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) a.push([i, j]); return a; };
  const entries = (n) => { const a = []; for (let i = 0; i < n; i++) for (let j = i; j < n; j++) a.push([i, j]); return a; };

  /** H = Σ c_U 1_U 1_Uᵀ ; terms = [{U, c}] */
  function combine(n, terms) {
    const H = zeros(n);
    for (const { U, c } of terms) for (const i of toList(U)) for (const j of toList(U)) H[i][j] += c;
    return H;
  }
  const factor = (n, U) => combine(n, [{ U, c: 1 }]);

  /** Classifica gli errori su 1 ≤ i ≤ j ≤ n.
   *  kind: 'under' (H < Γ, sottostima), 'over' (H > Γ, sovrastima), 'exact'.
   *  full = Σ |Γ−H| (E_full per questa H).
   *  oneSided = costo nel rilassamento R della stessa H con q minimo, cioè
   *             Σ_i (H_ii − Γ_ii) + Σ_{i<j} (Γ_ij − H_ij)^+ ; valido solo se H_ii ≥ Γ_ii ∀i
   *             (altrimenti diagFeasible = false: R richiede di coprire la diagonale).
   *  freeOver = Σ_{i<j} (H_ij − Γ_ij)^+ : sovrastime fuori diagonale, gratuite in R. */
  function errors(G, H) {
    const n = size(G); const cells = [];
    let full = 0, diagOver = 0, diagUnder = 0, offUnder = 0, offOver = 0;
    for (const [i, j] of entries(n)) {
      const d = H[i][j] - G[i][j];
      const kind = Math.abs(d) <= EPS ? 'exact' : d < 0 ? 'under' : 'over';
      cells.push({ i, j, diag: i === j, d, kind });
      full += Math.abs(d);
      if (i === j) { if (d > 0) diagOver += d; else diagUnder -= d; }
      else { if (d > 0) offOver += d; else offUnder -= d; }
    }
    const diagFeasible = diagUnder <= EPS;
    return { cells, full, diagOver, diagUnder, offUnder, offOver, freeOver: offOver,
      diagFeasible, oneSided: diagOver + offUnder };
  }

  // ------------------------------------------------------------------ elementi (loop + archi)
  function elements(G) {
    const n = size(G); const el = [];
    for (let i = 0; i < n; i++) el.push({ id: 'l' + (i + 1), type: 'loop', i, j: i, w: G[i][i] });
    for (const [i, j] of offPairs(n)) el.push({ id: 'e' + (i + 1) + (j + 1), type: 'edge', i, j, w: G[i][j] });
    return el;
  }
  const elemLabel = (e) => (e.type === 'loop' ? 'ℓ' + (e.i + 1) : '{' + (e.i + 1) + ',' + (e.j + 1) + '}');
  /** Ordine del greedy: peso non crescente; a parità, loop prima degli archi, poi indici. */
  function greedyOrder(el) {
    return el.filter((e) => e.w > EPS).sort((a, b) =>
      b.w - a.w || (a.type === b.type ? 0 : a.type === 'loop' ? -1 : 1) || a.i - b.i || a.j - b.j);
  }

  /** Componenti di (V, F) con almeno un elemento: [{verts:[...], elems:[...], cyclic}] */
  function components(n, F) {
    const parent = [...Array(n).keys()];
    const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    for (const e of F) parent[find(e.i)] = find(e.j);
    const map = new Map();
    for (const e of F) {
      const r = find(e.i);
      if (!map.has(r)) map.set(r, { verts: new Set(), elems: [] });
      const c = map.get(r); c.verts.add(e.i); c.verts.add(e.j); c.elems.push(e);
    }
    return [...map.values()].map((c) => {
      const verts = [...c.verts].sort((a, b) => a - b);
      // in una componente connessa: ciclica ⟺ #elementi ≥ #vertici (un loop è un circuito)
      return { verts, mask: toMask(verts), elems: c.elems, cyclic: c.elems.length >= verts.length,
        pseudo: c.elems.length <= verts.length };
    }).sort((a, b) => a.verts[0] - b.verts[0]);
  }

  /** F è una pseudoforesta ⟺ ogni componente ha #elementi ≤ #vertici ⟺ |F ∩ E[U]| ≤ |U| ∀U. */
  const isPseudoforest = (n, F) => components(n, F).every((c) => c.elems.length <= c.verts.length);

  /** Greedy per il matroide bicircolare (Algoritmo 1 del paper sulle pseudoforeste). */
  function greedyPseudoforest(G) {
    const n = size(G);
    const order = greedyOrder(elements(G));
    const F = []; const steps = [];
    const parent = [...Array(n).keys()]; const cyc = new Array(n).fill(false);
    const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    for (const e of order) {
      const a = find(e.i), b = find(e.j);
      let accepted, reason;
      if (e.type === 'loop') {
        accepted = !cyc[a];
        reason = accepted ? msg('loopAcc')
                          : msg('loopRej');
        if (accepted) cyc[a] = true;
      } else if (a !== b) {
        accepted = !(cyc[a] && cyc[b]);
        reason = accepted ? (cyc[a] || cyc[b] ? msg('joinMixed')
                                              : msg('joinAcyc'))
                          : msg('joinRej');
        if (accepted) { parent[a] = b; cyc[b] = cyc[a] || cyc[b]; }
      } else {
        accepted = !cyc[a];
        reason = accepted ? msg('innerAcc')
                          : msg('innerRej');
        if (accepted) cyc[a] = true;
      }
      if (accepted) F.push(e);
      steps.push({ el: e, accepted, reason, F: F.slice(), comps: components(n, F) });
    }
    return { order, steps, F, value: F.reduce((s, e) => s + e.w, 0) };
  }

  /** Assegnazione trasversale di un insieme indipendente: ogni elemento a un suo estremo,
   *  vertici tutti distinti (Kuhn). Restituisce Map id → vertice, oppure null se non esiste. */
  function transversal(n, F) {
    const owner = new Array(n).fill(null); // vertice → indice elemento
    const tryAssign = (k, seen) => {
      const e = F[k];
      for (const v of e.type === 'loop' ? [e.i] : [e.i, e.j]) {
        if (seen[v]) continue; seen[v] = true;
        if (owner[v] === null || tryAssign(owner[v], seen)) { owner[v] = k; return true; }
      }
      return false;
    };
    for (let k = 0; k < F.length; k++) if (!tryAssign(k, new Array(n).fill(false))) return null;
    const m = new Map();
    owner.forEach((k, v) => { if (k !== null) m.set(F[k].id, v); });
    return m;
  }

  // ------------------------------------------------------------------ matching dei guadagni
  /** Per ogni arco {i,j} e ogni estremo v: guadagno Γ_ij − Γ_vv (può essere ≤ 0). */
  function gains(G) {
    const out = [];
    for (const [i, j] of offPairs(size(G))) for (const v of [i, j]) out.push({ i, j, v, gain: G[i][j] - G[v][v] });
    return out;
  }

  /** Matching bipartito di peso massimo fra archi {i,j} e vertici, pesi (Γ_ij − Γ_vv)^+.
   *  Programmazione dinamica sugli archi con la maschera dei vertici usati (n ≤ ~12). */
  function maxGainMatching(G) {
    const n = size(G); const pairs = offPairs(n);
    let layer = new Map([[0, { val: 0, prev: null, pick: null }]]);
    const hist = [];
    for (const [i, j] of pairs) {
      const next = new Map();
      const put = (m, val, prev, pick) => { const o = next.get(m); if (!o || val > o.val + EPS) next.set(m, { val, prev, pick }); };
      for (const [m, s] of layer) {
        put(m, s.val, m, null);
        for (const v of [i, j]) {
          const g = G[i][j] - G[v][v];
          if (g > EPS && !has(m, v)) put(m | (1 << v), s.val + g, m, { i, j, v, gain: g });
        }
      }
      hist.push(next); layer = next;
    }
    let bestM = 0, best = -1;
    for (const [m, s] of layer) if (s.val > best + EPS) { best = s.val; bestM = m; }
    const chosen = [];
    for (let k = hist.length - 1, m = bestM; k >= 0; k--) {
      const s = hist[k].get(m);
      if (s.pick) chosen.push(s.pick);
      m = s.prev;
    }
    return { value: Math.max(0, best), pairs: chosen.reverse() };
  }

  /** Dalla scelta del matching alla pseudoforesta: archi assegnati + loop dei vertici liberi.
   *  Peso = γ + Σ guadagni. */
  function pseudoforestFromMatching(G, pairs) {
    const n = size(G); const used = new Set(pairs.map((p) => p.v));
    const F = pairs.map((p) => ({ id: 'e' + (p.i + 1) + (p.j + 1), type: 'edge', i: p.i, j: p.j, w: G[p.i][p.j], to: p.v }));
    for (let v = 0; v < n; v++) if (!used.has(v)) F.push({ id: 'l' + (v + 1), type: 'loop', i: v, j: v, w: G[v][v], to: v });
    return { F, value: F.reduce((s, e) => s + e.w, 0) };
  }

  // ------------------------------------------------------------------ peeling e catena
  /** Algoritmo 2 (component peeling) del paper sulle pseudoforeste.
   *  Restituisce un ottimo (p, q) di (R) e la sequenza dei passi. */
  function peeling(G) {
    const n = size(G);
    const gr = greedyPseudoforest(G);
    const Fbar = gr.F.slice(); const inF = new Set(Fbar.map((e) => e.id));
    const augmented = [];
    for (const e of greedyOrder(elements(G))) {
      if (inF.has(e.id)) continue;
      if (countComps(n, Fbar.concat([e])) < countComps(n, Fbar)) { // comp(V, F̄ ∪ {e}) < comp(V, F̄)
        Fbar.push(e); inF.add(e.id); augmented.push(e);
      }
    }
    const wt = new Map(Fbar.map((e) => [e.id, e.w]));
    const pMap = new Map(); const q = new Map(); const steps = [];
    let cur = Fbar.slice();
    let guard = 0;
    while (cur.length && guard++ < 1000) {
      const C = components(n, cur)[0];
      const isForest = C.elems.every((e) => e.type === 'edge') && C.elems.length === C.verts.length - 1;
      if (isForest) {
        for (const e of C.elems) q.set(e.id, (q.get(e.id) || 0) + wt.get(e.id));
        steps.push({ kind: 'tree', verts: C.verts, elems: C.elems.map((e) => ({ id: e.id, rest: wt.get(e.id) })) });
        const ids = new Set(C.elems.map((e) => e.id));
        cur = cur.filter((e) => !ids.has(e.id));
      } else {
        const delta = Math.min(...C.elems.map((e) => wt.get(e.id)));
        pMap.set(C.mask, (pMap.get(C.mask) || 0) + delta);
        const removed = [];
        for (const e of C.elems) { wt.set(e.id, wt.get(e.id) - delta); if (wt.get(e.id) <= EPS) removed.push(e.id); }
        steps.push({ kind: 'cycle', verts: C.verts, U: C.mask, delta, removed });
        const rm = new Set(removed);
        cur = cur.filter((e) => !rm.has(e.id));
      }
    }
    const p = [...pMap.entries()].map(([U, c]) => ({ U, c })).sort((a, b) => popcount(b.U) - popcount(a.U) || a.U - b.U);
    const qObj = {}; for (const [k, v] of q) if (v > EPS) qObj[k] = v;
    return { greedy: gr, augmented, Fbar, p, q: qObj, steps, value: valueR(G, p, qObj) };
  }
  const countComps = (n, F) => {
    const parent = [...Array(n).keys()];
    const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    for (const e of F) parent[find(e.i)] = find(e.j);
    return new Set([...Array(n).keys()].map(find)).size;
  };

  /** Valore di (R): Σ_U |U| p_U + Σ_{i<j} q_ij ; q = { 'e12': val, ... } */
  const valueR = (G, p, q) => p.reduce((s, t) => s + popcount(t.U) * t.c, 0) + Object.values(q).reduce((s, v) => s + v, 0);

  /** Verifica dei vincoli di (R). */
  function checkR(G, p, q) {
    const n = size(G); const H = combine(n, p); const bad = [];
    for (let i = 0; i < n; i++) if (H[i][i] < G[i][i] - 1e-7) bad.push('diag ' + (i + 1));
    for (const [i, j] of offPairs(n)) if (H[i][j] + (q['e' + (i + 1) + (j + 1)] || 0) < G[i][j] - 1e-7) bad.push((i + 1) + ',' + (j + 1));
    return { ok: bad.length === 0, bad };
  }

  /** Marginali α_v = Σ_{U∋v} p_U. */
  const marginals = (n, p) => { const a = new Array(n).fill(0); for (const { U, c } of p) for (const i of toList(U)) a[i] += c; return a; };

  /** Sollevamento a catena (insiemi di superlivello): S_k = {v : α_v ≥ θ_k}, p'_{S_k} = θ_k − θ_{k−1}. */
  function chainFromAlpha(alpha) {
    const th = [...new Set(alpha.filter((a) => a > EPS).map((a) => +a.toFixed(12)))].sort((a, b) => a - b);
    const out = []; let prev = 0;
    for (const t of th) { out.push({ U: toMask(alpha.map((a, i) => (a >= t - EPS ? i : -1)).filter((i) => i >= 0)), c: t - prev, level: t }); prev = t; }
    return out;
  }

  // ------------------------------------------------------------------ catena di uguaglianze
  /** Tutti i numeri della catena: γ, w(F*), val(R) dal peeling, LB, M, e (se n ≤ 5) E_full. */
  function chain(G, { withEfull = true } = {}) {
    const n = size(G); const g = gamma(G);
    const gr = greedyPseudoforest(G); const pe = peeling(G); const mm = maxGainMatching(G);
    const res = { n, gamma: g, pseudoforest: gr.value, valR: pe.value, LB: pe.value - g, M: mm.value,
      greedy: gr, peeling: pe, matching: mm };
    if (withEfull && n <= 5) { res.efull = efull(G); res.efullDual = efullDual(G); }
    return res;
  }

  // ------------------------------------------------------------------ matroide grafico (AWCD)
  /** Massima foresta ricoprente (Kruskal) su una lista di archi [{u,v,w,label}] su nv vertici. */
  function maxSpanningForest(nv, edges) {
    const parent = [...Array(nv).keys()];
    const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    const steps = []; const T = [];
    for (const e of edges.filter((e) => e.w > EPS).sort((a, b) => b.w - a.w)) {
      const a = find(e.u), b = find(e.v); const ok = a !== b;
      if (ok) { parent[a] = b; T.push(e); }
      steps.push({ e, accepted: ok, reason: ok ? msg('treeAcc') : msg('treeRej') });
    }
    return { T, steps, value: T.reduce((s, e) => s + e.w, 0) };
  }
  /** Grafo bordato di AWCD: vertici 0..n-1 e radice r = n; w_{r v} = Γ_vv, w_{uv} = Γ_uv. */
  function rootedEdges(G) {
    const n = size(G); const E = [];
    for (let v = 0; v < n; v++) E.push({ u: n, v, w: G[v][v], root: true, label: 'r' + (v + 1) });
    for (const [i, j] of offPairs(n)) E.push({ u: i, v: j, w: G[i][j], root: false, label: (i + 1) + '' + (j + 1) });
    return E;
  }

  // ------------------------------------------------------------------ certificati duali AWCD
  /** Certificato del matching (Prop. distbounds(b)): per ogni coppia (arco ij → vertice v)
   *  y_ij = +1 sull'arco e y_{rv} = −1 sull'arco radice. In coordinate di matrice: y[i][j] e y[v][v]. */
  function matchingCertificate(G, pairs) {
    const n = size(G); const y = zeros(n);
    for (const { i, j, v } of pairs) { y[i][j] += 1; y[j][i] = y[i][j]; y[v][v] -= 1; }
    return y;
  }
  /** Ammissibilità in (D_A) (coordinate di matrice): −1 ≤ y ≤ 1 e Σ_{i≤j∈U} y_ij ≤ 0 per ogni U.
   *  Valore = Σ_{i≤j} Γ_ij y_ij. */
  function checkDual(G, y) {
    const n = size(G); const rows = [];
    let boxOk = true;
    for (const [i, j] of entries(n)) if (Math.abs(y[i][j]) > 1 + 1e-9) boxOk = false;
    for (const U of allSubsets(n)) {
      const L = toList(U); let s = 0;
      for (let a = 0; a < L.length; a++) for (let b = a; b < L.length; b++) s += y[L[a]][L[b]];
      rows.push({ U, sum: s, ok: s <= 1e-9 });
    }
    let value = 0; for (const [i, j] of entries(n)) value += G[i][j] * y[i][j];
    return { rows, boxOk, ok: boxOk && rows.every((r) => r.ok), value };
  }

  // ------------------------------------------------------------------ LP (simplesso a due fasi, Bland)
  /** min c·x  s.t.  rows: [{a:[...], op:'<='|'>='|'=', b}],  x ≥ 0.  Per problemi piccoli. */
  function simplex(c, rows) {
    const nx = c.length;
    const R = rows.map((r) => (r.b < 0 ? { a: r.a.map((v) => -v), op: r.op === '<=' ? '>=' : r.op === '>=' ? '<=' : '=', b: -r.b } : { a: r.a.slice(), op: r.op, b: r.b }));
    const m = R.length;
    let ns = 0, na = 0; R.forEach((r) => { if (r.op !== '=') ns++; if (r.op !== '<=') na++; });
    const N = nx + ns + na;
    const T = R.map(() => new Array(N + 1).fill(0)); const basis = new Array(m);
    let si = nx, ai = nx + ns;
    R.forEach((r, k) => {
      for (let j = 0; j < nx; j++) T[k][j] = r.a[j];
      T[k][N] = r.b;
      if (r.op === '<=') { T[k][si] = 1; basis[k] = si++; }
      else if (r.op === '>=') { T[k][si++] = -1; T[k][ai] = 1; basis[k] = ai++; }
      else { T[k][ai] = 1; basis[k] = ai++; }
    });
    const isArt = (j) => j >= nx + ns;
    const pivot = (r, col) => {
      const pv = T[r][col]; for (let j = 0; j <= N; j++) T[r][j] /= pv;
      for (let k = 0; k < m; k++) if (k !== r && Math.abs(T[k][col]) > 1e-14) { const f = T[k][col]; for (let j = 0; j <= N; j++) T[k][j] -= f * T[r][j]; }
      basis[r] = col;
    };
    const run = (cost, allowed) => {
      for (let it = 0; it < 5000; it++) {
        let enter = -1;
        for (let j = 0; j < N; j++) {
          if (!allowed(j) || basis.includes(j)) continue;
          let rc = cost[j]; for (let k = 0; k < m; k++) rc -= cost[basis[k]] * T[k][j];
          if (rc < -1e-10) { enter = j; break; }
        }
        if (enter < 0) return true;
        let leave = -1, best = Infinity;
        for (let k = 0; k < m; k++) if (T[k][enter] > 1e-12) {
          const ratio = T[k][N] / T[k][enter];
          if (ratio < best - 1e-12 || (Math.abs(ratio - best) <= 1e-12 && basis[k] < basis[leave])) { best = ratio; leave = k; }
        }
        if (leave < 0) return false; // illimitato
        pivot(leave, enter);
      }
      return false;
    };
    const c1 = new Array(N).fill(0); for (let j = nx + ns; j < N; j++) c1[j] = 1;
    run(c1, () => true);
    let infeas = 0; for (let k = 0; k < m; k++) if (isArt(basis[k])) infeas += T[k][N];
    if (infeas > 1e-7) return { status: 'infeasible' };
    for (let k = 0; k < m; k++) if (isArt(basis[k])) {
      const j = [...Array(nx + ns).keys()].find((j) => Math.abs(T[k][j]) > 1e-9);
      if (j !== undefined) pivot(k, j);
    }
    const c2 = new Array(N).fill(0); for (let j = 0; j < nx; j++) c2[j] = c[j];
    if (!run(c2, (j) => !isArt(j))) return { status: 'unbounded' };
    const x = new Array(nx).fill(0); basis.forEach((b, k) => { if (b < nx) x[b] = T[k][N]; });
    return { status: 'optimal', x, value: x.reduce((s, v, j) => s + v * c[j], 0) };
  }

  /** E_full(Γ) = min_{p≥0} Σ_{i≤j} |Γ_ij − Σ_{U⊇{i,j}} p_U|  (n ≤ 5). */
  function efull(G) {
    const n = size(G); const S = allSubsets(n); const E = entries(n); const m = E.length;
    const nv = S.length + 2 * m;
    const c = new Array(nv).fill(0); for (let k = S.length; k < nv; k++) c[k] = 1;
    const rows = E.map(([i, j], r) => {
      const a = new Array(nv).fill(0);
      S.forEach((U, k) => { if (has(U, i) && has(U, j)) a[k] = 1; });
      a[S.length + r] = 1; a[S.length + m + r] = -1; // s⁺ (sottostima) e s⁻ (sovrastima)
      return { a, op: '=', b: G[i][j] };
    });
    const res = simplex(c, rows);
    const terms = S.map((U, k) => ({ U, c: res.x[k] })).filter((t) => t.c > 1e-9);
    return { value: res.value, terms, H: combine(n, terms) };
  }

  /** Duale di E_full (= (D_A) di AWCD in coordinate di matrice):
   *  max Σ_{i≤j} Γ_ij y_ij  s.t.  Σ_{i≤j∈U} y_ij ≤ 0 ∀U,  −1 ≤ y ≤ 1. */
  function efullDual(G) {
    const n = size(G); const E = entries(n); const m = E.length;
    // y = u − 1, u ∈ [0, 2]
    const c = E.map(([i, j]) => -G[i][j]);
    const rows = [];
    for (const U of allSubsets(n)) {
      const a = E.map(([i, j]) => (has(U, i) && has(U, j) ? 1 : 0));
      rows.push({ a, op: '<=', b: a.reduce((s, v) => s + v, 0) });
    }
    E.forEach((_, k) => { const a = new Array(m).fill(0); a[k] = 1; rows.push({ a, op: '<=', b: 2 }); });
    const res = simplex(c, rows);
    const y = zeros(n);
    E.forEach(([i, j], k) => { y[i][j] = y[j][i] = res.x[k] - 1; });
    return { value: -res.value - E.reduce((s, [i, j]) => s + G[i][j], 0), y };
  }

  // ------------------------------------------------------------------ formattazione
  const fmt = (x, d = 3) => {
    if (Math.abs(x) < 1e-9) return '0';
    const r = Math.round(x);
    return Math.abs(x - r) < 1e-9 ? String(r) : (+x.toFixed(d)).toString();
  };

  return {
    EPS, popcount, has, toList, toMask, setLabel, allSubsets,
    size, gamma, clone, zeros, offPairs, entries, combine, factor, errors,
    elements, elemLabel, greedyOrder, components, isPseudoforest, greedyPseudoforest, transversal,
    gains, maxGainMatching, pseudoforestFromMatching,
    peeling, valueR, checkR, marginals, chainFromAlpha, chain,
    maxSpanningForest, rootedEdges, matchingCertificate, checkDual,
    simplex, efull, efullDual, fmt, lang, MSG,
  };
})();
if (typeof module !== 'undefined') module.exports = BR;
