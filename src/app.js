// Read-only copy of the code embedded in index.html, for easier reading.
// The tool itself runs from index.html; changes must be made there.

(() => {
  // ---------- translations ----------
  const I18N = {
    en: {
      sub: 'Reduces travel moves in G-code (.gcode / Prusa .bgcode), e.g. against stringing with foaming / LW-PLA. Runs entirely in your browser – your files are never uploaded.',
      h_file: 'File', drop: 'Drop G-code here or click', drop_sub: '.gcode or .bgcode (Prusa binary G-code)',
      h_opts: 'Options',
      o_rotate: 'Move loop start', o_rotate_d: 'Closed walls start at the point closest to the current nozzle position (e.g. above the end of the previous layer).',
      o_detours: 'Print islands as detours', o_detours_d: 'Small paths next to a wall are printed on the way instead of being travelled to separately. Max. detour (there and back):',
      o_remove: 'Remove stand-alone extrusions shorter than', o_remove_d: '0 = remove nothing. Only affects single, isolated paths (mini islands) whose total length is below the value. They add no strength but cause their own travel moves.',
      off: 'off',
      o_reorder: 'Reorder paths', o_reorder_d: 'Within one feature type the nearest path is always printed next.',
      o_reverse: 'Reverse open paths', o_reverse_d: 'Open paths (infill, gap fill) may be printed starting from their other end.',
      o_minret: 'No retraction on new travels shorter than', o_minret_d: 'Taken from the slicer settings (retract_before_travel) if available.',
      o_droplr: 'Skip retraction on layer change', o_droplr_d: 'Only if the travel to the new layer is shorter than the value on the left.',
      advanced: 'Advanced',
      o_close: 'A loop counts as closed if its gap is ≤', o_gain: 'Only change a layer if it saves at least',
      o_rotmin: 'Only move a loop start if it gains at least', o_pen: 'Penalty per travel (prefers fewer travels)',
      run: 'Optimize', dl: 'Download', dlg: 'Download as .gcode',
      h_res: 'Result', h_layers: 'Changed layers (biggest saving first, travel in mm)',
      th_tb: 'Travel before', th_after: 'after', th_nb: 'Travels before', th_rem: 'removed',
      h_prev: 'Preview', optimized: 'Optimized', lg_start: 'Layer start',
      st_read: 'Reading file …', st_opt: 'Optimizing …', st_check: 'Checking result …', st_done: 'Done in {s} s',
      st_zip: 'Compressing .bgcode …', st_saved: 'Saved.', st_readerr: 'Error while reading: ', st_err: 'Error: ',
      fi_bin: 'Binary G-code', fi_layers: 'layers', fi_slicer: 'Slicer', fi_seam: 'Seam', fi_perim: 'Perimeters', fi_unknown: 'unknown',
      fi_conv: 'Absolute extrusion (M82) was converted to relative (M83) – the result also uses relative extrusion.',
      fi_nolayers: 'No layer markers found – this slicer is not supported.',
      s_dist: 'Travel distance', s_n1: 'Travels ≥ 1 mm', s_n5: 'Travels ≥ 5 mm', s_layers: 'Changed layers', s_rem: 'Removed mini extrusions',
      n_new: 'New travels: retraction {r} mm @ {rs} mm/s, travel {ts} mm/s', n_fw: 'New travels: firmware retraction (G10/G11), travel {ts} mm/s',
      n_hop: ', Z hop {h} mm', n_src: ' (taken from {src}).', src_travel: 'an existing travel', src_layer: 'the layer change', src_default: 'default values',
      n_de: ' Max. deviation of extruded amount per layer: {d} mm filament.', n_layers: ' ⚠ Layer count differs – do not use this result!',
      n_rem: ' Removed: {n} mini extrusions, {l} mm of path / {e} mm of filament in total.',
      layer: 'Layer', changed: 'changed', travels: 'travels',
      ERR_NO_LAYERS: 'No layer markers found. Supported: PrusaSlicer, SuperSlicer, OrcaSlicer, Bambu Studio, Cura, ideaMaker, Simplify3D.',
      ERR_M82: 'Absolute extrusion (M82) could not be converted.', ERR_NOT_BGCODE: 'Not a .bgcode file.', ERR_COMPRESSION: 'Unknown compression in .bgcode file.',
      h_about: 'How it works',
      about: `<p>Slicers often start a layer far away from where the previous layer ended, or travel to small separate islands and back. With materials that string a lot (foaming PLA, LW-PLA, PETG, TPU) every travel leaves a hair. This tool rewrites the G-code so that</p>
<ul><li>closed loops start where the nozzle currently is,</li><li>small islands touching a wall are printed as a short detour from that wall,</li><li>paths of the same feature type are printed in nearest-neighbour order (open paths may be reversed),</li><li>optionally, tiny stand-alone extrusions are dropped.</li></ul>
<p>Geometry, extrusion amounts, speeds and feature order stay the same; only start points and the order of paths change. Each layer is only rewritten if it gets shorter travels, and anything the tool does not understand is left untouched.</p>
<p><b>Supported slicers:</b> PrusaSlicer, SuperSlicer, OrcaSlicer, Bambu Studio, Cura, ideaMaker, Simplify3D (plain .gcode), plus Prusa binary .bgcode. Relative and absolute extrusion, firmware retraction (G10/G11), Z hop and arcs (G2/G3) are handled. Tested on a Prusa MK4S with PrusaSlicer files; other slicers were tested with converted files – please check the result in your slicer's G-code preview before printing.</p>`,
      foot: 'Free and unencumbered software released into the public domain (<a href="https://unlicense.org">Unlicense</a>). No warranty – use at your own risk. · <a href="https://github.com/sch000f/gcode-travel-optimizer">Source &amp; issues on GitHub</a>',
    },
    de: {
      sub: 'Reduziert Travel-Moves in G-Code (.gcode / Prusa .bgcode), z.B. gegen Stringing bei Foaming-/LW-PLA. Läuft komplett im Browser – deine Dateien werden nirgends hochgeladen.',
      h_file: 'Datei', drop: 'G-Code hierher ziehen oder klicken', drop_sub: '.gcode oder .bgcode (Prusa binary G-code)',
      h_opts: 'Optionen',
      o_rotate: 'Loop-Start verschieben', o_rotate_d: 'Geschlossene Wände beginnen an dem Punkt, der der aktuellen Düsenposition am nächsten liegt (z.B. über dem Ende des vorherigen Layers).',
      o_detours: 'Inseln als Abstecher einfügen', o_detours_d: 'Kleine Pfade nahe einer Wand werden unterwegs mitgedruckt statt separat angefahren. Max. Abstecher-Weg (hin+zurück):',
      o_remove: 'Alleinstehende Extrusionen entfernen, kürzer als', o_remove_d: '0 = nichts entfernen. Betrifft nur einzelne, für sich stehende Pfade (Mini-Inseln), deren gesamte Länge unter dem Wert liegt. Sie tragen nichts zur Festigkeit bei, verursachen aber eigene Travel-Moves.',
      off: 'aus',
      o_reorder: 'Pfade umsortieren', o_reorder_d: 'Innerhalb eines Feature-Typs wird immer der nächstgelegene Pfad als Nächstes gedruckt.',
      o_reverse: 'Offene Pfade umkehren', o_reverse_d: 'Nicht geschlossene Pfade (Infill, Gap Fill) dürfen vom anderen Ende her gedruckt werden.',
      o_minret: 'Kein Retract bei neuen Travels unter', o_minret_d: 'Wird aus den Slicer-Einstellungen übernommen (retract_before_travel), falls vorhanden.',
      o_droplr: 'Retract beim Layerwechsel weglassen', o_droplr_d: 'Nur wenn der Travel zum neuen Layer kürzer als der Wert links ist.',
      advanced: 'Erweitert',
      o_close: 'Loop gilt als geschlossen bei Lücke ≤', o_gain: 'Layer nur ändern, wenn Ersparnis ≥',
      o_rotmin: 'Loop-Start nur verschieben ab Gewinn von', o_pen: 'Strafkosten pro Travel (bevorzugt weniger Travels)',
      run: 'Optimieren', dl: 'Herunterladen', dlg: 'Als .gcode herunterladen',
      h_res: 'Ergebnis', h_layers: 'Geänderte Layer (grösste Ersparnis zuerst, Travel in mm)',
      th_tb: 'Travel vorher', th_after: 'nachher', th_nb: 'Travels vorher', th_rem: 'entfernt',
      h_prev: 'Vorschau', optimized: 'Optimiert', lg_start: 'Layer-Start',
      st_read: 'Lese Datei …', st_opt: 'Optimiere …', st_check: 'Prüfe Ergebnis …', st_done: 'Fertig in {s} s',
      st_zip: 'Komprimiere .bgcode …', st_saved: 'Gespeichert.', st_readerr: 'Fehler beim Lesen: ', st_err: 'Fehler: ',
      fi_bin: 'Binary G-code', fi_layers: 'Layer', fi_slicer: 'Slicer', fi_seam: 'Naht', fi_perim: 'Perimeter', fi_unknown: 'unbekannt',
      fi_conv: 'Absolute Extrusion (M82) wurde in relative (M83) umgewandelt – das Ergebnis verwendet ebenfalls relative Extrusion.',
      fi_nolayers: 'Keine Layer-Markierungen gefunden – dieser Slicer wird nicht unterstützt.',
      s_dist: 'Travel-Distanz', s_n1: 'Travels ≥ 1 mm', s_n5: 'Travels ≥ 5 mm', s_layers: 'Geänderte Layer', s_rem: 'Entfernte Mini-Extrusionen',
      n_new: 'Neue Travels: Retract {r} mm @ {rs} mm/s, Travel {ts} mm/s', n_fw: 'Neue Travels: Firmware-Retract (G10/G11), Travel {ts} mm/s',
      n_hop: ', Z-Hop {h} mm', n_src: ' (übernommen aus {src}).', src_travel: 'einem vorhandenen Travel', src_layer: 'dem Layerwechsel', src_default: 'Standardwerten',
      n_de: ' Max. Abweichung der Extrusionsmenge pro Layer: {d} mm Filament.', n_layers: ' ⚠ Layeranzahl unterschiedlich – Ergebnis nicht verwenden!',
      n_rem: ' Entfernt: {n} Mini-Extrusionen, zusammen {l} mm Pfad / {e} mm Filament.',
      layer: 'Layer', changed: 'geändert', travels: 'Travels',
      ERR_NO_LAYERS: 'Keine Layer-Markierungen gefunden. Unterstützt: PrusaSlicer, SuperSlicer, OrcaSlicer, Bambu Studio, Cura, ideaMaker, Simplify3D.',
      ERR_M82: 'Absolute Extrusion (M82) konnte nicht umgewandelt werden.', ERR_NOT_BGCODE: 'Keine .bgcode-Datei.', ERR_COMPRESSION: 'Unbekannte Kompression in der .bgcode-Datei.',
      h_about: 'So funktioniert es',
      about: `<p>Slicer beginnen einen Layer oft weit weg vom Ende des vorherigen Layers oder fahren zu kleinen separaten Inseln und wieder zurück. Bei Materialien, die stark fädeln (Foaming-PLA, LW-PLA, PETG, TPU), hinterlässt jeder Travel ein Haar. Dieses Tool schreibt den G-Code so um, dass</p>
<ul><li>geschlossene Loops dort beginnen, wo die Düse gerade steht,</li><li>kleine Inseln, die eine Wand berühren, als kurzer Abstecher von dieser Wand gedruckt werden,</li><li>Pfade desselben Feature-Typs in Nächster-Nachbar-Reihenfolge gedruckt werden (offene Pfade auch rückwärts),</li><li>optional winzige alleinstehende Extrusionen entfernt werden.</li></ul>
<p>Geometrie, Extrusionsmengen, Geschwindigkeiten und die Reihenfolge der Feature-Typen bleiben gleich; nur Startpunkte und die Reihenfolge der Pfade ändern sich. Ein Layer wird nur umgeschrieben, wenn seine Travels kürzer werden, und alles, was das Tool nicht versteht, bleibt unverändert.</p>
<p><b>Unterstützte Slicer:</b> PrusaSlicer, SuperSlicer, OrcaSlicer, Bambu Studio, Cura, ideaMaker, Simplify3D (normales .gcode) sowie Prusa Binary-.bgcode. Relative und absolute Extrusion, Firmware-Retraction (G10/G11), Z-Hop und Bögen (G2/G3) werden unterstützt. Getestet auf einem Prusa MK4S mit PrusaSlicer-Dateien; andere Slicer wurden mit umgewandelten Dateien getestet – bitte das Ergebnis vor dem Druck in der G-Code-Vorschau deines Slicers prüfen.</p>`,
      foot: 'Freie Software, gemeinfrei veröffentlicht (<a href="https://unlicense.org">Unlicense</a>). Keine Gewährleistung – Nutzung auf eigene Gefahr. · <a href="https://github.com/sch000f/gcode-travel-optimizer">Quellcode &amp; Issues auf GitHub</a>',
    },
  };
  let lang = 'en';
  try { lang = localStorage.getItem('gto-lang') || ''; } catch (e) { lang = ''; }
  if (!I18N[lang]) lang = 'en'; // default language, a saved choice wins
  const t = (k, vars) => {
    let s = (I18N[lang][k] !== undefined ? I18N[lang][k] : I18N.en[k]) ?? k;
    if (vars) for (const v in vars) s = s.split('{' + v + '}').join(vars[v]);
    return s;
  };
  const errText = (e) => I18N.en[e.message] ? t(e.message) : e.message;

  const $ = (id) => document.getElementById(id);
  let input = null;     // { name, kind, parsed?, text, cfg, slicer, converted, layers }
  let result = null;    // { text, report, params }
  let prev = null;      // preview data
  let ranked = [];      // changed layers, biggest saving first
  let lastStats = null; // [s0, s1]
  let lastStatus = null;

  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll('.lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));
    $('o_removeShort').oninput();
    if (input) showFileInfo();
    if (lastStats) { showResults(...lastStats); setLayer(+$('lslider').value); }
    if (lastStatus) status(...lastStatus);
  }
  document.querySelectorAll('.lang button').forEach(b => b.onclick = () => {
    lang = b.dataset.lang;
    try { localStorage.setItem('gto-lang', lang); } catch (e) { /* optional */ }
    applyLang();
  });

  // status takes a key + vars so it can be re-translated
  const status = (key, vars, err, extra) => {
    lastStatus = [key, vars, err, extra];
    $('status').textContent = key ? t(key, vars) + (extra || '') : '';
    $('status').className = err ? 'err' : '';
  };
  const tick = () => new Promise(r => setTimeout(r, 30));

  $('drop').onclick = () => $('file').click();
  $('drop').ondragover = (e) => { e.preventDefault(); $('drop').classList.add('over'); };
  $('drop').ondragleave = () => $('drop').classList.remove('over');
  $('drop').ondrop = (e) => { e.preventDefault(); $('drop').classList.remove('over'); if (e.dataTransfer.files[0]) load(e.dataTransfer.files[0]); };
  $('file').onchange = () => { if ($('file').files[0]) load($('file').files[0]); };

  function showFileInfo() {
    const i = input;
    let info = `${i.name} · ${(i.size / 1e6).toFixed(1)} MB · ${i.kind === 'bgcode' ? t('fi_bin') : 'G-code'} · ${i.layers} ${t('fi_layers')}`;
    info += ` · ${t('fi_slicer')}: ${i.slicer || t('fi_unknown')}`;
    if (i.cfg.seam_position) info += ` · ${t('fi_seam')}: ${i.cfg.seam_position}`;
    if (i.cfg.perimeter_generator) info += ` · ${t('fi_perim')}: ${i.cfg.perimeter_generator}`;
    if (i.converted) info += '\n' + t('fi_conv');
    if (!i.layers) info += '\n' + t('fi_nolayers');
    $('fileinfo').textContent = info;
  }

  async function load(file) {
    result = null; lastStats = null; prev = null;
    ['res', 'layers', 'prev'].forEach(id => $(id).classList.add('hidden'));
    $('dl').disabled = $('dlg').disabled = true;
    $('run').disabled = true;
    status('st_read');
    await tick();
    try {
      const buf = await file.arrayBuffer();
      const head = new Uint8Array(buf, 0, Math.min(4, buf.byteLength));
      const isBin = String.fromCharCode(...head) === 'GCDE';
      let text, parsed = null, cfgText = '';
      if (isBin) {
        parsed = await BG.parse(buf);
        text = parsed.gcode;
        cfgText = parsed.config;
      } else {
        text = new TextDecoder().decode(buf);
        cfgText = text.length > 400000 ? text.slice(0, 100000) + '\n' + text.slice(-400000) : text;
      }
      const slicer = OPT.detectSlicer((parsed ? parsed.meta + '\n' : '') + text + '\n' + cfgText.slice(0, 2000));
      const conv = OPT.toRelativeE(text);
      text = conv.text;
      const cfg = OPT.readConfig(cfgText);
      const layers = OPT.layerStarts(text.split('\n')).length;
      input = { name: file.name, size: file.size, kind: isBin ? 'bgcode' : 'gcode', parsed, text, cfg, slicer, converted: conv.converted, layers };
      const rbt = cfg.retract_before_travel || cfg.retraction_minimum_travel;
      if (rbt && isFinite(parseFloat(rbt))) $('o_minRetract').value = parseFloat(rbt);
      showFileInfo();
      $('run').disabled = !layers;
      status('');
    } catch (e) {
      console.error(e);
      status('st_readerr', null, true, errText(e));
    }
  }

  const nice = (v, d) => OPT.fmt(v, d).replace(/^(-?)\./, '$10.');
  const num = (id) => parseFloat($(id).value) || 0;
  function options() {
    return {
      rotate: $('o_rotate').checked, detours: $('o_detours').checked, reorder: $('o_reorder').checked,
      reverse: $('o_reverse').checked, dropLayerRetract: $('o_dropLayerRetract').checked,
      detourMax: num('o_detourMax'), removeShort: num('o_removeShort'), minRetract: num('o_minRetract'), closeTol: num('o_closeTol'),
      minGain: num('o_minGain'), rotateMin: num('o_rotateMin'), travelPenalty: num('o_penalty'),
    };
  }

  $('run').onclick = async () => {
    if (!input) return;
    $('run').disabled = true;
    status('st_opt');
    await tick();
    try {
      const t0 = performance.now();
      result = OPT.optimize(input.text, options(), input.cfg);
      status('st_check');
      await tick();
      const s0 = OPT.stats(input.text), s1 = OPT.stats(result.text);
      lastStats = [s0, s1];
      showResults(s0, s1);
      buildPreview();
      $('dl').disabled = $('dlg').disabled = false;
      status('st_done', { s: ((performance.now() - t0) / 1000).toFixed(1) });
    } catch (e) {
      console.error(e);
      status('st_err', null, true, errText(e));
    }
    $('run').disabled = false;
  };

  function showResults(s0, s1) {
    const a = s0.total, b = s1.total;
    const remByLayer = {}; let nRem = 0, remLen = 0, remE = 0;
    for (const r of result.report) if (r.removed) { remByLayer[r.layer] = r.remE; nRem += r.removed; remLen += r.remLen; remE += r.remE; }
    let maxDE = 0;
    s0.layers.forEach((l, i) => { if (s1.layers[i]) maxDE = Math.max(maxDE, Math.abs(l.e - (remByLayer[i + 1] || 0) - s1.layers[i].e)); });
    const cell = (k, v0, v1, unit = '') => `<div class="stat"><div class="k">${k}</div><div class="v"><s>${v0}</s>→ ${v1}${unit}</div></div>`;
    $('stats').innerHTML =
      cell(t('s_dist'), Math.round(a.dist), Math.round(b.dist), ' mm') +
      cell(t('s_n1'), a.n1, b.n1) +
      cell(t('s_n5'), a.n5, b.n5) +
      `<div class="stat"><div class="k">${t('s_layers')}</div><div class="v">${result.report.length} / ${s0.layers.length}</div></div>` +
      (nRem ? `<div class="stat"><div class="k">${t('s_rem')}</div><div class="v">${nRem}</div></div>` : '');
    const P = result.params;
    let note = P.fw ? t('n_fw', { ts: Math.round(P.travelF / 60) })
      : t('n_new', { r: nice(P.retract, 3), rs: Math.round(P.rF / 60), ts: Math.round(P.travelF / 60) });
    if (P.hop > 0) note += t('n_hop', { h: nice(P.hop, 2) });
    note += t('n_src', { src: t(P.source === 'travel' ? 'src_travel' : P.source === 'layerchange' ? 'src_layer' : 'src_default') });
    note += t('n_de', { d: maxDE.toFixed(4) });
    if (s0.layers.length !== s1.layers.length) note += t('n_layers');
    if (nRem) note += t('n_rem', { n: nRem, l: remLen.toFixed(1), e: remE.toFixed(3) });
    $('paramnote').textContent = note;
    $('res').classList.remove('hidden');

    // same measure as the preview: travels of each layer in the original vs. the optimized file
    ranked = result.report.map(r => {
      const a = s0.layers[r.layer - 1], b = s1.layers[r.layer - 1] || { dist: 0, n: 0 };
      return { layer: r.layer, before: a.dist, after: b.dist, nBefore: a.n, nAfter: b.n, removed: r.removed };
    }).filter(r => r.removed || Math.abs(r.before - r.after) >= 0.05 || r.nBefore !== r.nAfter)
      .sort((x, y) => (y.before - y.after) - (x.before - x.after));
    $('tbody').innerHTML = ranked.map(r => `<tr data-l="${r.layer}"><td>${r.layer}</td><td>${r.before.toFixed(1)}</td><td>${r.after.toFixed(1)}</td><td>${r.nBefore}</td><td>${r.nAfter}</td><td>${r.removed || ''}</td></tr>`).join('');
    $('tbody').onclick = (e) => { const tr = e.target.closest('tr'); if (tr) setLayer(+tr.dataset.l); };
    $('layers').classList.toggle('hidden', !ranked.length);
  }

  // ---------- preview ----------
  function layerIndex(text) {
    const lines = text.split('\n');
    return { lines, idx: OPT.layerStarts(lines) };
  }
  function buildPreview() {
    prev = { a: layerIndex(input.text), b: layerIndex(result.text) };
    $('lslider').max = prev.a.idx.length;
    $('prev').classList.remove('hidden');
    setLayer(ranked[0] ? ranked[0].layer : 1);
  }
  function layerPaths(L, n) {
    const a = L.idx[n - 1], b = n < L.idx.length ? L.idx[n] : L.lines.length;
    // include the end of the previous layer as start position
    let from = a;
    while (from > 0 && !/^G[0-3] [^;]*X[^;]*Y/.test(L.lines[from - 1])) from--;
    const { toks } = OPT.tokenize(L.lines.slice(Math.max(0, from - 1), b));
    const offset = a - Math.max(0, from - 1);
    const ext = [], trav = [];
    let start = null, dist = 0, count = 0, z = null;
    toks.forEach((tk, i) => {
      if (i < offset) return;
      if (tk.t === 'ext') { ext.push([tk.x0, tk.y0, tk.x, tk.y]); if (!start) { start = [tk.x0, tk.y0]; z = tk.z; } }
      if ((tk.t === 'travel' || tk.t === 'wipe') && (tk.x !== tk.x0 || tk.y !== tk.y0)) {
        const d = Math.hypot(tk.x - tk.x0, tk.y - tk.y0);
        trav.push([tk.x0, tk.y0, tk.x, tk.y]); dist += d; if (d >= 0.05) count++;
      }
    });
    return { ext, trav, start, dist, count, z };
  }
  function draw(canvas, data, box) {
    const ctx = canvas.getContext('2d');
    const cs = getComputedStyle(document.documentElement);
    const W = canvas.width, H = canvas.height, pad = 30;
    ctx.fillStyle = cs.getPropertyValue('--panel'); ctx.fillRect(0, 0, W, H);
    const sc = Math.min((W - 2 * pad) / Math.max(box.w, 1e-3), (H - 2 * pad) / Math.max(box.h, 1e-3));
    const ox = (W - box.w * sc) / 2, oy = (H - box.h * sc) / 2;
    const X = (x) => ox + (x - box.x) * sc, Y = (y) => H - (oy + (y - box.y) * sc);
    ctx.lineCap = 'round';
    ctx.strokeStyle = cs.getPropertyValue('--ext'); ctx.lineWidth = Math.max(1, Math.min(4, 0.45 * sc));
    ctx.beginPath();
    for (const s of data.ext) { ctx.moveTo(X(s[0]), Y(s[1])); ctx.lineTo(X(s[2]), Y(s[3])); }
    ctx.stroke();
    ctx.strokeStyle = cs.getPropertyValue('--travel'); ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 2;
    for (const s of data.trav) {
      ctx.beginPath(); ctx.moveTo(X(s[0]), Y(s[1])); ctx.lineTo(X(s[2]), Y(s[3])); ctx.stroke();
      ctx.beginPath(); ctx.arc(X(s[2]), Y(s[3]), 3.5, 0, 7); ctx.fill();
    }
    if (data.start) {
      ctx.fillStyle = cs.getPropertyValue('--start');
      ctx.beginPath(); ctx.arc(X(data.start[0]), Y(data.start[1]), 6, 0, 7); ctx.fill();
    }
  }
  function setLayer(n) {
    if (!prev) return;
    n = Math.max(1, Math.min(prev.a.idx.length, n));
    $('lslider').value = n;
    const A = layerPaths(prev.a, n), B = layerPaths(prev.b, n);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const d of [A, B]) for (const arr of [d.ext, d.trav]) for (const s of arr) {
      x0 = Math.min(x0, s[0], s[2]); x1 = Math.max(x1, s[0], s[2]); y0 = Math.min(y0, s[1], s[3]); y1 = Math.max(y1, s[1], s[3]);
    }
    if (!isFinite(x0)) { x0 = y0 = 0; x1 = y1 = 1; }
    const box = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    draw($('c0'), A, box); draw($('c1'), B, box);
    $('cap0').textContent = `${A.count} ${t('travels')} · ${A.dist.toFixed(1)} mm`;
    $('cap1').textContent = `${B.count} ${t('travels')} · ${B.dist.toFixed(1)} mm`;
    const changed = result.report.some(r => r.layer === n);
    $('llabel').textContent = `${t('layer')} ${n}` + (A.z !== null ? ` · Z ${nice(A.z, 3)} mm` : '') + (changed ? ` · ${t('changed')}` : '');
  }
  $('o_removeShort').oninput = () => { const v = num('o_removeShort'); $('o_removeShortV').textContent = v ? v.toFixed(1) + ' mm' : `0 mm (${t('off')})`; };
  $('lslider').oninput = () => setLayer(+$('lslider').value);
  $('lprev').onclick = () => setLayer(+$('lslider').value - 1);
  $('lnext').onclick = () => setLayer(+$('lslider').value + 1);
  document.addEventListener('keydown', (e) => {
    if (!prev || e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
    if (e.key === 'ArrowLeft') { setLayer(+$('lslider').value - 1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { setLayer(+$('lslider').value + 1); e.preventDefault(); }
  });

  // ---------- download ----------
  function save(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  const outName = (ext) => input.name.replace(/\.(b?gcode|gco|g)$/i, '') + '_opt.' + ext;
  $('dl').onclick = async () => {
    if (!result) return;
    if (input.kind === 'bgcode') {
      status('st_zip'); await tick();
      save(BG.build(input.parsed, result.text, 65535), outName('bgcode'));
      status('st_saved');
    } else save(new Blob([result.text], { type: 'text/plain' }), outName('gcode'));
  };
  $('dlg').onclick = () => { if (result) save(new Blob([result.text], { type: 'text/plain' }), outName('gcode')); };

  applyLang();
  window.__app = { load, get result() { return result; }, setLayer, setLang: (l) => { lang = l; applyLang(); } };
})();
