/* #TOGETHERBAND B2B Studio — application state, editor bindings and views. */
(function () {
  'use strict';
  const TB = window.TB;
  const R = TB.render;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const STORE = 'tb-studio-projects-v1';
  const framed = (() => { try { return window.top !== window.self; } catch (e) { return true; } })();

  // ---------- state ----------
  let projects = load();
  let current = projects[0];
  let view3d = { rx: 56, rz: -32 };
  let presentIdx = 0;
  let deckList = [];

  function withExtras(list) {
    (TB.extraSamples || []).forEach(x => { if (!list.some(p => p.id === x.id)) list.unshift(TB.newProject(x)); });
    return list;
  }
  function load() { return withExtras(loadStored()); }
  function loadStored() {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.projects) && data.projects.length) {
          const list = data.projects.map(p => TB.newProject(p));
          const last = list.findIndex(p => p.id === data.current);
          if (last > 0) list.unshift(list.splice(last, 1)[0]);
          return list;
        }
      }
    } catch (e) { /* storage unavailable */ }
    return TB.sampleProjects();
  }
  let saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORE, JSON.stringify({ current: current.id, projects }));
        $('#savedNote').textContent = 'Saved in this browser · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        $('#savedNote').textContent = 'Not saved: this browser blocked storage, or the logo file is too large. Use “Save / load file” to keep a copy.';
      }
    }, 300);
  }

  const getPath = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  function setPath(o, path, v) {
    const ks = path.split('.');
    const last = ks.pop();
    const t = ks.reduce((a, k) => (a[k] = a[k] || {}), o);
    t[last] = v;
  }

  // ---------- editor ----------
  function fillStatic() {
    $('#brandMark').innerHTML = R.tbLogo({ bottletop: false });
    $('#f-sdg').innerHTML = TB.SDGS.map(g => `<option value="${g.n}">Goal ${g.n}: ${g.name}</option>`).join('');
    $('#slideToggles').innerHTML = TB.SLIDES.map(s => `<label><input type="checkbox" data-bind="deck.slides.${s.key}"> ${s.label}</label>`).join('');
    $$('[data-standalone]').forEach(el => { el.hidden = framed; });
  }

  function syncForm() {
    $$('[data-bind]').forEach(el => {
      if (el === document.activeElement && el.type !== 'checkbox') return;
      const v = getPath(current, el.dataset.bind);
      if (el.type === 'checkbox') el.checked = v !== false && !!v;
      else el.value = v == null ? '' : v;
    });
    $('#scaleOut').textContent = current.brand.logoScale + '%';
    $('#sleeveCustom').hidden = current.packaging.sleeve !== 'custom';
    $('#wordmarkFields').hidden = !!current.brand.logo;
    $('#pickFromLogo').hidden = !current.brand.logo;
    renderLogoPrev();
    renderVariantsEditor();
    renderTiersEditor();
    renderOptionsEditor();
    $('#sleeveNote').hidden = !(current.packaging.options || []).length;
    renderProjectSelect();
  }

  function onBindInput(e) {
    const el = e.target.closest('[data-bind]');
    if (!el) return;
    let v;
    if (el.type === 'checkbox') v = el.checked;
    else if ('num' in el.dataset) v = el.value === '' ? 0 : Number(el.value);
    else v = el.value;
    if ('hex' in el.dataset || el.type === 'color') {
      v = String(v).trim();
      if (!v.startsWith('#')) v = '#' + v;
      if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return;
      if (v.length === 4) v = '#' + v.slice(1).split('').map(c => c + c).join('');
    }
    const path = el.dataset.bind;
    const before = getPath(current, path);
    setPath(current, path, v);
    // Keep edition name in step with partner name while the user hasn't diverged them.
    if (path === 'partner' && (current.edition.name === String(before).toUpperCase() || current.edition.name === before)) {
      current.edition.name = v.toUpperCase();
      if (!current.brand.logo && (current.brand.wordmark === before)) current.brand.wordmark = v;
    }
    changed(path);
  }

  function changed(path) {
    current.updated = Date.now();
    syncForm();
    scheduleRender();
    save();
    if (path === 'partner') renderProjectSelect();
  }

  function renderProjectSelect() {
    const sel = $('#projectSelect');
    sel.innerHTML = projects.map(p => `<option value="${p.id}">${R.esc(p.partner)}</option>`).join('');
    sel.value = current.id;
  }

  // ----- logo -----
  function renderLogoPrev() {
    const p = current;
    const bg = R.sleeveColor(p);
    $('#logoPrev').style.background = bg;
    $('#logoPrev').innerHTML = R.partnerLogo(p, { tone: p.brand.logoTone, scale: 80, maxH: 70 });
    $('#logoClear').hidden = !p.brand.logo;
  }
  function readLogo(file) {
    if (!file || !/^image\//.test(file.type)) return;
    if (file.size > 4 * 1024 * 1024) { $('#savedNote').textContent = 'That logo is over 4 MB. Export a smaller PNG or an SVG and try again.'; return; }
    const fr = new FileReader();
    fr.onload = () => downscale(fr.result, file.type, url => {
      const firstLogo = !current.brand.logo;
      current.brand.logo = url;
      dominantColor(url).then(c => {
        // On a fresh project still using the default red, adopt the logo's colour automatically.
        if (c && firstLogo && current.brand.primary.toUpperCase() === '#C41A2E') {
          current.brand.primary = c;
          current.brand.deckAccent = c;
          current.packaging.sleeveColor = c;
          current.edition.variants.forEach(v => { if (String(v.rope).toUpperCase() === '#C41A2E') v.rope = c; });
          setTimeout(() => { $('#savedNote').textContent = 'Brand colour taken from the logo. Change it under Brand colour if needed.'; }, 400);
        }
        changed('brand.logo');
      });
    });
    fr.readAsDataURL(file);
  }
  // Keep stored logos small enough for browser storage.
  function downscale(url, type, cb) {
    if (type === 'image/svg+xml') return cb(url);
    const img = new Image();
    img.onload = () => {
      const max = 1200;
      const s = Math.min(1, max / Math.max(img.width, img.height));
      if (s === 1 && url.length < 900000) return cb(url);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      cb(c.toDataURL('image/png'));
    };
    img.onerror = () => cb(url);
    img.src = url;
  }
  // Most common saturated colour in the logo, ignoring white, black and transparency.
  function dominantColor(url) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          const s = 64 / Math.max(img.width || 64, img.height || 64);
          c.width = Math.max(1, Math.round((img.width || 64) * s)); c.height = Math.max(1, Math.round((img.height || 64) * s));
          const x = c.getContext('2d');
          x.drawImage(img, 0, 0, c.width, c.height);
          const d = x.getImageData(0, 0, c.width, c.height).data;
          const buckets = {};
          for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] < 128) continue;
            const r = d[i], g = d[i + 1], b = d[i + 2];
            const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
            if (mx > 235 && mn > 235) continue;
            if (mx < 30) continue;
            if (mx - mn < 28) continue;
            const k = (r >> 4) + ',' + (g >> 4) + ',' + (b >> 4);
            const bk = buckets[k] || (buckets[k] = { n: 0, r: 0, g: 0, b: 0 });
            bk.n++; bk.r += r; bk.g += g; bk.b += b;
          }
          const best = Object.values(buckets).sort((a, b) => b.n - a.n)[0];
          res(best ? R.rgbToHex(best.r / best.n, best.g / best.n, best.b / best.n) : null);
        } catch (e) { res(null); }
      };
      img.onerror = () => res(null);
      img.src = url;
    });
  }

  // ----- variants -----
  const ROPES = TB.SDGS.map(g => ({ c: g.color, t: `Goal ${g.n}` })).concat([{ c: '#2B2D31', t: 'Black' }]);
  function renderVariantsEditor() {
    const box = $('#variants');
    if (box.contains(document.activeElement) && ['color', 'text'].includes(document.activeElement.type)) return;
    box.innerHTML = current.edition.variants.map((v, i) => `
      <div class="var" data-i="${i}">
        <div class="var-band">${R.bandSVG(v, { noShadow: true })}</div>
        <div class="var-f">
          <div class="f-row">
            <div class="f"><label for="v-style-${i}">Style</label><select id="v-style-${i}" data-v="style">${Object.entries(TB.STYLES).map(([k, s]) => `<option value="${k}"${v.style === k ? ' selected' : ''}>${s.label}</option>`).join('')}</select></div>
            <div class="f"><label for="v-fin-${i}">Clasp finish</label><select id="v-fin-${i}" data-v="finish">${Object.entries(TB.FINISHES).map(([k, s]) => `<option value="${k}"${v.finish === k ? ' selected' : ''}>${s.label}</option>`).join('')}</select></div>
          </div>
          <div class="f"><span class="lbl">Cord colour</span>
            <div class="sw">${ROPES.map(r => `<button type="button" class="sw-b${r.c.toLowerCase() === String(v.rope).toLowerCase() ? ' on' : ''}" style="background:${r.c}" data-rope="${r.c}" title="${r.t}" aria-label="${r.t} cord"></button>`).join('')}
              <label class="sw-custom" title="Custom colour"><input type="color" data-v="rope" value="${v.rope}" aria-label="Custom cord colour"></label></div>
          </div>
          <div class="f"><label for="v-cn-${i}">Colour name in titles (optional)</label><input id="v-cn-${i}" type="text" data-v="colorName" value="${R.esc(v.colorName || '')}" placeholder="e.g. Gold"></div>
          ${v.finish === 'metallic' ? `<div class="f"><label for="v-metal-${i}">Metallic clasp colour</label><div class="color-in"><input id="v-metal-${i}" type="color" data-v="metal" value="${v.metal}"></div></div>` : ''}
          <div class="var-act">
            <button type="button" class="linkbtn" data-vact="up"${i === 0 ? ' disabled' : ''}>Move up</button>
            <button type="button" class="linkbtn" data-vact="dup">Duplicate</button>
            <button type="button" class="linkbtn" data-vact="del"${current.edition.variants.length < 2 ? ' disabled' : ''}>Remove</button>
          </div>
        </div>
      </div>`).join('');
  }
  function onVariant(e) {
    const card = e.target.closest('.var');
    if (!card) return;
    const i = Number(card.dataset.i);
    const vs = current.edition.variants;
    const v = vs[i];
    const t = e.target;
    if (t.dataset.rope) { v.rope = t.dataset.rope; return changed('variants'); }
    if (t.dataset.v && e.type !== 'click') { v[t.dataset.v] = t.value; return changed('variants'); }
    const act = t.dataset.vact;
    if (act === 'del' && vs.length > 1) vs.splice(i, 1);
    if (act === 'dup') vs.splice(i + 1, 0, Object.assign({}, v, { id: TB.uid() }));
    if (act === 'up' && i > 0) vs.splice(i - 1, 0, vs.splice(i, 1)[0]);
    if (act) changed('variants');
  }

  // ----- packaging options -----
  function renderOptionsEditor() {
    const p = current;
    const arts = p.artworks || [];
    const ae = $('#arts');
    if (!ae.contains(document.activeElement)) ae.innerHTML = arts.length ? arts.map((a, i) => `
      <div class="art" data-a="${i}"><div class="art-th"><img src="${a.src}" alt=""></div>
        <input type="text" data-af="name" value="${R.esc(a.name)}" aria-label="Artwork name">
        <button type="button" class="linkbtn" data-adel>Remove</button></div>`).join('') : '<p class="hint">No artwork yet. Options can still use the partner logo.</p>';
    const box = $('#opts');
    if (box.contains(document.activeElement) && document.activeElement.type !== 'radio') return;
    const os = p.packaging.options || [];
    const artOpts = sel => `<option value="logo"${sel === 'logo' ? ' selected' : ''}>Partner logo</option>` + arts.map(a => `<option value="${a.id}"${sel === a.id ? ' selected' : ''}>${R.esc(a.name)}</option>`).join('');
    box.innerHTML = os.map((o, i) => `
      <div class="opt${i === (Number(p.packaging.active) || 0) ? ' on' : ''}" data-o="${i}">
        <div class="opt-top">
          <label class="opt-show"><input type="radio" name="activeOpt" data-oshow ${i === (Number(p.packaging.active) || 0) ? 'checked' : ''}> Show</label>
          <input type="text" data-of="label" value="${R.esc(o.label || '')}" aria-label="Option name">
        </div>
        <div class="f-row f-row3">
          <div class="f"><label for="o-art-${i}">Artwork</label><select id="o-art-${i}" data-of="art">${artOpts(o.art)}</select></div>
          <div class="f"><label for="o-sl-${i}">Sleeve</label><div class="color-in"><input id="o-sl-${i}" type="color" data-of="sleeve" value="${o.sleeve}"></div></div>
          <div class="f"><label for="o-ink-${i}">Artwork colour</label><div class="color-in"><input id="o-ink-${i}" type="color" data-of="ink" value="${o.ink}"></div></div>
        </div>
        <div class="var-act">
          <button type="button" class="linkbtn" data-oact="dup">Duplicate</button>
          <button type="button" class="linkbtn" data-oact="fit">${o.fit === 'contain' ? 'Fill sleeve with artwork' : 'Fit whole artwork'}</button>
          <button type="button" class="linkbtn" data-oact="del">Remove</button>
        </div>
      </div>`).join('');
  }
  function onOption(e) {
    const p = current;
    const t = e.target;
    const art = t.closest('.art');
    if (art) {
      const i = Number(art.dataset.a);
      if (t.dataset.af && e.type !== 'click') { p.artworks[i].name = t.value; return changed('art'); }
      if ('adel' in t.dataset && e.type === 'click') {
        const id = p.artworks[i].id;
        p.artworks.splice(i, 1);
        p.packaging.options.forEach(o => { if (o.art === id) o.art = 'logo'; });
        $('#arts').innerHTML = '';
        return changed('art');
      }
      return;
    }
    const row = t.closest('.opt');
    if (!row) return;
    const i = Number(row.dataset.o);
    const os = p.packaging.options;
    if ('oshow' in t.dataset) { p.packaging.active = i; return changed('opt'); }
    if (t.dataset.of && e.type !== 'click') { os[i][t.dataset.of] = t.value; return changed('opt'); }
    const act = t.dataset.oact;
    if (!act || e.type !== 'click') return;
    if (act === 'del') { os.splice(i, 1); if (p.packaging.active >= os.length) p.packaging.active = Math.max(0, os.length - 1); }
    if (act === 'dup') os.splice(i + 1, 0, Object.assign({}, os[i], { id: TB.uid(), label: (os[i].label || '') + ' copy' }));
    if (act === 'fit') os[i].fit = os[i].fit === 'contain' ? 'cover' : 'contain';
    $('#opts').innerHTML = '';
    changed('opt');
  }
  function readArtwork(files) {
    Array.from(files || []).filter(f => /^image\//.test(f.type)).forEach(file => {
      const fr = new FileReader();
      fr.onload = () => downscale(fr.result, file.type, url => {
        current.artworks = current.artworks || [];
        current.artworks.push({ id: TB.uid(), name: file.name.replace(/\.[^.]+$/, ''), src: url });
        $('#arts').innerHTML = '';
        changed('art');
      });
      fr.readAsDataURL(file);
    });
  }

  // ----- tiers -----
  function renderTiersEditor() {
    const box = $('#tiers');
    if (box.contains(document.activeElement)) return;
    box.innerHTML = current.pricing.tiers.map((t, i) => `
      <div class="tier" data-i="${i}">
        <div class="f"><label for="t-u-${i}">From units</label><input id="t-u-${i}" type="number" min="1" step="1" data-t="units" value="${t.units}"></div>
        <div class="f"><label for="t-d-${i}">Discount %</label><input id="t-d-${i}" type="number" min="0" max="100" step="1" data-t="discount" value="${t.discount}"></div>
        <button type="button" class="linkbtn" data-tdel${current.pricing.tiers.length < 2 ? ' disabled' : ''}>Remove</button>
      </div>`).join('');
  }
  function onTier(e) {
    const row = e.target.closest('.tier');
    if (!row) return;
    const i = Number(row.dataset.i);
    if (e.target.dataset.t) { current.pricing.tiers[i][e.target.dataset.t] = Number(e.target.value) || 0; return changed('tiers'); }
    if ('tdel' in e.target.dataset && e.type === 'click' && current.pricing.tiers.length > 1) { current.pricing.tiers.splice(i, 1); $('#tiers').innerHTML = ''; changed('tiers'); }
  }

  // ---------- views ----------
  let raf;
  function scheduleRender() { cancelAnimationFrame(raf); raf = requestAnimationFrame(renderAll); }
  function renderAll() {
    renderPackaging();
    renderDeck();
    renderCosts();
  }

  function renderPackaging() {
    const p = current;
    const g = R.sdg(p.edition.sdg);
    $('#pkTitle').textContent = `${p.partner} × #TOGETHERBAND packaging`;
    const ao = R.activeOption(p);
    $('#pkSub').textContent = `${p.packaging.box === 'black' ? 'Black' : 'White'} embossed gift box with a ${p.partner} sleeve${ao ? ' · Showing: ' + (ao.label || 'option') : ''} · Supporting Goal ${g.n}: ${g.name}`;
    $('#b3wrap').innerHTML = R.box3D(p, view3d);
    const os = p.packaging.options || [];
    $('#pkOptsWrap').hidden = os.length < 2;
    $('#pkOpts').innerHTML = os.map((o, i) => `<button type="button" class="pko-btn" data-opt="${i}" aria-pressed="${i === (Number(p.packaging.active) || 0)}">${R.optionCard(p, o, i, i === (Number(p.packaging.active) || 0))}</button>`).join('');
    $('#pkFront').innerHTML = R.packFace(p, 'front');
    $('#pkBack').innerHTML = R.packFace(p, 'back');
    let ex = '';
    if (p.packaging.insert) ex += `<figure class="pk-fig pk-fig-wide"><div>${R.insertFront(p)}</div><figcaption>Booklet insert, front</figcaption></figure><figure class="pk-fig pk-fig-wide"><div>${R.insertBack(p)}</div><figcaption>Booklet insert, back</figcaption></figure>`;
    if (p.packaging.qrCard) ex += `<figure class="pk-fig pk-fig-qr"><div>${R.qrCard(p)}</div><figcaption>QR card</figcaption></figure>`;
    $('#pkExtras').innerHTML = ex;
    $('#pkExtras').hidden = !ex;
    $('#pkVariants').innerHTML = p.edition.variants.map(v => `<figure class="pkv">${R.bandSVG(v)}<figcaption><b>${R.esc(R.variantName(v))}</b><span>${R.esc(TB.FINISHES[v.finish].title)} clasp · ${R.money(p.pricing.prices[v.style], p.pricing.currency, 2)} RRP</span></figcaption></figure>`).join('');
  }

  function renderDeck() {
    deckList = R.slides(current);
    $('#deckSub').textContent = `${deckList.length} slides · ${current.partner} × #TOGETHERBAND`;
    $('#deck').innerHTML = deckList.map((s, i) => `<figure class="thumb"><button type="button" class="thumb-btn" data-slide="${i}" aria-label="Present from slide ${i + 1}: ${R.esc(s.title)}">${s.html}</button><figcaption>${i + 1}. ${R.esc(s.title)}</figcaption></figure>`).join('');
    if (!$('#present').hidden) showSlide(presentIdx);
  }

  function renderCosts() {
    const p = current;
    const sel = $('#q-style');
    const styles = Array.from(new Set(p.edition.variants.map(v => v.style)));
    const prev = sel.value;
    sel.innerHTML = styles.map(s => `<option value="${s}">${TB.STYLES[s].label}</option>`).join('');
    sel.value = styles.includes(prev) ? prev : styles[0];
    $('#costTable').innerHTML = R.costTable(p);
    $('#costTable').style.setProperty('--acc', p.brand.deckAccent);
    $('#costTable').style.setProperty('--acc2', R.shade(p.brand.deckAccent, 0.3));
    $('#costTable').style.setProperty('--accInk', R.onColor(p.brand.deckAccent));
    $('#costNote').textContent = '* ' + (p.pricing.note || '') + ' Donation is calculated on the discounted band price.';
    renderQuote();
  }
  function renderQuote() {
    const p = current;
    const q = R.quote(p, $('#q-units').value, $('#q-style').value);
    const c = p.pricing.currency;
    const tierTxt = q.tier ? `${q.discount}% volume discount (${R.num(q.tier.units)}+ tier)` : `No volume discount below ${R.num(Math.min.apply(null, p.pricing.tiers.map(t => t.units)))} units`;
    $('#quoteOut').innerHTML = `
      <div class="q-total"><span>Total product cost</span><b>${R.money(q.total, c, 0)}</b><small>${R.money(q.disc + q.pack, c, 2)} per band incl. packaging · ${tierTxt}</small></div>
      <dl class="q-list">
        <div><dt>Bands</dt><dd>${R.num(q.units)} × ${R.money(q.disc, c, 2)} = ${R.money(q.bands, c, 0)}</dd></div>
        <div><dt>Bespoke packaging</dt><dd>${R.num(q.units)} × ${R.money(q.pack, c, 2)} = ${R.money(q.packaging, c, 0)}</dd></div>
        <div><dt>Donation to ${R.esc(p.pricing.beneficiary)}</dt><dd>${R.money(q.donation, c, 0)} (${p.pricing.donationPct}%)</dd></div>
      </dl>
      <div class="q-impact">
        <div><b>${R.num(q.trees)}</b><span>trees planted</span></div>
        <div><b>${R.num(q.co2)}</b><span>kg CO₂ offset</span></div>
        <div><b>${R.num(q.meals)}</b><span>meals provided</span></div>
      </div>`;
  }

  // ---------- 3D box interaction ----------
  function bind3D() {
    const wrap = $('#b3wrap');
    let drag = null;
    wrap.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, rx: view3d.rx, rz: view3d.rz }; wrap.setPointerCapture(e.pointerId); wrap.classList.add('dragging'); });
    wrap.addEventListener('pointermove', e => {
      if (!drag) return;
      view3d.rz = drag.rz - (e.clientX - drag.x) * 0.5;
      view3d.rx = Math.max(0, Math.min(180, drag.rx - (e.clientY - drag.y) * 0.5));
      const b = $('.b3', wrap);
      if (b) { b.style.setProperty('--rx', view3d.rx + 'deg'); b.style.setProperty('--rz', view3d.rz + 'deg'); }
    });
    const end = () => { drag = null; wrap.classList.remove('dragging'); };
    wrap.addEventListener('pointerup', end);
    wrap.addEventListener('pointercancel', end);
    $$('[data-view]').forEach(b => b.addEventListener('click', () => {
      view3d = { front: { rx: 0, rz: 0 }, back: { rx: 180, rz: 0 }, angle: { rx: 56, rz: -32 } }[b.dataset.view];
      const el = $('.b3', wrap);
      el.style.setProperty('--rx', view3d.rx + 'deg'); el.style.setProperty('--rz', view3d.rz + 'deg');
    }));
  }

  // ---------- presenting ----------
  function openPresent(i) {
    presentIdx = i || 0;
    $('#present').hidden = false;
    showSlide(presentIdx);
    const el = $('#present');
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    $('#nextSlide').focus();
  }
  function closePresent() {
    $('#present').hidden = true;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  function showSlide(i) {
    presentIdx = Math.max(0, Math.min(deckList.length - 1, i));
    const s = deckList[presentIdx];
    $('#presentStage').innerHTML = s ? s.html : '';
    $('#slideCount').textContent = `${presentIdx + 1} / ${deckList.length}`;
  }

  function printDeck() {
    $('#printDeck').innerHTML = deckList.map(s => `<div class="print-page">${s.html}</div>`).join('');
    setTimeout(() => window.print(), 300);
  }

  // ---------- export image ----------
  function openModal(title, html) {
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = html;
    $('#modal').hidden = false;
    $('#modalClose').focus();
  }
  async function exportImage(sel) {
    const node = $(sel);
    openModal('Export image', '<p class="hint">Rendering…</p>');
    try {
      if (!window.htmlToImage) throw new Error('Image library did not load');
      const url = await window.htmlToImage.toPng(node, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true, filter: n => !(n.classList && n.classList.contains('b3-ctrl')) });
      const name = `${current.partner.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-togetherband-packaging.png`;
      $('#modalBody').innerHTML = `<img class="export-img" src="${url}" alt="Packaging mockup for ${R.esc(current.partner)}">` +
        (framed ? '<p class="hint">Right-click the image and choose “Save image as…”, or press and hold on a phone.</p>'
          : `<p><a class="btn btn-primary" download="${name}" href="${url}">Download PNG</a></p>`);
    } catch (e) {
      $('#modalBody').innerHTML = `<p>The image could not be created (${R.esc(e.message || e)}). Take a screenshot of the mockup instead, or open the studio in its own browser tab and try again.</p>`;
    }
  }

  // ---------- save / load file ----------
  function openData() {
    const json = JSON.stringify(current, null, 2);
    openModal('Save or load a project file', `
      <p>Projects save automatically in this browser. To share one with a colleague or keep a backup, save it as a file.</p>
      <div class="data-act">
        ${framed ? '' : '<button class="btn btn-primary" type="button" id="dlJson">Download project file</button>'}
        <button class="btn" type="button" id="copyJson">Copy project data</button>
        <label class="btn" for="loadJson">Load project file</label><input id="loadJson" type="file" accept="application/json,.json" class="sr">
      </div>
      <label for="jsonBox" class="lbl">Project data (you can also paste data here and press Load pasted data)</label>
      <textarea id="jsonBox" rows="8" spellcheck="false">${R.esc(json)}</textarea>
      <p><button class="btn" type="button" id="loadPasted">Load pasted data</button> <span class="hint" id="dataMsg"></span></p>`);
    const msg = t => { $('#dataMsg').textContent = t; };
    const dl = $('#dlJson');
    if (dl) dl.onclick = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      a.download = `${current.partner.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-studio.json`;
      a.click();
    };
    $('#copyJson').onclick = () => {
      navigator.clipboard.writeText(json).then(() => msg('Copied.')).catch(() => { $('#jsonBox').select(); msg('Press Ctrl+C or ⌘C to copy the selected data.'); });
    };
    const importText = text => {
      try {
        const obj = JSON.parse(text);
        const p = TB.newProject(Object.assign({}, obj, { id: TB.uid() }));
        projects.unshift(p); current = p;
        $('#modal').hidden = true;
        changed('import');
      } catch (e) { msg('That is not a valid studio project file.'); }
    };
    $('#loadJson').onchange = e => { const f = e.target.files[0]; if (f) f.text().then(importText); };
    $('#loadPasted').onclick = () => importText($('#jsonBox').value);
  }

  // ---------- tabs ----------
  function showTab() {
    const t = (location.hash || '#packaging').slice(1);
    const tab = ['packaging', 'deck', 'costs'].includes(t) ? t : 'packaging';
    $$('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== tab; });
    $$('[data-tab]').forEach(a => a.setAttribute('aria-selected', String(a.dataset.tab === tab)));
  }

  // ---------- wire up ----------
  function init() {
    fillStatic();
    const ed = $('#editor');
    ed.addEventListener('input', e => { if (e.target.closest('.opt, .art')) return onOption(e); if (e.target.closest('.var')) return onVariant(e); if (e.target.closest('.tier')) return onTier(e); onBindInput(e); });
    ed.addEventListener('change', e => { if (e.target.closest('.opt, .art')) return onOption(e); if (e.target.closest('.var')) return onVariant(e); if (e.target.closest('.tier')) return onTier(e); onBindInput(e); });
    $('#variants').addEventListener('click', onVariant);
    $('#tiers').addEventListener('click', onTier);
    $('#addVariant').onclick = () => {
      const last = current.edition.variants[current.edition.variants.length - 1];
      current.edition.variants.push(Object.assign({}, last, { id: TB.uid() }));
      changed('variants');
    };
    const oe = $('#arts').closest('.sec');
    oe.addEventListener('click', onOption);
    $('#f-art').onchange = e => { readArtwork(e.target.files); e.target.value = ''; };
    $('#addOpt').onclick = () => {
      const os = current.packaging.options = current.packaging.options || [];
      const last = os[os.length - 1];
      os.push(last ? Object.assign({}, last, { id: TB.uid(), label: 'Option ' + (os.length + 1) })
        : { id: TB.uid(), label: 'Option 1', art: (current.artworks[0] || { id: 'logo' }).id, sleeve: current.brand.primary, ink: '#ffffff', fit: 'cover' });
      $('#opts').innerHTML = '';
      changed('opt');
    };
    $('#makeOpts').onclick = () => {
      // Every artwork (or the logo) × each sleeve colour already used, keeping existing ink pairings.
      const os = current.packaging.options = current.packaging.options || [];
      const arts = (current.artworks || []).length ? current.artworks.map(a => ({ id: a.id, name: a.name })) : [{ id: 'logo', name: current.partner }];
      const ways = [];
      os.forEach(o => { if (!ways.some(w => w.sleeve === o.sleeve)) ways.push({ sleeve: o.sleeve, ink: o.ink, name: (o.label || '').split(' · ').pop() }); });
      if (!ways.length) ways.push({ sleeve: current.brand.primary, ink: '#ffffff', name: 'Brand colour' });
      current.packaging.options = [];
      arts.forEach(a => ways.forEach(w => current.packaging.options.push({ id: TB.uid(), label: `${a.name} · ${w.name}`, art: a.id, sleeve: w.sleeve, ink: w.ink, fit: 'cover' })));
      current.packaging.active = 0;
      $('#opts').innerHTML = '';
      changed('opt');
    };
    $('#addTier').onclick = () => {
      const t = current.pricing.tiers;
      const last = t[t.length - 1] || { units: 0, discount: 0 };
      t.push({ units: last.units * 2 || 50, discount: Math.min(100, last.discount + 5) });
      $('#tiers').innerHTML = '';
      changed('tiers');
    };
    $('#f-logo').onchange = e => readLogo(e.target.files[0]);
    $('#logoClear').onclick = () => { current.brand.logo = null; changed('brand.logo'); };
    const drop = $('#logoDrop');
    ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, () => drop.classList.remove('over')));
    drop.addEventListener('drop', e => { e.preventDefault(); readLogo(e.dataTransfer.files[0]); });
    document.addEventListener('paste', e => {
      const item = Array.from(e.clipboardData && e.clipboardData.items || []).find(i => i.type.startsWith('image/'));
      if (item) { e.preventDefault(); readLogo(item.getAsFile()); }
    });
    $('#pickFromLogo').onclick = () => dominantColor(current.brand.logo).then(c => {
      if (!c) { $('#savedNote').textContent = 'No strong colour found in the logo. Enter the brand colour by hand.'; return; }
      current.brand.primary = c; current.brand.deckAccent = c; changed('brand.primary');
    });
    $('#accentMatch').onclick = () => { current.brand.deckAccent = current.brand.primary; changed('brand.deckAccent'); };

    $('#projectSelect').onchange = e => { current = projects.find(p => p.id === e.target.value) || projects[0]; $('#tiers').innerHTML = ''; changed('switch'); };
    $('#newBtn').onclick = () => {
      const p = TB.newProject();
      projects.unshift(p); current = p;
      $('#tiers').innerHTML = '';
      changed('new');
      $$('.sec')[0].open = true;
      const f = $('#f-partner'); f.focus(); f.select();
      location.hash = '#packaging';
    };
    $('#dupBtn').onclick = () => {
      const p = TB.newProject(JSON.parse(JSON.stringify(current)));
      p.id = TB.uid(); p.partner = current.partner + ' copy';
      projects.unshift(p); current = p;
      changed('dup');
    };
    $('#delBtn').onclick = () => { $('#delConfirm').hidden = false; $('#delBtn').hidden = true; $('#delYes').focus(); };
    $('#delNo').onclick = () => { $('#delConfirm').hidden = true; $('#delBtn').hidden = false; };
    $('#delYes').onclick = () => {
      projects = projects.filter(p => p.id !== current.id);
      if (!projects.length) projects = TB.sampleProjects();
      current = projects[0];
      $('#delNo').onclick();
      changed('delete');
    };
    $('#dataBtn').onclick = openData;

    $('#presentBtn').onclick = () => openPresent(0);
    $('#printBtn').onclick = printDeck;
    $('#deck').addEventListener('click', e => { const b = e.target.closest('[data-slide]'); if (b) openPresent(Number(b.dataset.slide)); });
    $('#prevSlide').onclick = () => showSlide(presentIdx - 1);
    $('#nextSlide').onclick = () => showSlide(presentIdx + 1);
    $('#closePresent').onclick = closePresent;
    $('#presentStage').onclick = () => showSlide(presentIdx + 1);
    document.addEventListener('keydown', e => {
      if (!$('#modal').hidden && e.key === 'Escape') { $('#modal').hidden = true; return; }
      if ($('#present').hidden) return;
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); showSlide(presentIdx + 1); }
      if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); showSlide(presentIdx - 1); }
      if (e.key === 'Escape') closePresent();
    });
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && !$('#present').hidden) { /* stay in overlay */ } });

    $$('[data-export]').forEach(b => b.onclick = () => exportImage(b.dataset.export));
    $('#modalClose').onclick = () => { $('#modal').hidden = true; };
    $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') $('#modal').hidden = true; });
    $('#q-units').oninput = renderQuote;
    $('#q-style').onchange = renderQuote;

    // Product photos are recoloured asynchronously wherever they appear.
    new MutationObserver(() => R.hydrateBands(document)).observe(document.body, { childList: true, subtree: true });
    $('#goalCords').onclick = () => {
      const c = R.sdg(current.edition.sdg).color;
      current.edition.variants.forEach(v => { v.rope = c; });
      changed('variants');
    };
    window.addEventListener('hashchange', showTab);
    bind3D();
    $('#pkOpts').addEventListener('click', e => { const b = e.target.closest('[data-opt]'); if (b) { current.packaging.active = Number(b.dataset.opt); $('#opts').innerHTML = ''; changed('opt'); } });
    showTab();
    syncForm();
    renderAll();
    R.hydrateBands(document);
    // Re-render once web fonts arrive so wordmarks measure correctly.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleRender);
  }

  init();
})();
