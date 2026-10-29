// Read-only copy of the code embedded in index.html, for easier reading.
// The tool itself runs from index.html; changes must be made there.

// ---------- Travel optimizer ----------
const OPT = (() => {
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const fmt = (v, d) => {
    let s = v.toFixed(d);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    if (s.startsWith('0.')) s = s.slice(1);
    else if (s.startsWith('-0.')) s = '-' + s.slice(2);
    if (s === '-0' || s === '' || s === '-') s = '0';
    return s;
  };
  const MOVE_TYPES = new Set(['ext', 'travel', 'wipe', 'retract', 'unretract', 'z', 'f']);
  // feature-type comments: PrusaSlicer/SuperSlicer/Orca/Cura/ideaMaker (;TYPE:), Bambu/Orca (; FEATURE:), Simplify3D (; feature)
  const TYPE_RE = /^;\s*(TYPE:|FEATURE:|feature )/;
  // layer markers, in order of preference (a file may contain several kinds)
  const LAYER_MARKERS = [
    { id: 'prusa', re: /^;LAYER_CHANGE\b/ },          // PrusaSlicer, SuperSlicer, OrcaSlicer
    { id: 'bambu', re: /^; CHANGE_LAYER\b/ },         // Bambu Studio
    { id: 'cura', re: /^;LAYER:-?\d+/ },              // Cura, ideaMaker, KISSlicer-style
    { id: 's3d', re: /^; layer \d+, Z = / },          // Simplify3D
  ];
  // where the end G-code starts (after the last layer marker)
  const END_RE = /^(;TYPE:Custom|; ?MACHINE_END_GCODE_START|; EXECUTABLE_BLOCK_END|;TIME_ELAPSED|;End of Gcode|;\s*END_GCODE|; filament end gcode|;\s*Filament-specific end gcode)/i;

  function layerMarker(lines) {
    for (const mk of LAYER_MARKERS) if (lines.some(l => mk.re.test(l))) return mk;
    return null;
  }
  function layerStarts(lines) {
    const mk = layerMarker(lines);
    const s = [];
    if (mk) lines.forEach((l, i) => { if (mk.re.test(l)) s.push(i); });
    return s;
  }

  function detectSlicer(text) {
    const head = text.slice(0, 20000) + text.slice(-20000);
    const list = [
      [/SuperSlicer/i, 'SuperSlicer'], [/OrcaSlicer/i, 'OrcaSlicer'], [/BambuStudio|Bambu Studio/i, 'Bambu Studio'],
      [/PrusaSlicer/i, 'PrusaSlicer'], [/Cura_SteamEngine|;FLAVOR:/i, 'Cura'], [/Simplify3D/i, 'Simplify3D'],
      [/ideaMaker/i, 'ideaMaker'], [/KISSlicer/i, 'KISSlicer'], [/Slic3r/i, 'Slic3r'],
    ];
    for (const [re, n] of list) if (re.test(head)) return n;
    return null;
  }

  // absolute extrusion (M82) -> relative (M83); everything else stays as is
  function toRelativeE(text) {
    if (!/^M82\b/m.test(text)) return { text, converted: false };
    const lines = text.split(/\r?\n/);
    const out = [];
    let abs = true, g91 = false, last = 0, inserted = false;
    const eRe = /E\s*([-+]?(?:\d*\.\d+|\d+\.?))/i;
    for (const raw of lines) {
      const sc = raw.indexOf(';');
      const code = (sc >= 0 ? raw.slice(0, sc) : raw).trim();
      const cmt = sc >= 0 ? raw.slice(sc) : '';
      if (/^M82\b/i.test(code)) { abs = true; inserted = true; out.push('M83 ; converted from M82: relative extrusion'); continue; }
      if (/^M83\b/i.test(code)) { abs = false; out.push(raw); continue; }
      if (/^G91\b/i.test(code)) { g91 = true; out.push(raw); continue; }
      if (/^G90\b/i.test(code)) { g91 = false; out.push(raw); if (abs && inserted) out.push('M83'); continue; }
      if (/^G92\b/i.test(code)) { const m = eRe.exec(code.slice(3)); if (m && abs && !g91) last = parseFloat(m[1]); out.push(raw); continue; }
      if (abs && !g91 && /^G[0-3]\b/i.test(code)) {
        const m = eRe.exec(code.slice(2));
        if (m) {
          const e = parseFloat(m[1]);
          const r = e - last;
          last = e;
          if (!inserted) { out.push('M83 ; converted to relative extrusion'); inserted = true; }
          const nc = code.slice(0, 2) + code.slice(2).replace(eRe, 'E' + fmt(r, 5));
          out.push(nc + (cmt ? ' ' + cmt : ''));
          continue;
        }
      }
      out.push(raw);
    }
    return { text: out.join('\n'), converted: true };
  }

  // ---- tokenizer: classifies every line and tracks the machine state ----
  function tokenize(lines) {
    const toks = new Array(lines.length);
    let x = 0, y = 0, z = 0, f = 0, accel = null, m82 = false, rel = false;
    const wordRe = /([A-Za-z])\s*([-+]?(?:\d*\.\d+|\d+\.?))/g;
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const sc = raw.indexOf(';');
      const code = (sc >= 0 ? raw.slice(0, sc) : raw).trim();
      const tk = { raw, x0: x, y0: y, fPrev: f, accelPrev: accel };
      if (!code) {
        tk.t = TYPE_RE.test(raw) ? 'type' : 'comment';
      } else {
        const m = /^([GM])(\d+)(\.\d+)?/i.exec(code);
        const cmd = m ? m[1].toUpperCase() + m[2] : '';
        tk.cmd = cmd;
        if (rel && (cmd === 'G0' || cmd === 'G1' || cmd === 'G2' || cmd === 'G3')) {
          // relative positioning (G91): passed through untouched, position follows the deltas
          tk.t = 'bad';
          const rest = code.slice(m[0].length);
          let mm;
          wordRe.lastIndex = 0;
          while ((mm = wordRe.exec(rest))) {
            const k = mm[1].toUpperCase(), v = parseFloat(mm[2]);
            if (k === 'X') x += v; else if (k === 'Y') y += v; else if (k === 'Z') z += v; else if (k === 'F') f = v;
          }
        } else if (cmd === 'G0' || cmd === 'G1' || cmd === 'G2' || cmd === 'G3') {
          const w = {};
          const rest = code.slice(m[0].length);
          let mm;
          wordRe.lastIndex = 0;
          while ((mm = wordRe.exec(rest))) w[mm[1].toUpperCase()] = parseFloat(mm[2]);
          const hasXY = 'X' in w || 'Y' in w, hasE = 'E' in w, hasZ = 'Z' in w;
          const e = hasE ? w.E : 0;
          const nx = 'X' in w ? w.X : x, ny = 'Y' in w ? w.Y : y;
          if ('F' in w) { f = w.F; tk.Fp = w.F; }
          tk.e = e;
          if (cmd === 'G2' || cmd === 'G3') {
            if ('R' in w || hasZ) tk.t = 'bad';
            else if (!(e > 0)) tk.t = 'wipe'; // arc wipe / non-extruding arc
            else { tk.t = 'ext'; tk.i = w.I || 0; tk.j = w.J || 0; }
          } else if (hasXY && e > 0) tk.t = hasZ ? 'bad' : 'ext';
          else if (hasXY && e < 0) tk.t = 'wipe';
          else if (hasXY) tk.t = 'travel';
          else if (hasE && e !== 0) tk.t = hasZ ? 'bad' : (e < 0 ? 'retract' : 'unretract');
          else if (hasZ) tk.t = 'z';
          else tk.t = 'f';
          x = nx; y = ny;
          if (hasZ) z = w.Z;
        } else if (cmd === 'G92') {
          tk.t = /[XYZ]/i.test(code.slice(3)) ? 'bad' : 'g92';
        } else if (cmd === 'G91') { tk.t = 'bad'; rel = true; }
        else if (cmd === 'G90') { tk.t = 'other'; rel = false; }
        else if (cmd === 'G10' && /^G10$/i.test(code)) tk.t = 'fwr';   // firmware retract
        else if (cmd === 'G11' && /^G11$/i.test(code)) tk.t = 'fwu';   // firmware unretract
        else if (cmd === 'M82') { tk.t = 'bad'; m82 = true; }
        else if (cmd === 'M73') tk.t = 'm73';
        else if (cmd === 'M204') { tk.t = 'm204'; accel = code; }
        else tk.t = 'other';
      }
      tk.x = x; tk.y = y; tk.z = z; tk.f = f; tk.accel = accel;
      toks[i] = tk;
    }
    return { toks, m82 };
  }

  function setXY(raw, x, y) {
    const sc = raw.indexOf(';');
    let code = sc >= 0 ? raw.slice(0, sc) : raw;
    const cmt = sc >= 0 ? ' ' + raw.slice(sc) : '';
    const m = /^\s*G[0-3]/i.exec(code);
    code = code.slice(m[0].length).replace(/\s*[XY]\s*[-+]?(?:\d*\.\d+|\d+\.?)/gi, '');
    return (`${m[0].trim()} X${fmt(x, 3)} Y${fmt(y, 3)}` + code.replace(/\s+$/, '')).replace(/\s+/g, ' ') + cmt;
  }
  function stripXY(raw) {
    const sc = raw.indexOf(';');
    let code = sc >= 0 ? raw.slice(0, sc) : raw;
    code = code.replace(/\s*[XY]\s*[-+]?(?:\d*\.\d+|\d+\.?)/gi, '').trim();
    return /^G[0-3]$/i.test(code) ? null : code;
  }

  // ---- geometry helpers ----
  const flip = { G1: 'G1', G2: 'G3', G3: 'G2' };
  function mkSeg(tk) {
    const cmd = tk.cmd === 'G0' ? 'G1' : tk.cmd;
    const a = [tk.x0, tk.y0], b = [tk.x, tk.y];
    if (cmd === 'G1') return { cmd, a, b, e: tk.e, f: tk.f, c: null, len: dist(a, b), pre: null };
    const c = [tk.x0 + tk.i, tk.y0 + tk.j];
    return { cmd, a, b, e: tk.e, f: tk.f, c, len: arcLen(cmd, a, b, c), pre: null };
  }
  // true length of a G2 (clockwise) / G3 (counter-clockwise) arc; start == end is a full circle
  function arcLen(cmd, a, b, c) {
    const r = dist(a, c);
    let sweep = Math.atan2(b[1] - c[1], b[0] - c[0]) - Math.atan2(a[1] - c[1], a[0] - c[0]);
    if (cmd === 'G3') { if (sweep <= 1e-9) sweep += 2 * Math.PI; }
    else if (sweep >= -1e-9) sweep -= 2 * Math.PI;
    return r * Math.abs(sweep);
  }
  const segPt = (s, t) => t <= 0 ? s.a : t >= 1 ? s.b : [s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t];
  function nearestOnChain(ch, p) {
    let best = null;
    const n = ch.segs.length;
    for (let s = 0; s < n; s++) {
      const sg = ch.segs[s];
      if (sg.cmd === 'G1' && sg.len > 1e-9) {
        const dx = sg.b[0] - sg.a[0], dy = sg.b[1] - sg.a[1];
        let t = ((p[0] - sg.a[0]) * dx + (p[1] - sg.a[1]) * dy) / (dx * dx + dy * dy);
        t = Math.max(0, Math.min(1, t));
        const q = segPt(sg, t), d = dist(p, q);
        if (!best || d < best.d) best = { d, loc: { s, t }, pt: q };
      } else {
        for (const t of [0, 1]) {
          const q = t ? sg.b : sg.a, d = dist(p, q);
          if (!best || d < best.d) best = { d, loc: { s, t }, pt: q };
        }
      }
    }
    if (best.loc.t >= 1 - 1e-9 && best.loc.s + 1 < n) best.loc = { s: best.loc.s + 1, t: 0 };
    if (best.loc.t <= 1e-9) best.loc.t = 0;
    return best;
  }

  function finishChain(ch, o) {
    const segs = ch.segs, n = segs.length;
    ch.start = segs[0].a; ch.end = segs[n - 1].b;
    ch.len = segs.reduce((s, g) => s + g.len, 0);
    ch.gap = dist(ch.start, ch.end);
    ch.closed = n >= 3 && ch.gap <= o.closeTol && ch.len > 4 * Math.max(ch.gap, 0.05);
    if (ch.closed && ch.gap > 1e-4) {
      const last = segs[n - 1];
      const ratio = last.cmd === 'G1' && last.len > 1e-6 ? last.e / last.len
        : segs.reduce((s, g) => s + g.e, 0) / Math.max(ch.len, 1e-6);
      ch.closeSeg = { cmd: 'G1', a: ch.end, b: ch.start, e: ch.gap * ratio, f: last.f, c: null, len: ch.gap, pre: null };
    }
    if (!ch.closed) {
      ch.rsegs = segs.slice().reverse().map(s => ({ cmd: flip[s.cmd], a: s.b, b: s.a, e: s.e, f: s.f, c: s.c, len: s.len, pre: s.pre }));
    }
  }

  // ---- split a layer into extrusion chains / travel blocks ----
  const CHAIN_INNER = new Set(['f', 'comment', 'm73', 'g92']);
  const BLOCK_OK = new Set(['travel', 'wipe', 'retract', 'unretract', 'fwr', 'fwu', 'z', 'f', 'g92', 'm204', 'comment', 'm73']);
  function analyzeLayer(toks, a, b, o) {
    const chains = [];
    let cur = null, pend = [];
    for (let i = a; i < b; i++) {
      const tk = toks[i];
      if (tk.t === 'bad') return null;
      if (tk.t === 'ext') {
        if (!cur) { cur = { segs: [], si: i, ei: i, accel: tk.accelPrev }; chains.push(cur); pend = []; }
        const sg = mkSeg(tk);
        const pre = pend.filter(p => p.t !== 'f' && p.raw.trim() !== '').map(p => p.raw);
        if (pre.length) sg.pre = pre;
        pend = [];
        cur.segs.push(sg); cur.ei = i;
      } else if (cur && CHAIN_INNER.has(tk.t)) pend.push(tk);
      else { cur = null; pend = []; }
    }
    if (!chains.length) return null;
    const layerZ = toks[chains[0].si].z;
    for (const ch of chains) {
      for (let i = ch.si; i <= ch.ei; i++) if (toks[i].t === 'ext' && Math.abs(toks[i].z - layerZ) > 1e-6) return null;
    }
    // blocks between chains -> lead lines + run boundaries
    const runs = [[chains[0]]];
    chains[0].lead = [];
    for (let k = 1; k < chains.length; k++) {
      const ch = chains[k];
      let boundary = false;
      const lead = [];
      for (let i = chains[k - 1].ei + 1; i < ch.si; i++) {
        const tk = toks[i];
        if (!BLOCK_OK.has(tk.t)) boundary = true;
        if (tk.t === 'comment' || tk.t === 'type' || tk.t === 'other' || tk.t === 'm73') {
          if (tk.raw.trim() !== '' && !/^;\s*WIPE_/.test(tk.raw)) lead.push(tk.raw);
        }
      }
      ch.lead = lead;
      if (boundary) runs.push([ch]); else runs[runs.length - 1].push(ch);
    }
    for (const ch of chains) finishChain(ch, o);
    const res = { chains, runs, layerZ, headerEnd: chains[0].si, footerStart: chains[chains.length - 1].ei + 1, removed: [], tailLead: [] };
    // drop short stand-alone extrusions; their state lines move to the next kept chain
    if (o.removeShort > 0) {
      const keep = chains.filter(ch => ch.len >= o.removeShort);
      if (keep.length && keep.length < chains.length) {
        let carry = [];
        for (const ch of chains) {
          if (ch.len < o.removeShort) { carry = carry.concat(ch.lead); res.removed.push(ch); }
          else if (carry.length) { ch.lead = carry.concat(ch.lead); carry = []; }
        }
        res.tailLead = carry;
        res.chains = keep;
        res.runs = runs.map(r => r.filter(ch => ch.len >= o.removeShort)).filter(r => r.length);
        // lines that preceded the first kept chain stay at the layer start
        res.headLead = keep[0].lead;
        keep[0].lead = [];
      }
    }
    return res;
  }

  // ---- planning ----
  function bestEntry(ch, p, o) {
    if (ch.closed) {
      if (o.rotate) {
        const nr = nearestOnChain(ch, p);
        const d0 = dist(p, ch.start);
        if (d0 - nr.d > o.rotateMin && !(nr.loc.s === 0 && nr.loc.t === 0))
          return { mode: 'rot', loc: nr.loc, entry: nr.pt, exit: nr.pt };
      }
    } else if (o.reverse && dist(p, ch.end) + 1e-6 < dist(p, ch.start)) {
      return { mode: 'rev', entry: ch.end, exit: ch.start };
    }
    return { mode: 'orig', entry: ch.start, exit: ch.end };
  }

  function assignDetours(chains, o, prefer) {
    const hostMap = new Map(), isDetour = new Set(), isHost = new Set();
    const sorted = chains.slice().sort((a, b) => a.len - b.len);
    for (const X of sorted) {
      if (isHost.has(X) || X === prefer) continue;
      let best = null;
      for (const H of chains) {
        if (H === X || !H.closed || isDetour.has(H) || (H.len <= X.len && H !== prefer)) continue;
        if (X.closed) {
          X.segs.forEach((sg, k) => {
            const nq = nearestOnChain(H, sg.a), c = 2 * nq.d + X.gap;
            if (!best || c < best.c) best = { c, H, loc: nq.loc, item: { chain: X, mode: k === 0 ? 'orig' : 'rot', loc: { s: k, t: 0 }, entry: sg.a } };
          });
        } else {
          for (const rev of (o.reverse ? [false, true] : [false])) {
            const en = rev ? X.end : X.start, ex = rev ? X.start : X.end;
            const nq = nearestOnChain(H, en), c = nq.d + dist(ex, nq.pt);
            if (!best || c < best.c) best = { c, H, loc: nq.loc, item: { chain: X, mode: rev ? 'rev' : 'orig', entry: en } };
          }
        }
      }
      if (best && best.c <= o.detourMax) {
        isDetour.add(X); isHost.add(best.H);
        if (!hostMap.has(best.H)) hostMap.set(best.H, []);
        hostMap.get(best.H).push({ loc: best.loc, item: best.item });
      }
    }
    return { hostMap, isDetour };
  }

  function buildPlan(L, startPos, o, greedy, detours) {
    let pos = startPos;
    const items = [];
    for (const run of L.runs) {
      let prefer = null;
      if (detours === 2) {
        let bd = Infinity;
        for (const c of run) { const d = dist(pos, bestEntry(c, pos, o).entry); if (c.closed && d < bd) { bd = d; prefer = c; } }
      }
      const { hostMap, isDetour } = detours ? assignDetours(run, o, prefer) : { hostMap: new Map(), isDetour: new Set() };
      const rem = run.filter(c => !isDetour.has(c));
      let firstOfRun = true;
      while (rem.length) {
        let pick = 0, be = bestEntry(rem[0], pos, o);
        if (greedy) {
          for (let k = 1; k < rem.length; k++) {
            const b2 = bestEntry(rem[k], pos, o);
            if (dist(pos, b2.entry) < dist(pos, be.entry) - 1e-6) { pick = k; be = b2; }
          }
        }
        const ch = rem.splice(pick, 1)[0];
        items.push(Object.assign({ chain: ch, detours: hostMap.get(ch) || [] }, be));
        pos = be.exit;
        firstOfRun = false;
      }
    }
    return items;
  }

  // ---- emission (also used as dry run for cost) ----
  function out(S, line) { if (!S.dry) S.out.push(line); }

  function travel(S, to) {
    const d = dist(S.pos, to);
    S.cost += d + (d >= 0.05 ? o_pen(S) : 0);
    S.dist += d;
    if (d >= 0.05) S.nTrav++;
    if (d < 1e-3) { S.pos = to; return; }
    const P = S.params;
    const retract = d >= S.o.minRetract && (P.retract > 0 || P.fw);
    if (retract) {
      S.nRetr++;
      out(S, P.fw ? 'G10' : `G1 E-${fmt(P.retract, 5)} F${fmt(P.rF, 0)}`);
      if (P.hop > 0) out(S, `G1 Z${fmt(S.z + P.hop, 3)} F${fmt(P.zF, 0)}`);
    }
    out(S, `G1 X${fmt(to[0], 3)} Y${fmt(to[1], 3)} F${fmt(P.travelF, 0)}`);
    S.f = P.travelF;
    if (retract) {
      if (P.hop > 0) { out(S, `G1 Z${fmt(S.z, 3)} F${fmt(P.zF, 0)}`); S.f = P.zF; }
      if (P.fw) out(S, 'G11');
      else { out(S, `G1 E${fmt(P.unretract, 5)} F${fmt(P.uF, 0)}`); S.f = P.uF; }
    }
    S.pos = to;
  }
  const o_pen = (S) => S.o.travelPenalty;

  function buildOps(item) {
    const ch = item.chain;
    const segs = item.mode === 'rev' ? ch.rsegs : ch.segs;
    const n = segs.length;
    let pieces;
    if (item.mode === 'rot') {
      const { s, t } = item.loc;
      pieces = [];
      if (t < 1) pieces.push({ seg: segs[s], si: s, t0: t, t1: 1 });
      for (let k = s + 1; k < n; k++) pieces.push({ seg: segs[k], si: k, t0: 0, t1: 1 });
      if (ch.closeSeg) pieces.push({ seg: ch.closeSeg, si: n, t0: 0, t1: 1 });
      for (let k = 0; k < s; k++) pieces.push({ seg: segs[k], si: k, t0: 0, t1: 1 });
      if (t > 0) pieces.push({ seg: segs[s], si: s, t0: 0, t1: t });
    } else pieces = segs.map((seg, k) => ({ seg, si: k, t0: 0, t1: 1 }));
    const dets = (item.detours || []).map(d => ({ loc: d.loc, item: d.item, used: false }));
    const ops = [];
    for (const pc of pieces) {
      const cuts = dets.filter(d => !d.used && d.loc.s === pc.si && d.loc.t >= pc.t0 - 1e-9 && d.loc.t <= pc.t1 + 1e-9)
        .sort((a, b) => a.loc.t - b.loc.t);
      let cur = pc.t0;
      for (const d of cuts) {
        d.used = true;
        if (d.loc.t > cur + 1e-9) { ops.push({ seg: pc.seg, t0: cur, t1: d.loc.t }); cur = d.loc.t; }
        ops.push({ detour: d.item });
      }
      if (pc.t1 > cur + 1e-9) ops.push({ seg: pc.seg, t0: cur, t1: pc.t1 });
    }
    for (const d of dets) if (!d.used) ops.push({ detour: d.item });
    if (item.mode === 'rot' && ch.gap > 1e-4) {
      // keep the original seam gap (loop clipping) at the new seam
      let rem = ch.gap;
      while (rem > 1e-6 && ops.length) {
        const op = ops[ops.length - 1];
        if (op.detour || op.seg.cmd !== 'G1' || op.seg.len < 1e-9) break;
        const Lp = op.seg.len * (op.t1 - op.t0);
        if (Lp <= rem + 1e-9) { ops.pop(); rem -= Lp; }
        else { op.t1 -= rem / op.seg.len; rem = 0; }
      }
    }
    return ops;
  }

  function emitItem(S, item) {
    const ch = item.chain;
    if (ch.accel && ch.accel !== S.accel) { out(S, ch.accel); S.accel = ch.accel; }
    for (const op of buildOps(item)) {
      if (op.detour) {
        const q = S.pos;
        travel(S, op.detour.entry);
        if (op.detour.chain.lead) for (const l of op.detour.chain.lead) out(S, l);
        emitItem(S, op.detour);
        travel(S, q);
        if (ch.accel && ch.accel !== S.accel) { out(S, ch.accel); S.accel = ch.accel; }
        continue;
      }
      const sg = op.seg;
      const p0 = segPt(sg, op.t0), p1 = segPt(sg, op.t1);
      if (dist(S.pos, p0) > 2e-3) travel(S, p0);
      if (op.t0 === 0 && sg.pre) for (const l of sg.pre) out(S, l);
      const e = sg.e * (op.t1 - op.t0);
      let line;
      if (sg.cmd === 'G1') line = `G1 X${fmt(p1[0], 3)} Y${fmt(p1[1], 3)} E${fmt(e, 5)}`;
      else line = `${sg.cmd} X${fmt(p1[0], 3)} Y${fmt(p1[1], 3)} I${fmt(sg.c[0] - p0[0], 3)} J${fmt(sg.c[1] - p0[1], 3)} E${fmt(e, 5)}`;
      if (sg.f !== S.f) { line += ` F${fmt(sg.f, 3)}`; S.f = sg.f; }
      out(S, line);
      S.e += e;
      S.pos = p1;
    }
  }

  function emitPlan(S, items) {
    items.forEach((item, k) => {
      if (k > 0) {
        travel(S, item.entry);
        for (const l of item.chain.lead) out(S, l);
      }
      emitItem(S, item);
    });
  }

  // ---- verbatim emission that repairs position / modal state after a modified layer ----
  function vEmit(S, tk) {
    if (tk.t === 'm204') { S.out.push(tk.raw); S.accel = tk.accel; return; }
    if (!MOVE_TYPES.has(tk.t)) { S.out.push(tk.raw); return; }
    let raw = tk.raw;
    if (!S.sync) {
      if (tk.t === 'travel') { raw = setXY(raw, tk.x, tk.y); S.sync = true; }
      else if (tk.t === 'wipe') raw = `G1 E${fmt(tk.e, 5)}` + (tk.Fp !== undefined ? ` F${fmt(tk.Fp, 3)}` : '');
      else if (tk.t === 'ext') { travel(S, [tk.x0, tk.y0]); S.sync = true; }
    }
    if (tk.t === 'ext' && tk.accelPrev && S.accel !== tk.accelPrev) { S.out.push(tk.accelPrev); S.accel = tk.accelPrev; }
    if (tk.Fp === undefined && tk.t !== 'f' && S.f !== tk.fPrev) S.out.push(`G1 F${fmt(tk.fPrev, 3)}`);
    S.out.push(raw);
    S.f = tk.f;
    S.z = tk.z;
    if (S.sync) S.pos = [tk.x, tk.y];
  }

  function learnParams(toks, from, cfg) {
    const P = { retract: 0, rF: 2100, unretract: 0, uF: 1500, travelF: 12000, hop: 0, zF: 720, fw: false };
    let fallback = null;
    let lastExt = -1;
    for (let i = from; i < toks.length; i++) {
      const tk = toks[i];
      if (tk.t === 'z' && tk.Fp !== undefined) P.zF = tk.Fp;
      if (tk.t !== 'ext') continue;
      if (lastExt >= 0 && i > lastExt + 1) {
        let r = 0, rF = null, u = 0, uF = null, tF = null, zmax = -1e9, nt = 0, fw = false;
        for (let k = lastExt + 1; k < i; k++) {
          const b = toks[k];
          if (b.t === 'retract' || b.t === 'wipe') { r -= b.e; if (b.t === 'retract' && rF === null) rF = b.f; }
          if (b.t === 'unretract') { u += b.e; if (uF === null) uF = b.f; }
          if (b.t === 'fwr') fw = true;
          if (b.t === 'travel') { nt++; if (tF === null) tF = b.f; }
          if (b.t === 'travel' || b.t === 'z') zmax = Math.max(zmax, b.z);
        }
        if (nt && (r > 0 || fw)) {
          const cand = { retract: r, rF: rF || P.rF, unretract: u, uF: uF || P.uF, travelF: tF || P.travelF, hop: 0, zF: P.zF, fw };
          if (Math.abs(toks[lastExt].z - tk.z) < 1e-6) {
            cand.hop = Math.max(0, zmax - tk.z);
            Object.assign(P, cand);
            P.source = 'travel';
            return P;
          }
          if (!fallback) fallback = cand;
        }
      }
      lastExt = i;
    }
    if (fallback) { Object.assign(P, fallback); P.source = 'layerchange'; }
    else P.source = 'default';
    if (cfg && cfg.travel_speed) P.travelF = parseFloat(cfg.travel_speed) * 60;
    return P;
  }

  // ---- travel statistics of a G-code text (independent check) ----
  function stats(text) {
    const lines = text.split(/\r?\n/);
    const { toks } = tokenize(lines);
    const isStart = new Set(layerStarts(lines));
    const layers = [];
    let cur = { dist: 0, n: 0, n1: 0, e: 0 }, started = false, total = { dist: 0, n: 0, n1: 0, n5: 0 };
    for (let i = 0; i < toks.length; i++) {
      const tk = toks[i];
      if (isStart.has(i)) { if (started) layers.push(cur); cur = { dist: 0, n: 0, n1: 0, e: 0 }; started = true; }
      if (!started) continue;
      if (tk.t === 'travel' || tk.t === 'wipe') {
        const d = dist([tk.x0, tk.y0], [tk.x, tk.y]);
        cur.dist += d; total.dist += d;
        if (d >= 0.05) { cur.n++; total.n++; }
        if (d >= 1) { cur.n1++; total.n1++; }
        if (d >= 5) total.n5++;
      }
      if (tk.t === 'ext') cur.e += tk.e;
    }
    if (started) layers.push(cur);
    return { layers, total };
  }

  function readConfig(text) {
    const cfg = {};
    const re = /^;?[ \t]*([a-z_0-9]+)[ \t]*=[ \t]*(.*)$/gm;
    let m;
    const tail = text.length > 400000 ? text.slice(-400000) : text;
    while ((m = re.exec(tail))) cfg[m[1]] = m[2];
    return cfg;
  }

  // ---- main ----
  function optimize(text, o, cfg) {
    const lines = text.split(/\r?\n/);
    if (lines.length && lines[lines.length - 1] === '') lines.pop();
    const { toks, m82 } = tokenize(lines);
    if (m82) throw new Error('ERR_M82');
    const starts = layerStarts(lines);
    if (!starts.length) throw new Error('ERR_NO_LAYERS');
    let endIdx = lines.length;
    for (let i = starts[starts.length - 1]; i < lines.length; i++) if (END_RE.test(lines[i])) { endIdx = i; break; }
    const params = learnParams(toks, starts[0], cfg);

    const S = { out: [], pos: [0, 0], f: 0, z: 0, accel: null, sync: true, params, o, dry: false, cost: 0, dist: 0, nTrav: 0, nRetr: 0, e: 0 };
    for (let i = 0; i < starts[0]; i++) vEmit(S, toks[i]);
    const report = [];
    for (let li = 0; li < starts.length; li++) {
      const a = starts[li], b = li + 1 < starts.length ? starts[li + 1] : endIdx;
      const L = analyzeLayer(toks, a, b, o);
      let done = false;
      const startPos = S.pos;
      if (L) {
        // original travel cost from the actual start position
        let oc = 0, on = 0, first = true;
        for (let i = a; i < L.footerStart; i++) {
          const tk = toks[i];
          if (tk.t === 'travel' || tk.t === 'wipe') {
            const d = dist(first ? startPos : [tk.x0, tk.y0], [tk.x, tk.y]);
            first = false;
            oc += d; if (d >= 0.05) { on++; oc += o.travelPenalty; }
          } else if (tk.t === 'ext' && first) {
            const d = dist(startPos, [tk.x0, tk.y0]); first = false; oc += d; if (d >= 0.05) { on++; oc += o.travelPenalty; }
          }
        }
        let best = null;
        const combos = [[false, false]];
        if (o.reorder) combos.push([true, false]);
        if (o.detours) for (const dm of [1, 2]) { combos.push([false, dm]); if (o.reorder) combos.push([true, dm]); }
        for (const [g, d] of combos) {
          const items = buildPlan(L, startPos, o, g, d);
          const D = { dry: true, pos: startPos, f: S.f, z: L.layerZ, accel: S.accel, params, o, cost: 0, dist: 0, nTrav: 0, nRetr: 0, e: 0 };
          const d0 = dist(startPos, items[0].entry);
          D.cost += d0 + (d0 >= 0.05 ? o.travelPenalty : 0); D.dist += d0; if (d0 >= 0.05) D.nTrav++;
          D.pos = items[0].entry;
          emitPlan(D, items);
          if (!best || D.cost < best.D.cost - 1e-9) best = { D, items };
        }
        const nRem = L.removed.length;
        if (nRem || best.D.cost < oc - o.minGain) {
          done = true;
          emitLayer(S, toks, a, b, L, best.items, o);
          const remLen = L.removed.reduce((s, c) => s + c.len, 0);
          const remE = L.removed.reduce((s, c) => s + c.segs.reduce((t, g) => t + g.e, 0), 0);
          report.push({ layer: li + 1, before: oc, after: best.D.cost, nBefore: on, nAfter: best.D.nTrav, removed: nRem, remLen, remE });
        }
      }
      if (!done) {
        const skip = L ? layerRetractSkip(toks, a, L.headerEnd, startPos, null, o) : null;
        for (let i = a; i < b; i++) if (!skip || !skip.has(i)) vEmit(S, toks[i]);
      }
    }
    for (let i = endIdx; i < lines.length; i++) vEmit(S, toks[i]);
    return { text: S.out.join('\n') + '\n', report, params };
  }

  // optional: drop retract/unretract at layer change when the travel is short
  function layerRetractSkip(toks, a, hEnd, startPos, target, o) {
    if (!o.dropLayerRetract) return null;
    let tgt = target;
    const r = [], u = [];
    for (let i = a; i < hEnd; i++) {
      const tk = toks[i];
      if (tk.t === 'wipe') return null;
      if (tk.t === 'travel' && !target) tgt = [tk.x, tk.y];
      if (tk.t === 'retract' || tk.t === 'fwr') r.push(i);
      if (tk.t === 'unretract' || tk.t === 'fwu') u.push(i);
    }
    if (!tgt) tgt = [toks[hEnd].x0, toks[hEnd].y0];
    if (!r.length || dist(startPos, tgt) >= o.minRetract) return null;
    const nfr = r.filter(i => toks[i].t === 'fwr').length, nfu = u.filter(i => toks[i].t === 'fwu').length;
    if (nfr !== nfu) return null;
    const sr = r.reduce((s, i) => s + (toks[i].e || 0), 0), su = u.reduce((s, i) => s + (toks[i].e || 0), 0);
    if (Math.abs(sr + su) > 1e-4) return null;
    return new Set([...r, ...u]);
  }

  // Layer change with a short travel to the new start: replace the slicer's lift / travel / Z-hop
  // sequence by one ramp move. Retraction (and wipes) are dropped too if the slicer only added them
  // because the original travel was long (or if the user asked to drop layer-change retraction).
  function compactHeader(S, toks, a, hEnd, entry, layerZ, o) {
    if (!o.compactLayerChange || dist(S.pos, entry) >= o.minRetract) return null;
    const MOTION = new Set(['travel', 'z', 'f', 'wipe', 'retract', 'unretract', 'fwr', 'fwu']);
    let pos = -1, rampF = null, zPrev = S.z, eSum = 0, nfr = 0, nfu = 0, hasRetr = false, lastTarget = null;
    for (let i = a; i < hEnd; i++) {
      const tk = toks[i];
      if (tk.t === 'travel' || tk.t === 'z') {
        if (tk.t === 'travel') lastTarget = [tk.x, tk.y];
        // Z speed: the slowest feedrate the slicer used for Z moves here (its ramp or "G1 Z.. F720")
        if (tk.z > zPrev + 1e-6 || (tk.t === 'z' && tk.Fp !== undefined)) rampF = rampF === null ? tk.f : Math.min(rampF, tk.f);
        zPrev = tk.z;
        if (tk.t === 'travel' || pos < 0) pos = i;
      }
      if (tk.t === 'retract' || tk.t === 'wipe' || tk.t === 'unretract') { eSum += tk.e; hasRetr = true; }
      if (tk.t === 'fwr') { nfr++; hasRetr = true; }
      if (tk.t === 'fwu') { nfu++; hasRetr = true; }
    }
    if (pos < 0 || Math.abs(toks[hEnd - 1].z - layerZ) > 1e-6) return null;
    if (hasRetr) {
      // the original travel decides whether the retraction belonged to the travel or to the layer change
      const origFrom = [toks[a].x0, toks[a].y0];
      const origTo = lastTarget || [toks[hEnd].x0, toks[hEnd].y0];
      const travelCaused = dist(origFrom, origTo) >= o.minRetract;
      if (!(travelCaused || o.dropLayerRetract) || Math.abs(eSum) > 1e-4 || nfr !== nfu) return null;
    }
    const lines = [];
    for (let i = a; i < hEnd; i++) {
      const tk = toks[i];
      if (i === pos) lines.push({ move: true });
      if (!MOTION.has(tk.t)) lines.push({ tk });
    }
    return { lines, rampF: rampF || S.params.zF };
  }

  function emitLayer(S, toks, a, b, L, items, o) {
    const entry = items[0].entry;
    const hEnd = L.headerEnd;
    const ch = compactHeader(S, toks, a, hEnd, entry, L.layerZ, o);
    if (ch) {
      for (const l of ch.lines) {
        if (!l.move) { vEmit(S, l.tk); continue; }
        const dz = Math.abs(L.layerZ - S.z), dxy = dist(S.pos, entry);
        if (dz < 1e-6 && dxy < 1e-3) continue;
        let line = 'G1';
        if (dxy >= 1e-3) line += ` X${fmt(entry[0], 3)} Y${fmt(entry[1], 3)}`;
        if (dz >= 1e-6) line += ` Z${fmt(L.layerZ, 3)}`;
        const f = dz >= 1e-6 ? ch.rampF : S.params.travelF;
        S.out.push(`${line} F${fmt(f, 3)}`);
        S.f = f; S.pos = entry; S.z = L.layerZ; S.sync = true;
      }
      S.pos = entry; S.z = L.layerZ; S.sync = true;
      if (L.headLead) for (const l of L.headLead) S.out.push(l);
      emitPlan(S, items);
      for (const l of L.tailLead) S.out.push(l);
      const lastTok = toks[L.footerStart - 1];
      S.sync = dist(S.pos, [lastTok.x, lastTok.y]) < 1e-3;
      for (let i = L.footerStart; i < b; i++) vEmit(S, toks[i]);
      return;
    }
    let lastT = -1, firstU = -1;
    for (let i = a; i < hEnd; i++) {
      if (toks[i].t === 'travel') lastT = i;
      if ((toks[i].t === 'unretract' || toks[i].t === 'fwu') && firstU < 0) firstU = i;
    }
    const skip = layerRetractSkip(toks, a, hEnd, S.pos, entry, o) || new Set();
    const insertAt = lastT >= 0 ? -1 : (firstU >= 0 ? firstU : hEnd);
    for (let i = a; i < hEnd; i++) {
      const tk = toks[i];
      if (i === insertAt) { S.out.push(`G1 X${fmt(entry[0], 3)} Y${fmt(entry[1], 3)} F${fmt(S.params.travelF, 0)}`); S.f = S.params.travelF; S.pos = entry; S.sync = true; }
      if (skip.has(i)) continue;
      if (tk.t === 'travel') {
        if (S.f !== tk.fPrev && tk.Fp === undefined) S.out.push(`G1 F${fmt(tk.fPrev, 3)}`);
        if (i === lastT) { S.out.push(setXY(tk.raw, entry[0], entry[1])); S.pos = entry; S.sync = true; }
        else { const s = stripXY(tk.raw); if (s) S.out.push(s); }
        S.f = tk.f; S.z = tk.z;
      } else vEmit(S, tk);
    }
    if (insertAt === hEnd) { S.out.push(`G1 X${fmt(entry[0], 3)} Y${fmt(entry[1], 3)} F${fmt(S.params.travelF, 0)}`); S.f = S.params.travelF; S.pos = entry; }
    S.pos = entry; S.z = L.layerZ;
    if (L.headLead) for (const l of L.headLead) S.out.push(l);
    emitPlan(S, items);
    for (const l of L.tailLead) S.out.push(l);
    const lastTok = toks[L.footerStart - 1];
    S.sync = dist(S.pos, [lastTok.x, lastTok.y]) < 1e-3;
    for (let i = L.footerStart; i < b; i++) vEmit(S, toks[i]);
  }

  return { optimize, stats, readConfig, tokenize, fmt, layerStarts, layerMarker, toRelativeE, detectSlicer };
})();

