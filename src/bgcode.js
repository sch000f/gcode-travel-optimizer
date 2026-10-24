// Read-only copy of the code embedded in index.html, for easier reading.
// The tool itself runs from index.html; changes must be made there.

// ---------- Binary G-code (Prusa .bgcode) read / write ----------
const BG = (() => {
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bufs) {
    let c = 0xFFFFFFFF;
    for (const b of bufs) for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function heatshrinkDecode(src, outSize, w) {
    const out = new Uint8Array(outSize);
    let o = 0, bitPos = 0;
    const totalBits = src.length * 8;
    const bits = (n) => {
      let v = 0;
      for (let i = 0; i < n; i++) {
        v = (v << 1) | ((src[bitPos >> 3] >> (7 - (bitPos & 7))) & 1);
        bitPos++;
      }
      return v;
    };
    while (o < outSize && bitPos < totalBits) {
      if (bits(1)) {
        if (bitPos + 8 > totalBits) break;
        out[o++] = bits(8);
      } else {
        if (bitPos + w + 4 > totalBits) break;
        const off = bits(w) + 1, cnt = bits(4) + 1;
        for (let i = 0; i < cnt && o < outSize; i++, o++) out[o] = out[o - off];
      }
    }
    return out;
  }

  // Greedy LZSS compatible with heatshrink (window 2^w, lookahead 2^4)
  function heatshrinkEncode(src, w) {
    const win = 1 << w, maxLen = 16;
    const out = [];
    let acc = 0, nb = 0;
    const put = (v, n) => {
      for (let i = n - 1; i >= 0; i--) {
        acc = (acc << 1) | ((v >> i) & 1);
        if (++nb === 8) { out.push(acc); acc = 0; nb = 0; }
      }
    };
    const HB = 14, head = new Int32Array(1 << HB).fill(-1), prev = new Int32Array(src.length);
    const hash = (i) => ((src[i] << 6) ^ (src[i + 1] << 3) ^ src[i + 2]) & ((1 << HB) - 1);
    const insert = (i) => { if (i + 2 < src.length) { const h = hash(i); prev[i] = head[h]; head[h] = i; } };
    let i = 0;
    while (i < src.length) {
      let bestLen = 0, bestOff = 0;
      if (i + 2 < src.length) {
        let cand = head[hash(i)], tries = 64;
        while (cand >= 0 && i - cand <= win && tries--) {
          let l = 0;
          while (l < maxLen && i + l < src.length && src[cand + l] === src[i + l]) l++;
          if (l > bestLen) { bestLen = l; bestOff = i - cand; if (l === maxLen) break; }
          cand = prev[cand];
        }
      }
      if (bestLen >= 3) {
        put(0, 1); put(bestOff - 1, w); put(bestLen - 1, 4);
        for (let k = 0; k < bestLen; k++) insert(i + k);
        i += bestLen;
      } else {
        put(1, 1); put(src[i], 8); insert(i); i++;
      }
    }
    if (nb) out.push(acc << (8 - nb));
    return new Uint8Array(out);
  }

  // MeatPack decoding (port of libbgcode unbinarize)
  function meatpackDecode(src) {
    const out = [];
    let unbin = false, nospace = false, cmdActive = false, cmdCount = 0, fullQ = 0, charBuf = 0;
    const getChar = (c) => c < 10 ? 48 + c : [46, nospace ? 69 : 32, 10, 71, 88][c - 10];
    const emit = (c) => out.push(c);
    const inner = (c) => {
      if (!unbin) { emit(c); return; }
      if (fullQ > 0) {
        emit(c);
        if (charBuf > 0) { emit(charBuf); charBuf = 0; }
        fullQ--;
        return;
      }
      const lo = c & 0xF, hi = (c >> 4) & 0xF;
      if (lo === 0xF) {
        fullQ++;
        if (hi === 0xF) fullQ++; else charBuf = getChar(hi);
      } else {
        const c0 = getChar(lo);
        emit(c0);
        if (c0 !== 10) { if (hi === 0xF) fullQ++; else emit(getChar(hi)); }
      }
    };
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (c === 0xFF) {
        if (cmdCount > 0) { cmdActive = true; cmdCount = 0; } else cmdCount++;
      } else if (cmdActive) {
        if (c === 251) unbin = true;
        else if (c === 250 || c === 249) unbin = false;
        else if (c === 247) nospace = true;
        else if (c === 246) nospace = false;
        cmdActive = false;
      } else {
        if (cmdCount > 0) { inner(0xFF); cmdCount = 0; }
        inner(c);
      }
    }
    return new Uint8Array(out);
  }

  // Reinsert spaces between G-line parameters (MeatPack no-space mode drops them)
  function respace(text) {
    return text.replace(/^G[^\n;]*/gm, (m) => m.replace(/([\d.])([A-Z])/g, '$1 $2'));
  }

  async function inflate(data) {
    const s = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate'));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }

  async function parse(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    if (String.fromCharCode(...u8.slice(0, 4)) !== 'GCDE') throw new Error('ERR_NOT_BGCODE');
    const version = dv.getUint32(4, true), checksumType = dv.getUint16(8, true);
    const csLen = checksumType === 1 ? 4 : 0;
    let p = 10;
    const blocks = [];
    const dec = new TextDecoder();
    let gcode = '';
    while (p < u8.length) {
      const start = p;
      const type = dv.getUint16(p, true), comp = dv.getUint16(p + 2, true), usize = dv.getUint32(p + 4, true);
      p += 8;
      let csize = usize;
      if (comp !== 0) { csize = dv.getUint32(p, true); p += 4; }
      const paramLen = type === 5 ? 6 : 2;
      const param = dv.getUint16(p, true);
      p += paramLen;
      const data = u8.subarray(p, p + csize);
      p += csize + csLen;
      const raw = u8.subarray(start, p);
      if (type === 1) {
        let d;
        if (comp === 0) d = data;
        else if (comp === 2 || comp === 3) d = heatshrinkDecode(data, usize, comp === 2 ? 11 : 12);
        else if (comp === 1) d = await inflate(data);
        else throw new Error('ERR_COMPRESSION');
        if (param === 1 || param === 2) d = meatpackDecode(d);
        gcode += dec.decode(d);
        blocks.push({ type, gcodePlaceholder: true });
      } else {
        blocks.push({ type, raw });
      }
    }
    let meta = '';
    for (const b of blocks) {
      if (b.type !== 0) continue;
      const dv0 = new DataView(b.raw.buffer, b.raw.byteOffset, b.raw.byteLength);
      if (dv0.getUint16(2, true) === 0) meta += dec.decode(b.raw.subarray(10, 10 + dv0.getUint32(4, true)));
    }
    let config = '';
    for (const b of blocks) {
      if (b.type !== 2) continue;
      const dv2 = new DataView(b.raw.buffer, b.raw.byteOffset, b.raw.byteLength);
      const c = dv2.getUint16(2, true);
      try {
        if (c === 0) config = dec.decode(b.raw.subarray(10, 10 + dv2.getUint32(4, true)));
        else if (c === 1) config = dec.decode(await inflate(b.raw.subarray(14, 14 + dv2.getUint32(8, true))));
      } catch (e) { /* config is optional */ }
    }
    return { version, checksumType, blocks, config, meta, gcode: respace(gcode).replace(/\n{2,}/g, '\n') };
  }

  function build(parsed, gcode, blockSize = 65536) {
    const enc = new TextEncoder();
    const parts = [];
    const head = new Uint8Array(10), hdv = new DataView(head.buffer);
    head.set([71, 67, 68, 69]);
    hdv.setUint32(4, parsed.version, true);
    hdv.setUint16(8, parsed.checksumType, true);
    parts.push(head);
    let gcodeDone = false;
    const gcodeBlocks = () => {
      const bytes = enc.encode(gcode);
      let s = 0;
      while (s < bytes.length) {
        let e = Math.min(s + blockSize, bytes.length);
        if (e < bytes.length) { while (e > s && bytes[e - 1] !== 10) e--; if (e === s) e = Math.min(s + blockSize, bytes.length); }
        const chunk = bytes.subarray(s, e);
        const comp = heatshrinkEncode(chunk, 12);
        const h = new Uint8Array(14), dv = new DataView(h.buffer);
        dv.setUint16(0, 1, true); dv.setUint16(2, 3, true);
        dv.setUint32(4, chunk.length, true); dv.setUint32(8, comp.length, true);
        dv.setUint16(12, 0, true);
        parts.push(h, comp);
        if (parsed.checksumType === 1) {
          const c = new Uint8Array(4); new DataView(c.buffer).setUint32(0, crc32([h, comp]), true); parts.push(c);
        }
        s = e;
      }
    };
    for (const b of parsed.blocks) {
      if (b.type === 1) { if (!gcodeDone) { gcodeBlocks(); gcodeDone = true; } }
      else parts.push(b.raw);
    }
    return new Blob(parts, { type: 'application/octet-stream' });
  }

  return { parse, build, heatshrinkDecode, heatshrinkEncode, meatpackDecode, crc32 };
})();

