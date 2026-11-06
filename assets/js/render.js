/* #TOGETHERBAND B2B Studio — renderers for bands, packaging, slides and cost tables.
   Everything returns HTML/SVG strings sized in container query units (cqw/cqh),
   so the same markup scales from a thumbnail to a full-screen slide or a printed page. */
(function (global) {
  'use strict';
  const TB = global.TB;
  const { SDGS, STYLES, FINISHES, CURRENCIES } = TB;

  // ---------- helpers ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let idc = 0;
  const gid = p => p + (++idc).toString(36);

  function hexToRgb(h) {
    h = String(h || '#000').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgbToHex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  }
  const shade = (c, t) => mix(c, '#000000', t);
  const tint = (c, t) => mix(c, '#ffffff', t);
  function luma(c) {
    const [r, g, b] = hexToRgb(c).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  const onColor = c => (luma(c) > 0.42 ? '#141414' : '#ffffff');
  const sdg = n => SDGS.find(s => s.n === Number(n)) || SDGS[0];

  function money(v, code, dp) {
    const sym = CURRENCIES[code] || '$';
    const n = Number(v) || 0;
    return sym + n.toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  }
  const num = v => (Number(v) || 0).toLocaleString('en-GB');

  /* Packaging options: artwork × sleeve colour × line colour. The active option
     drives the 3D box, flat proofs, insert, QR card and slides. */
  function activeOption(p) {
    const os = (p.packaging && p.packaging.options) || [];
    if (!os.length) return null;
    return os[Math.max(0, Math.min(os.length - 1, Number(p.packaging.active) || 0))];
  }
  function look(p, opt) {
    const o = opt === undefined ? activeOption(p) : opt;
    if (o) {
      const art = o.art && o.art !== 'logo' ? (p.artworks || []).find(a => a.id === o.art) : null;
      return { sleeve: o.sleeve, ink: o.ink, art: art ? art.src : null, fit: o.fit || 'cover', label: o.label };
    }
    const sc = baseSleeve(p);
    return { sleeve: sc, ink: null, art: null };
  }
  function sleeveColor(p) { return look(p).sleeve; }
  function baseSleeve(p) {
    const k = p.packaging.sleeve;
    if (k === 'sdg') return sdg(p.edition.sdg).color;
    if (k === 'custom') return p.packaging.sleeveColor || p.brand.primary;
    return p.brand.primary;
  }

  // ---------- #TOGETHERBAND logo ----------
  function sunO() {
    let rays = '';
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const x1 = 50 + Math.cos(a) * 30, y1 = 50 + Math.sin(a) * 30;
      const x2 = 50 + Math.cos(a) * 47, y2 = 50 + Math.sin(a) * 47;
      rays += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    }
    return `<svg class="tbl-o" viewBox="0 0 100 100" aria-hidden="true"><g stroke="currentColor" stroke-width="5.5" stroke-linecap="butt">${rays}</g></svg>`;
  }
  function tbLogo(opts) {
    opts = opts || {};
    return `<span class="tbl${opts.cls ? ' ' + opts.cls : ''}"${opts.color ? ` style="color:${opts.color}"` : ''}>` +
      (opts.bottletop === false ? '' : '<span class="tbl-bt">BOTTLETOP</span>') +
      `<span class="tbl-main">#T${sunO()}GETHERBAND</span></span>`;
  }

  // ---------- partner logo ----------
  const WM = {
    serif: { cls: 'wm-serif', em: 0.47 },
    'serif-caps': { cls: 'wm-serifcaps', em: 0.52 },
    sans: { cls: 'wm-sans', em: 0.66 },
    display: { cls: 'wm-display', em: 0.5 },
    script: { cls: 'wm-script', em: 0.45 }
  };
  /* Renders the partner's logo inside a size container.
     tone: 'white' | 'black' | 'original'; scale: % of container width the mark may use. */
  function partnerLogo(p, o) {
    o = o || {};
    const b = p.brand;
    const tone = o.tone || b.logoTone || 'original';
    const scale = o.scale || b.logoScale || 70;
    const toneColor = tone === 'white' ? '#ffffff' : tone === 'black' ? '#141414' : (o.fallbackColor || '#141414');
    if (tone === 'ink' && b.logo) return `<div class="plogo">${tintImg(b.logo, toneColor, 'plogo-img', `max-width:${scale}cqw;max-height:${o.maxH || 62}cqh`)}</div>`;
    let inner;
    if (b.logo) {
      const filter = tone === 'white' ? 'brightness(0) invert(1)' : tone === 'black' ? 'brightness(0)' : 'none';
      inner = `<img class="plogo-img" alt="${esc(p.partner)} logo" src="${b.logo}" style="max-width:${scale}cqw;max-height:${o.maxH || 62}cqh;filter:${filter}">`;
    } else {
      const text = (b.wordmark || p.partner || '').trim() || 'Partner';
      const f = WM[b.wordmarkFont] || WM.serif;
      const fs = Math.min(scale / (Math.max(text.length, 3) * f.em), 40);
      inner = `<span class="wm ${f.cls}" style="color:${toneColor};font-size:min(${fs.toFixed(2)}cqw, ${o.maxH ? o.maxH * 0.8 : 50}cqh)">` +
        `<span class="wm-main">${esc(text)}</span>` +
        (b.wordmarkSub ? `<span class="wm-sub">${esc(b.wordmarkSub)}</span>` : '') + '</span>';
    }
    return `<div class="plogo">${inner}</div>`;
  }

  // ---------- QR ----------
  function qrSVG(text, color, bg) {
    color = color || '#000';
    try {
      const q = global.qrcode(0, 'M');
      q.addData(String(text || 'togetherband.org'));
      q.make();
      const n = q.getModuleCount();
      let d = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
      return `<svg class="qr" viewBox="-1 -1 ${n + 2} ${n + 2}" shape-rendering="crispEdges" aria-label="QR code for ${esc(text)}">` +
        (bg ? `<rect x="-1" y="-1" width="${n + 2}" height="${n + 2}" fill="${bg}"/>` : '') +
        `<path d="${d}" fill="${color}"/></svg>`;
    } catch (e) {
      return `<svg class="qr" viewBox="0 0 10 10"><rect width="10" height="10" fill="none" stroke="${color}" stroke-width=".6"/><text x="5" y="5.8" font-size="2" text-anchor="middle" fill="${color}">QR</text></svg>`;
    }
  }

  // ---------- bands ----------
  function metalDefs(id, v) {
    const f = FINISHES[v.finish] || FINISHES.polished;
    let stops = f.stops;
    if (!stops) { const m = v.finish === 'painted' ? (v.paint || v.rope || '#C41A2E') : (v.metal || '#2457C5'); stops = [tint(m, 0.45), m, tint(m, 0.25), shade(m, 0.45)]; }
    const s = stops.map((c, i) => `<stop offset="${(i / (stops.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('');
    return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${s}</linearGradient>`;
  }
  function rope(d, color, w, kind) {
    const dark = shade(color, 0.35), light = tint(color, 0.35);
    let tex;
    if (kind === 'braided') {
      tex = `<path d="${d}" fill="none" stroke="${dark}" stroke-width="${w * 0.9}" stroke-dasharray="${w * 0.35} ${w * 0.35}" stroke-linecap="butt" opacity=".55"/>` +
        `<path d="${d}" fill="none" stroke="${light}" stroke-width="${w * 0.45}" stroke-dasharray="${w * 0.35} ${w * 0.35}" stroke-dashoffset="${w * 0.35}" opacity=".45"/>`;
    } else if (kind === 'rope') {
      tex = `<path d="${d}" fill="none" stroke="${dark}" stroke-width="${w * 0.95}" stroke-dasharray="1.6 2.4" opacity=".45"/>` +
        `<path d="${d}" fill="none" stroke="${light}" stroke-width="${w * 0.22}" opacity=".5" transform="translate(-${w * 0.18} -${w * 0.18})"/>`;
    } else {
      tex = `<path d="${d}" fill="none" stroke="${light}" stroke-width="${w * 0.35}" opacity=".45" transform="translate(-${w * 0.15} -${w * 0.15})"/>`;
    }
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>${tex}`;
  }
  // ---------- band photography, recoloured in the browser ----------
  /* Real product shots from the #TOGETHERBAND range. Each has a mask image whose
     red channel marks the cord and green channel marks the clasp or charm, so the
     cord can be re-dyed to any Goal colour while keeping the photo's own shading. */
  const PHOTO_DIR = 'assets/img/bands/';
  const CLASP_TINT = { rose: '#C98F7C', onyx: '#3A3C41', polished: '#C9CDD2', gold: '#D4A63C' };
  function photoSpec(v) {
    const style = v.style === 'braided' ? 'classic' : v.style;
    if (style === 'heart') {
      if (v.finish === 'painted') return { key: 'heart', clasp: v.paint || v.rope || '#C41A2E' };
      return { key: 'heart', clasp: v.finish === 'metallic' ? (v.metal || '#2457C5') : v.finish === 'rainbow' ? 'rainbow' : (CLASP_TINT[v.finish] || CLASP_TINT.polished) };
    }
    const gold = v.finish === 'gold';
    const key = `${style === 'mini' ? 'mini' : 'classic'}-${gold ? 'gold' : 'polished'}`;
    let clasp = '';
    if (v.finish === 'metallic') clasp = v.metal || '#2457C5';
    else if (v.finish === 'painted') clasp = v.paint || v.rope || '#C41A2E';
    else if (v.finish === 'rainbow') clasp = 'rainbow';
    else if (v.finish === 'rose' || v.finish === 'onyx') clasp = CLASP_TINT[v.finish];
    return { key, clasp };
  }
  const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
  const SIZES = { 'classic-polished': [687, 683], 'classic-gold': [687, 683], 'mini-gold': [738, 711], 'mini-polished': [738, 711], heart: [557, 694] };
  const photoCache = {};
  const assetCache = {};
  function loadImg(src) {
    return assetCache[src] || (assetCache[src] = new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('Could not load ' + src));
      i.src = src;
    }));
  }
  function pixels(img) {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    return { c, x, d: x.getImageData(0, 0, c.width, c.height) };
  }
  const baseCache = {};
  function base(key) {
    return baseCache[key] || (baseCache[key] = Promise.all([loadImg(PHOTO_DIR + key + '.png'), loadImg(PHOTO_DIR + key + '-m.png')]).then(([im, mk]) => {
      const P = pixels(im), M = pixels(mk);
      const p = P.d.data, m = M.d.data;
      let cy = 0, cn = 0, ky = 0, kn = 0, kx0 = 1e9, kx1 = -1;
      for (let i = 0; i < p.length; i += 4) {
        const Y = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
        if (m[i] > 200) { cy += Y; cn++; }
        if (m[i + 1] > 200) { ky += Y; kn++; const x = (i / 4) % P.c.width; if (x < kx0) kx0 = x; if (x > kx1) kx1 = x; }
      }
      return { w: P.c.width, h: P.c.height, p, m, cordMean: cy / Math.max(cn, 1), claspMean: ky / Math.max(kn, 1), kx0, kx1 };
    }));
  }
  function hsl(h, s, l) {
    const f = n => { const k = (n + h / 30) % 12; const a = s * Math.min(l, 1 - l); return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); };
    return [f(0), f(8), f(4)];
  }
  // Re-dye a pixel: keep its light and shade relative to the material's average tone.
  function dye(p, o, i, T, mean, amt) {
    const Y = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
    const f = Y / Math.max(mean, 1);
    const k = amt / 255;
    for (let c = 0; c < 3; c++) {
      const t = T[c];
      const v = f <= 1 ? t * f : t + (255 - t) * Math.min(1, (f - 1) * 0.7);
      o[i + c] = p[i + c] + (v - p[i + c]) * k;
    }
  }
  function recolourPhoto(v) {
    const s = photoSpec(v);
    const id = `${s.key}|${String(v.rope).toLowerCase()}|${s.clasp}`;
    if (photoCache[id]) return photoCache[id];
    photoCache[id] = base(s.key).then(B => {
      const c = document.createElement('canvas');
      c.width = B.w; c.height = B.h;
      const x = c.getContext('2d');
      const out = x.createImageData(B.w, B.h);
      const o = out.data, p = B.p, m = B.m;
      o.set(p);
      const T = hexToRgb(v.rope || '#C41A2E');
      const K = s.clasp && s.clasp !== 'rainbow' ? hexToRgb(s.clasp) : null;
      for (let i = 0; i < p.length; i += 4) {
        if (!p[i + 3]) continue;
        if (m[i]) dye(p, o, i, T, B.cordMean, m[i]);
        else if (m[i + 1] && s.clasp) {
          let C = K;
          if (!C) { const px = (i / 4) % B.w; C = hsl(((px - B.kx0) / Math.max(1, B.kx1 - B.kx0)) * 300, 0.78, 0.55); }
          dye(p, o, i, C, B.claspMean, m[i + 1]);
        }
      }
      x.putImageData(out, 0, 0);
      return c.toDataURL('image/png');
    });
    // Remember the finished URL so re-renders show it immediately, without a flash.
    photoCache[id].then(u => { photoCache[id].url = u; });
    return photoCache[id];
  }
  /* Swap every <img data-band> under root for its recoloured photo. */
  const tintCache = new Map();
  function tintURL(src, color) {
    const k = color + '|' + src;
    if (!tintCache.has(k)) tintCache.set(k, loadImg(src).then(img => {
      const c = document.createElement('canvas');
      const max = 1600, sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0, c.width, c.height);
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
      const u = c.toDataURL('image/png');
      tintCache.get(k).url = u;
      return u;
    }));
    return tintCache.get(k);
  }
  function tintImg(src, color, cls, style) {
    const pr = tintCache.get(color + '|' + src);
    const done = pr && pr.url;
    return `<img class="${cls} tinted${done ? ' ready' : ''}" alt="" src="${done || BLANK}"${style ? ` style="${style}"` : ''}${done ? '' : ` data-tint="${esc(JSON.stringify({ src, color }))}"`}>`;
  }
  // Shrink bellyband back text until it fits its half of the band.
  function fitText(root) {
    (root || document).querySelectorAll('.pkb-fit').forEach(el => {
      const box = el.closest('.pkb-half');
      if (!box || !box.clientHeight) return;
      let k = 1;
      el.style.setProperty('--k', k);
      while (k > 0.55 && (el.scrollHeight > box.clientHeight * 0.86 || el.scrollWidth > box.clientWidth * 0.9)) {
        k -= 0.05; el.style.setProperty('--k', k.toFixed(2));
      }
    });
  }
  function hydrateBands(root) {
    fitText(root);
    (root || document).querySelectorAll('img[data-tint]').forEach(img => {
      const t = JSON.parse(img.dataset.tint);
      img.removeAttribute('data-tint');
      tintURL(t.src, t.color).then(u => { img.src = u; img.classList.add('ready'); }).catch(() => {});
    });
    (root || document).querySelectorAll('img[data-band]').forEach(img => {
      const v = JSON.parse(img.dataset.band);
      img.removeAttribute('data-band');
      recolourPhoto(v).then(url => { img.src = url; img.classList.add('ready'); }).catch(() => { img.replaceWith(document.createRange().createContextualFragment(bandDrawing(v, { noShadow: true }))); });
    });
  }
  function bandSVG(v, opts) {
    const s = photoSpec(v);
    const id = `${s.key}|${String(v.rope).toLowerCase()}|${s.clasp}`;
    const done = photoCache[id] && photoCache[id].url;
    const [w, h] = SIZES[s.key];
    const data = esc(JSON.stringify({ style: v.style, rope: v.rope, finish: v.finish, metal: v.metal, paint: v.paint }));
    return `<img class="band band-photo${done ? ' ready' : ''}" width="${w}" height="${h}" alt="${esc(variantName(v))} #TOGETHERBAND" src="${done || BLANK}"${done ? '' : ` data-band="${data}"`}>`;
  }

  function bandDrawing(v, opts) {
    opts = opts || {};
    const id = gid('m');
    const metal = `url(#${id})`;
    const col = v.rope || '#C41A2E';
    const shadow = `<ellipse cx="200" cy="268" rx="120" ry="9" fill="#000" opacity=".10"/>`;
    let body = '';
    if (v.style === 'mini') {
      const d = 'M176 246 C 70 246 38 150 92 86 C 140 30 260 30 308 86 C 362 150 330 246 224 246';
      body = rope(d, col, 4.2, 'satin') +
        rope('M92 214 C 78 222 64 226 50 222', col, 4, 'satin') + rope('M308 214 C 322 222 336 226 350 222', col, 4, 'satin') +
        `<circle cx="92" cy="214" r="7.5" fill="${shade(col, 0.15)}"/><circle cx="308" cy="214" r="7.5" fill="${shade(col, 0.15)}"/>` +
        `<circle cx="50" cy="222" r="4.5" fill="${shade(col, 0.2)}"/><circle cx="350" cy="222" r="4.5" fill="${shade(col, 0.2)}"/>` +
        `<rect x="168" y="233" width="38" height="26" rx="13" fill="none" stroke="${metal}" stroke-width="8"/>` +
        `<rect x="194" y="233" width="38" height="26" rx="13" fill="none" stroke="${metal}" stroke-width="8"/>`;
    } else if (v.style === 'heart') {
      const d = 'M200 40 C 330 40 350 150 300 210 C 270 246 232 256 200 256 C 168 256 130 246 100 210 C 50 150 70 40 200 40';
      body = rope(d, col, 3.6, 'satin') +
        rope('M172 40 L 120 30', col, 3.4, 'satin') + rope('M228 40 L 280 30', col, 3.4, 'satin') +
        `<circle cx="117" cy="29.5" r="5" fill="${shade(col, 0.2)}"/><circle cx="283" cy="29.5" r="5" fill="${shade(col, 0.2)}"/>` +
        [184, 200, 216].map(x => `<ellipse cx="${x}" cy="40" rx="8" ry="7" fill="${shade(col, 0.1)}" stroke="${shade(col, 0.35)}" stroke-width="1"/>`).join('') +
        `<circle cx="200" cy="262" r="6" fill="none" stroke="${metal}" stroke-width="2.6"/>` +
        `<path d="M200 312 C 186 298 168 286 168 272 C 168 262 176 256 184 256 C 191 256 197 260 200 266 C 203 260 209 256 216 256 C 224 256 232 262 232 272 C 232 286 214 298 200 312 Z" fill="${metal}" stroke="${shade('#000000', 0)}" stroke-opacity=".12"/>`;
    } else {
      const kind = v.style === 'braided' ? 'braided' : 'rope';
      const w = v.style === 'braided' ? 13 : 12;
      const a = 'M70 150 C 70 74 140 46 210 46 C 300 46 350 92 350 150 C 350 214 300 246 246 248';
      const b = 'M84 162 C 90 92 150 64 210 64 C 290 64 334 104 334 160 C 334 210 296 236 254 238';
      const c = 'M70 150 C 72 210 120 244 186 248';
      const e = 'M84 162 C 92 214 134 236 186 238';
      body = rope(b, shade(col, 0.08), w, kind) + rope(e, shade(col, 0.08), w, kind) + rope(a, col, w, kind) + rope(c, col, w, kind) +
        `<ellipse cx="74" cy="156" rx="16" ry="22" fill="${col}"/><ellipse cx="74" cy="156" rx="16" ry="22" fill="none" stroke="${shade(col, 0.3)}" stroke-width="2" stroke-dasharray="3 3"/>` +
        `<path d="M190 226 C 172 226 168 262 192 262" fill="none" stroke="${metal}" stroke-width="11" stroke-linecap="round"/>` +
        `<path d="M204 222 L 236 222 C 262 222 262 266 236 266 L 214 266 C 206 266 204 258 204 252 Z" fill="none" stroke="${metal}" stroke-width="10" stroke-linejoin="round"/>` +
        `<rect x="216" y="252" width="8" height="6" rx="1" fill="${shade('#000000', 0)}" opacity=".18"/>`;
    }
    return `<svg class="band" viewBox="20 10 360 310" role="img" aria-label="${esc(variantName(v))}"><defs>${metalDefs(id, v)}</defs>${opts.noShadow ? '' : shadow}${body}</svg>`;
  }

  function finishTitle(v) {
    const f = FINISHES[v.finish] || FINISHES.polished;
    if (v.finish === 'painted' && colourName(v)) return `${colourName(v)} painted`;
    return f.title;
  }
  const colourName = v => (v.colorName || '').trim();
  const shortFinish = v => {
    const base = v.finish === 'rose' ? 'Rose gold' : (FINISHES[v.finish] || FINISHES.polished).title;
    return v.finish === 'painted' && colourName(v) ? `${colourName(v)} painted` : base;
  };
  function variantName(v, p) {
    const st = (STYLES[v.style] || STYLES.classic).label;
    const fin = v.finish === 'polished' || v.finish === 'gold' ? '' : shortFinish(v);
    return [st, fin, p ? p.edition.name : ''].filter(Boolean).join(' ');
  }

  // ---------- packaging ----------
  function sleeveArt(L, cls) {
    return L.art ? tintImg(L.art, L.ink || '#ffffff', 'pk-artimg' + (cls ? ' ' + cls : ''), `object-fit:${L.fit}`) : '';
  }
  // Logo on a sleeve: either the partner logo knocked out to the option's ink, or the default treatment.
  function sleeveLogo(p, L, o) {
    const sc = L.sleeve;
    if (L.ink) {
      if (p.brand.logo && p.brand.logoTone !== 'original') {
        const scale = o.scale || p.brand.logoScale || 70;
        return `<div class="plogo">${tintImg(p.brand.logo, L.ink, 'plogo-img', `max-width:${scale}cqw;max-height:${o.maxH || 62}cqh`)}</div>`;
      }
      return partnerLogo(p, Object.assign({}, o, { tone: 'ink', fallbackColor: L.ink }));
    }
    const ink = onColor(sc);
    const tone = p.brand.logoTone === 'original' ? 'original' : (ink === '#ffffff' ? p.brand.logoTone : 'black');
    return partnerLogo(p, Object.assign({}, o, { tone }));
  }
  function packFace(p, side, o) {
    o = o || {};
    const L = look(p, o.opt);
    const sc = L.sleeve;
    const ink = L.ink || onColor(sc);
    const box = p.packaging.box === 'black' ? 'pk-black' : 'pk-white';
    const emb = `<div class="pk-emboss">${tbLogo()}</div>`;
    let sleeve;
    if (side === 'front') {
      sleeve = `<div class="pk-sleeve${L.art ? ' pk-art' : ''}" style="background:${sc}">${L.art ? sleeveArt(L) : sleeveLogo(p, L, { maxH: 66 })}</div>`;
    } else {
      const g = sdg(p.edition.sdg);
      const made = esc(p.edition.madeIn || '').replace(/\.\s+/g, '.<br>');
      // The bellyband's two ends overlap and meet in the middle of the back: the right-hand
      // end sits on top. Text is centred in the left half, the QR code in the right half.
      const carry = L.art && p.packaging.backPattern !== false && L.fit !== 'contain';
      const lines = side => carry ? tintImg(L.art, L.ink || '#ffffff', `pk-artimg pk-artstrip pk-artstrip-${side}`) : '';
      const left = p.packaging.backHeading
        ? `<div class="pkb-label pkb-fit"><div class="pkb-h"><b>${esc(p.packaging.backHeading).replace(/\n/g, '<br>')}</b></div><div class="pkb-copy">${esc(p.packaging.backCopy || '')}</div></div>`
        : `<div class="pkb-label pkb-fit"><div class="pkb-h"><b>#TOGETHERBAND</b><br><b>EDITION</b> <span>SUPPORTING</span><br><b>SDG ${g.n}:</b><br><b>${esc(g.name.toUpperCase())}</b></div><div class="pkb-made">${made}</div></div>`;
      sleeve = `<div class="pk-sleeve pk-back${carry ? ' pk-carry' : ''}" style="background:${sc};color:${ink};--sl:${sc}">` +
        `<div class="pkb-flap pkb-flap-l">${lines('l')}<div class="pkb-half">${left}</div></div>` +
        `<div class="pkb-flap pkb-flap-r" style="--edge:${ink === '#ffffff' ? 'rgba(255,255,255,.28)' : 'rgba(0,0,0,.18)'}">${lines('r')}` +
        `<div class="pkb-half"><div class="pkb-label pkb-qrl">${qrSVG(p.edition.url, ink)}<div class="pkb-url">Find out more at<br>${esc(p.edition.url)}</div></div></div></div></div>`;
    }
    return `<div class="pk ${box}${o.flat ? ' pk-flat' : ''}">${emb}${sleeve}</div>`;
  }
  function packSide(p, wrapped) {
    const box = p.packaging.box === 'black' ? 'pk-black' : 'pk-white';
    const L = look(p);
    return `<div class="pk pk-side ${box}">${wrapped ? `<div class="pk-sleeve pk-art" style="background:${L.sleeve}">${sleeveArt(L)}</div>` : ''}</div>`;
  }
  // One packaging option as a labelled flat front, for the options grid and slide.
  function optionCard(p, opt, i, active) {
    return `<figure class="pko${active ? ' on' : ''}">${packFace(p, 'front', { opt })}<figcaption>${esc(opt.label || 'Option ' + (i + 1))}</figcaption></figure>`;
  }
  function box3D(p, view) {
    view = view || { rx: 56, rz: -32 };
    return `<div class="b3-scene"><div class="b3-shadow"></div><div class="b3" style="--rx:${view.rx}deg;--rz:${view.rz}deg">` +
      `<div class="b3f b3-top">${packFace(p, 'front', { flat: true })}</div>` +
      `<div class="b3f b3-bottom">${packFace(p, 'back', { flat: true })}</div>` +
      `<div class="b3f b3-left">${packSide(p, true)}</div>` +
      `<div class="b3f b3-right">${packSide(p, true)}</div>` +
      `<div class="b3f b3-front">${packSide(p, false)}</div>` +
      `<div class="b3f b3-back">${packSide(p, false)}</div>` +
      `</div></div>`;
  }

  function insertCopy(p) {
    if (p.packaging.insertCopy && p.packaging.insertCopy.trim()) return p.packaging.insertCopy.trim();
    const im = p.pricing.impact;
    return `Your band is made from Parley Ocean Plastic® thread and recycled illegal firearm metal by women artisans in Kathmandu. ` +
      `Each one plants ${im.trees} tree${im.trees == 1 ? '' : 's'}, provides ${im.meals} meals for families in need and supports ${p.pricing.beneficiary}.`;
  }
  function insertFront(p) {
    return `<div class="ins ins-front"><div class="ins-p ins-fold-l"><div class="ins-h">${p.packaging.backHeading ? esc(p.packaging.backHeading).replace(/\n/g, '<br>') : esc(p.edition.name) + ' ×<br>#TOGETHERBAND'}</div><p>${esc(insertCopy(p))}</p></div>` +
      `<div class="ins-p ins-qr">${qrSVG(p.edition.url, '#141414')}<div class="ins-url">${esc(p.edition.url)}</div></div></div>`;
  }
  function insertBack(p) {
    const L = look(p);
    const sc = L.sleeve;
    const ink = L.ink || onColor(sc);
    return `<div class="ins ins-back"><div class="ins-p"><div class="ins-panel" style="background:${sc};color:${ink}">${tbLogo({ color: ink })}<div class="ins-sdg">SDG ${sdg(p.edition.sdg).n} · ${esc(sdg(p.edition.sdg).name)}</div></div></div>` +
      `<div class="ins-p ins-fold-r${L.art ? ' pk-art' : ''}" style="background:${L.art ? sc : shade(sc, 0.12)}">${L.art ? sleeveArt(L) : sleeveLogo(p, L, { maxH: 50, scale: 78 })}</div></div>`;
  }
  function qrCard(p) {
    const sc = sleeveColor(p);
    return `<div class="qrc" style="background:${sc}"><div class="qrc-in">${qrSVG(p.edition.url, '#141414')}<div class="qrc-cap">SCAN TO JOIN THE CAMPAIGN · ${esc(p.edition.url.toUpperCase())}</div></div></div>`;
  }

  // ---------- costs ----------
  function styleOrder(p) {
    const seen = [];
    p.edition.variants.forEach(v => { if (!seen.includes(v.style)) seen.push(v.style); });
    return seen.length ? seen : ['classic'];
  }
  function costRows(p) {
    const pr = p.pricing, im = pr.impact;
    const rows = [];
    styleOrder(p).forEach(style => {
      pr.tiers.slice().sort((a, b) => a.units - b.units).forEach(t => {
        const price = Number(pr.prices[style]) || 0;
        const disc = price * (1 - (Number(t.discount) || 0) / 100);
        const u = Number(t.units) || 0;
        rows.push({
          style, units: u, price, discount: Number(t.discount) || 0, disc, pack: Number(pr.packaging) || 0,
          total: u * (disc + (Number(pr.packaging) || 0)),
          trees: u * im.trees, co2: u * im.co2, meals: u * im.meals,
          donation: u * disc * (Number(pr.donationPct) || 0) / 100
        });
      });
    });
    return rows;
  }
  function quote(p, units, style) {
    const pr = p.pricing, im = pr.impact;
    units = Math.max(0, Math.floor(Number(units) || 0));
    const tiers = pr.tiers.slice().sort((a, b) => a.units - b.units);
    let tier = null;
    tiers.forEach(t => { if (units >= t.units) tier = t; });
    const discount = tier ? Number(tier.discount) || 0 : 0;
    const price = Number(pr.prices[style]) || 0;
    const disc = price * (1 - discount / 100);
    const pack = Number(pr.packaging) || 0;
    return {
      units, style, tier, discount, price, disc, pack,
      bands: units * disc, packaging: units * pack, total: units * (disc + pack),
      donation: units * disc * (Number(pr.donationPct) || 0) / 100,
      trees: units * im.trees, co2: units * im.co2, meals: units * im.meals
    };
  }
  function costTable(p, cls) {
    const pr = p.pricing, c = pr.currency;
    const rows = costRows(p);
    const body = rows.map(r => `<tr><th scope="row">${num(r.units)} units<br><span>${esc(STYLES[r.style].label)}</span></th>` +
      `<td>${money(r.price, c, 2)}</td><td>${r.discount}%</td><td>${money(r.disc, c, 2)}</td><td>${money(r.pack, c, 2)}</td>` +
      `<td class="ct-total">${money(r.total, c, 0)}</td><td>${num(r.trees)}</td><td>${num(r.co2)}</td><td>${num(r.meals)}</td>` +
      `<td>${money(r.donation, c, 0)}</td><td>${num(pr.impact.trees)}</td><td>${num(pr.impact.co2)}</td><td>${num(pr.impact.meals)}</td></tr>`).join('');
    return `<table class="ct ${cls || ''}"><thead>` +
      `<tr class="ct-group"><th></th><th colspan="5"></th><th colspan="3" class="ct-g">Total impact</th><th class="ct-g2"></th><th colspan="3" class="ct-g">Impact per recipient</th></tr>` +
      `<tr><th></th><th>Standard price</th><th>Discount</th><th>Discounted price</th><th>Bespoke packaging*</th><th>Total product cost</th>` +
      `<th>Trees planted</th><th>CO₂ offset (kg)</th><th>Meals provided</th><th>${esc(pr.donationPct)}% donation to ${esc(pr.beneficiary)}</th>` +
      `<th>Trees planted</th><th>CO₂ offset (kg)</th><th>Meals provided</th></tr></thead><tbody>${body}</tbody></table>`;
  }

  // ---------- slides ----------
  const IMG = 'assets/img/';
  const ICONS = {
    bottle: '<path d="M20 6h8v6l4 5v23a3 3 0 0 1-3 3H19a3 3 0 0 1-3-3V17l4-5z"/><path d="M16 26c5 3 11-3 16 0"/>',
    hands: '<circle cx="24" cy="14" r="5"/><path d="M14 30c3-5 7-7 10-7s7 2 10 7"/><path d="M6 26l8 12h20l8-12"/>',
    clasp: '<path d="M18 12a10 10 0 1 0 0 24"/><path d="M26 12h4a12 12 0 0 1 0 24h-4z"/>',
    tree: '<path d="M24 42V22"/><circle cx="24" cy="16" r="9"/><path d="M16 30l8-6 8 6"/>',
    coin: '<circle cx="22" cy="22" r="12"/><path d="M22 15v14M26 18h-6a2.5 2.5 0 0 0 0 5h4a2.5 2.5 0 0 1 0 5h-6"/><path d="M34 34l6 6M40 34v6h-6"/>',
    meal: '<circle cx="24" cy="26" r="13"/><path d="M14 10v8a3 3 0 0 0 6 0v-8M17 10v24M33 10c-3 2-4 6-4 9h4v15"/>'
  };
  const icon = (k, color) => `<svg class="s-ic" viewBox="0 0 48 48" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>`;

  function slides(p) {
    const A = p.brand.deckAccent || '#C41A2E';
    const ink = onColor(A);
    const PN = esc(p.partner.toUpperCase());
    const ED = esc(p.edition.name.toUpperCase());
    const g = sdg(p.edition.sdg);
    const hero = p.edition.variants[0] || { style: 'classic', rope: A, finish: 'gold' };
    const im = p.pricing.impact;
    const on = k => p.deck.slides[k] !== false;
    const list = [];
    const add = (key, html, title) => list.push({ key, html, title });
    const foot = () => `<div class="s-foot">${list.length + 1} | #TOGETHERBAND | ${PN}</div>`;
    const logoTone = ink === '#ffffff' ? 'white' : 'black';
    const hl = (a, b, c) => `<h2 class="s-h">${a ? esc(a) + ' ' : ''}<em style="color:${A}">${esc(b)}</em>${c ? '<br>' + esc(c) : ''}</h2>`;

    const coverArt = p.deck.coverArt && (p.artworks || []).find(a => a.id === p.deck.coverArt);
    if (on('cover') && coverArt) add('cover', `<div class="slide s-cover s-cover-art" style="background:${A};color:${ink}">` +
      tintImg(coverArt.src, ink, 's-cover-pattern') +
      `<div class="s-cover-badge" style="background:${A}">${tbLogo({ color: ink })}<span class="s-cover-x">×</span><span class="s-cover-ed">${ED}</span></div></div>`, 'Cover');
    else if (on('cover')) add('cover', `<div class="slide s-cover" style="background:${A};color:${ink}">` +
      `<div class="s-cover-tb">${tbLogo({ color: ink })}</div><div class="s-plus">+</div>` +
      `<div class="s-cover-logo">${partnerLogo(p, { tone: logoTone, scale: 46, maxH: 70, fallbackColor: ink })}</div></div>`, 'Cover');

    const BR = p.edition.origin === 'brazil';
    if (on('mission')) add('mission', `<div class="slide s-split">` +
      `<div class="s-txt"><h2 class="s-h"><em style="color:${A}">#TOGETHERBAND</em><br>OUR MISSION</h2>` +
      `<p><b>${BR ? 'Empowering artisan communities in Brazil and the Amazon Rainforest.' : 'Empowering artisan communities in Brazil, Nepal and the Amazon Rainforest.'}</b> We are a mission-driven company dedicated to empowering economically vulnerable women and Indigenous communities through regenerative design.</p>` +
      `<p><b>Protecting our planet’s resources.</b> Our collections are made with leading-edge sustainable materials. We upcycle, recycle and re-use materials at every level, from recycled satellites and food waste to confiscated illegal firearms and Ocean Plastic®.</p>` +
      `<p><b>Advocating for sustainability using creativity and culture.</b> We positively engage the public in critical social and environmental issues through our products and creative culture-led campaigns.</p></div>` +
      `<div class="s-grid4">${['atelier-yawanawa|BOTTLETOP Yawanawá Rainforest Atelier', 'humanium-metal|Humanium Metal firearm destruction', 'parley-cleanup|Parley Ocean Plastic® beach clean-up', BR ? 'yawanawa-community|Yawanawá community, Amazon Rainforest, Brazil' : 'atelier-kathmandu|BOTTLETOP Atelier Kathmandu, Nepal'].map(s => { const [f, c] = s.split('|'); return `<figure style="background-image:url(${IMG}${f}.jpg)"><figcaption>${c}</figcaption></figure>`; }).join('')}` +
      `<div class="s-grid4-band">${bandSVG(Object.assign({}, hero, { style: hero.style === 'heart' ? 'heart' : 'mini' }), { noShadow: true })}</div></div>${foot()}</div>`, 'Our mission');

    if (on('world2030')) add('world2030', `<div class="slide s-split s-rev">` +
      `<figure class="s-photo" style="background-image:url(${IMG}un-general-assembly.jpg)"><figcaption>Former UN Secretary General Ban Ki Moon and #TOGETHERBAND co-creator Cameron Saul at UN General Assembly</figcaption></figure>` +
      `<div class="s-txt">${hl('A', 'BETTER', 'WORLD BY 2030')}` +
      `<p><b>#TOGETHERBAND</b> is a campaign that supports the 17 Sustainable Development Goals, the United Nations’ route map to build a better world by 2030.</p>` +
      `<p><b>Earth Day 2019</b> was our launch moment. Since then over 1,000 ambassadors have worn our bands and shared why the Goals matter, generating over 9.5 billion social impressions.</p>` +
      `<p><b>The band</b> is an invitation for everyone to choose their Goal and take action. Made from recycled ocean plastic and confiscated illegal firearm metal, it comes in each of the colours of the SDGs.</p></div>${foot()}</div>`, 'A better world by 2030');

    if (on('change')) add('change', `<div class="slide s-split">` +
      `<div class="s-txt"><h2 class="s-h">#TOGETHERBAND<br>DRIVES <em style="color:${A}">CHANGE</em></h2>` +
      `<p><b class="s-cap">We inform</b><br>Our campaign raises awareness of the critical issues the Goals address through creativity and culture.</p>` +
      `<p><b class="s-cap">We inspire action</b><br>A global network of social entrepreneurs, activists, innovators, grassroots charities and ambassadors from across culture and sport, working to drive change for a sustainable future.</p>` +
      `<p><b class="s-cap">We empower</b><br>From the artisans who make our bands to the people who wear them and share our story, #TOGETHERBAND exists to bring people together to protect our planet.</p></div>` +
      `<div class="s-grid4">${['ambassador-bjk|Billie Jean King · Goal 5', 'ambassador-db|David Beckham · Goal 3', 'ambassador-lh|Lewis Hamilton · Goal 4', 'ambassador-jj|Jameela Jamil · Goal 5'].map(s => { const [f, c] = s.split('|'); return `<figure style="background-image:url(${IMG}${f}.jpg)"><figcaption>${c}<br>#TOGETHERBAND AMBASSADOR</figcaption></figure>`; }).join('')}</div>${foot()}</div>`, 'Drives change');

    if (on('materials')) add('materials', `<div class="slide s-split s-rev">` +
      `<div class="s-stack"><figure style="background-image:url(${IMG}${BR ? 'atelier-yawanawa' : 'nepal-artisans'}.jpg)"></figure><figure style="background-image:url(${IMG}yawanawa-community.jpg)"></figure></div>` +
      `<div class="s-txt s-small"><h2 class="s-h" style="color:${A}"><b>#TOGETHERBAND<br>MATERIALS &amp; PRODUCTION</b></h2>` +
      `<p><b>Humanium Metal clasp.</b> Someone is shot every minute. Humanium Metal is recycled stainless steel made from illegal firearms seized by authorities in Central America. Every clasp helps end armed violence and funds projects that rebuild conflict-torn societies.</p>` +
      `<p><b>Recycled rope &amp; açaí seeds.</b> An estimated 12.7 million tonnes of plastic enter our oceans every year. Our Parley Ocean Plastic® rope is made from intercepted plastic waste. In the Amazon our bands use seeds left over after the Yawanawá harvest.</p>` +
      `<p><b>Empowering women and Indigenous communities.</b> ${BR ? '#TOGETHERBAND supports economically vulnerable women and Indigenous communities across Brazil, providing skills, fair work and income for families, and helping communities protect their ecosystems.' : '#TOGETHERBANDs are made by economically vulnerable women rescued from the streets and human trafficking in Kathmandu, and by Indigenous communities protecting their ecosystems.'}</p></div>${foot()}</div>`, 'Materials & production');

    if (on('impact')) add('impact', `<div class="slide s-impact">` +
      `<div class="s-imp-band">${bandSVG(hero, { noShadow: true })}</div>` +
      `<div class="s-imp-title"><h2 class="s-h">THE <em style="color:${A}">IMPACT</em> OF<br>A #TOGETHERBAND</h2><p><b>Every band drives impact<br>in six ways</b></p></div>` +
      [['bottle', 'Rope made from 100% Parley Ocean Plastic®', 'l1'], ['hands', BR ? 'Supports economically disadvantaged women and families in Brazil' : 'Made by economically disadvantaged women in Brazil and Nepal', 'l2'], ['clasp', 'Clasps made from Humanium Metal: recycled, decommissioned illegal firearms', 'l3'],
        ['tree', `${im.trees} tree${im.trees == 1 ? '' : 's'} planted for every band`, 'r1'], ['coin', `${p.pricing.donationPct}% of proceeds donated to ${esc(p.pricing.beneficiary)}`, 'r2'], ['meal', `${im.meals} meals for families in need with every band`, 'r3']]
        .map(([k, t, pos]) => `<div class="s-imp-pt s-${pos}">${icon(k, A)}<span>${t}</span></div>`).join('') + `${foot()}</div>`, 'Impact of a band');

    if (on('partnership') && (p.deck.intro || '').trim()) add('partnership', `<div class="slide s-split">` +
      `<div class="s-txt">${hl(p.edition.name.toUpperCase() + ' ×', '#TOGETHERBAND', '')}${(p.deck.intro || '').split(/\n{2,}/).map(x => `<p>${esc(x)}</p>`).join('')}` +
      `<p class="s-sdg"><span style="background:${g.color}">${g.n}</span>Supporting SDG ${g.n}: ${esc(g.name)}</p></div>` +
      `<div class="s-feature" style="background:${tint(A, 0.9)}">${bandSVG(hero)}</div>${foot()}</div>`, 'About this partnership');

    if (on('yourband')) add('yourband', `<div class="slide s-section" style="background:${A};color:${ink}"><h2>YOUR BAND,<br>YOUR MESSAGE</h2></div>`, 'Your band, your message');

    // One product slide per band variant, repeated for each packaging option when there are several.
    const prodOpts = (p.packaging.options || []).length > 1 ? p.packaging.options : [undefined];
    if (on('products')) p.edition.variants.forEach(v => prodOpts.forEach(opt => {
      const st = STYLES[v.style].label.toUpperCase();
      const fin = v.finish === 'polished' || v.finish === 'gold' ? '' : (shortFinish(v).toUpperCase() + ' ');
      const tag = opt ? `<div class="s-prod-opt">PACKAGING OPTION: ${esc((opt.label || '').toUpperCase())}</div>` : '';
      add('product', `<div class="slide s-product"><div class="s-prod-h" style="color:${A}"><b>${st} ${fin}${ED}</b> <span>#TOGETHERBAND</span><br>` +
        `<b>${v.style === 'heart' ? 'RECYCLED ILLEGAL FIREARM METAL HEART &amp; OCEAN PLASTIC' : esc(finishTitle(v).toUpperCase()) + ' RECYCLED ILLEGAL FIREARM METAL &amp; OCEAN PLASTIC'}</b></div>${tag}` +
        `<div class="s-prod-row"><div class="s-prod-c">${packFace(p, 'front', { opt })}<span>FRONT</span></div><div class="s-prod-c">${packFace(p, 'back', { opt })}<span>BACK</span></div>` +
        `<div class="s-prod-band">${bandSVG(v)}</div></div><div class="s-prod-sdg">GOAL ${g.n} · ${esc(g.name.toUpperCase())}</div>${foot()}</div>`,
        `${STYLES[v.style].label} ${shortFinish(v)}${opt ? ' · ' + (opt.label || '') : ''}`);
    }));

    if (on('unboxing')) add('unboxing', `<div class="slide s-unbox">` +
      `<div class="s-ub-box">${box3D(p, { rx: 52, rz: -30 })}</div>` +
      (p.packaging.insert ? `<div class="s-ub-ins">${insertFront(p)}</div>` : '') +
      (p.packaging.qrCard ? `<div class="s-ub-qr">${qrCard(p)}</div>` : '') +
      `<div class="s-ub-t s-ub-t1"><b>#TOGETHERBAND range</b><br>Award-winning waste materials: Parley Ocean Plastic® thread and Humanium confiscated illegal firearm metal.</div>` +
      `<div class="s-ub-t s-ub-t2"><b>${ED} branded bellyband</b><br>Your artwork on a recyclable bellyband in your brand colours, wrapped around our embossed gift box.</div>` +
      (p.packaging.insert ? `<div class="s-ub-t s-ub-t3"><b>#TOGETHERBAND × ${ED}</b><br>A concertina insert unpacks the product, the campaign and your key messages.*</div>` : '') +
      (p.packaging.qrCard ? `<div class="s-ub-t s-ub-t4"><b>A direct link to your campaign.</b><br>An optional QR card* points people to ${esc(p.edition.url)}.</div>` : '') +
      `<div class="s-note">* Optional packaging elements are available at additional cost.</div>${foot()}</div>`, 'Packaging contents');

    const opts = (p.packaging.options || []);
    if (on('options') && opts.length > 1) add('options', `<div class="slide s-product s-opts"><div class="s-prod-h" style="color:${A}"><b>${ED}</b> <span>PACKAGING OPTIONS</span></div>` +
      `<div class="s-opt-grid" style="--cols:${opts.length > 4 ? 3 : opts.length}">${opts.map((o, i) => optionCard(p, o, i, false)).join('')}</div>${foot()}</div>`, 'Packaging options');

    if (on('insert') && p.packaging.insert) add('insert', `<div class="slide s-product"><div class="s-prod-h" style="color:${A}"><b>${ED}</b> <span>BOOKLET INSERT</span></div>` +
      `<div class="s-ins-row"><div class="s-prod-c">${insertFront(p)}<span>FRONT</span></div><div class="s-prod-c">${insertBack(p)}<span>BACK</span></div></div>${foot()}</div>`, 'Booklet insert');

    if (on('power')) add('power', `<div class="slide s-power" style="background-image:linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.45)),url(${IMG}crowd-aerial.jpg)">` +
      `<div class="s-pw-band">${bandSVG(Object.assign({}, hero, { style: 'mini' }), { noShadow: true })}</div>` +
      `<div class="s-pw-c"><h2 class="s-h">THE <em style="color:${tint(A, 0.25)}">POWER</em><br>OF THE BAND</h2><p>#TOGETHERBANDs are a symbol of impact, purpose and values. They carry messages and start conversations.</p></div>` +
      [['Gifts with meaning', 'Engage clients and teams around sustainable products or programmes'], ['Activated at events', 'Use the bands interactively at events or as takeaways'], ['Drive social engagement', 'Encourage your customers to share on social media'], ['Communicate a new direction', 'Embody new objectives, purpose and campaigns'],
        ['Share your message', 'A physical touchpoint that carries your message'], ['Facilitate conversations', 'Bring people together around the issues that matter'], ['Empower change', 'Help teams act as changemakers and show what matters to them'], ['Engage new starters', 'Welcome people with a band that explains your purpose']]
        .map(([h, t], i) => `<div class="s-pw-pt s-pw-${i}"><b>${h.toUpperCase()}</b><br>${t}</div>`).join('') + `${foot()}</div>`, 'The power of the band');

    if (on('costs')) add('costs', `<div class="slide s-costs"><h2 class="s-h s-costs-h"><em style="color:${A}">${ED}</em> #TOGETHERBANDS: COSTS AND IMPACT<br><small>IN ADDITION TO ARTISAN LIVELIHOODS, OCEAN PLASTIC AND RECYCLED ILLEGAL FIREARM METAL</small></h2>` +
      `<div class="s-ct" style="--acc:${A};--acc2:${shade(A, 0.3)};--accInk:${ink}">${costTable(p, 'ct-slide')}</div>` +
      `<div class="s-note">* NOTE: ${esc(p.pricing.note || '')}</div>${foot()}</div>`, 'Costs & impact');

    if (on('community')) add('community', `<div class="slide s-full" style="background-image:url(${IMG}ambassador-wall.jpg)">${foot()}</div>`, 'Ambassador community');

    if (on('thanks')) add('thanks', `<div class="slide s-section s-thanks" style="background:${A};color:${ink}"><h2>THANK YOU</h2>` +
      `<div class="s-thanks-l">${tbLogo({ color: ink })}<span class="s-plus-sm">+</span><div class="s-thanks-p">${partnerLogo(p, { tone: logoTone, scale: 90, maxH: 80, fallbackColor: ink })}</div></div></div>`, 'Thank you');

    return list;
  }

  TB.render = {
    esc, mix, shade, tint, onColor, luma, sdg, money, num, sleeveColor,
    tbLogo, partnerLogo, qrSVG, look, activeOption, optionCard, tintURL, fitText, bandSVG, bandDrawing, hydrateBands, photoSpec, variantName, packFace, box3D,
    insertFront, insertBack, qrCard, costRows, costTable, quote, slides, hexToRgb, rgbToHex
  };
})(window);
