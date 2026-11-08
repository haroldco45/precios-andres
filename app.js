/* Precios al Día — Negocios de Andrés · Vibras Positivas HM */
const SITE = 'https://precios-andres.netlify.app/';
// En Netlify usa su propia API; en GitHub Pages (u otro sitio) usa la misma API de Netlify
const API = location.hostname.endsWith('netlify.app') ? '/api/precios' : SITE + 'api/precios';
const $ = s => document.querySelector(s);
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch (e) { return d } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} },
  del(k) { try { localStorage.removeItem(k) } catch (e) {} }
};

let lang = LS.get('pl_lang', 'es');
let data = LS.get('pl_data', null);      // {sheets:{negocio:[items]}, order:[], file, updatedAt}
let cfg = LS.get('pl_cfg', { name: '', wa: '' });
let cart = LS.get('pl_cart', {});        // "negocio|clave" -> cantidad
let pin = LS.get('pl_pin', '');          // clave de Andrés (solo en su celular)
let dirty = LS.get('pl_dirty', 0);       // cambios de Andrés sin publicar
const owner = () => !!pin;
const st = { sheet: data?.order?.[0] || null, q: '', cat: '', onlyChg: false };

const T = {
 es: {app:'Precios al Día',title:'Negocios de Andrés',update:'Actualizar',settings:'Ajustes',search:'Buscar producto o código…',all:'Todo',changes:'Cambios',
  products:'productos',changed:'cambiaron',newp:'nuevos',loaded:'Precios del',
  wT:'Los precios de los negocios, siempre a la mano',wP:'Andrés publica aquí la lista de precios. Cada vez que la cambie, esta app se pone al día sola al abrirla, y sigue funcionando aunque no haya internet.',
  noList:'Andrés todavía no ha publicado la lista de precios. Toque «Actualizar» más tarde.',
  oT:'Panel de precios',oP:'Suba la planilla de Excel. Usted revisa cómo quedó, toca «Publicar» y los negocios la ven de una vez con el mismo enlace.',
  s1:'La secretaria hace la planilla en Excel con Producto y Precio de venta (una hoja por negocio).',s2:'Toque «Subir Excel» y escójala.',s3:'Toque «Publicar» y mande el enlace a los negocios por WhatsApp.',
  demo:'Ver un ejemplo',up:'Subió',down:'Bajó',nw:'Nuevo',before:'Antes',noRes:'No hay productos con esa búsqueda.',
  seeQuote:'Ver cotización',quote:'Cotización',items:'productos en la cotización',send:'Enviar por WhatsApp',empty:'Vaciar',add:'Agregar a la cotización',remove:'Quitar',close:'Cerrar',qty:'Cantidad',total:'Total',
  bizName:'Nombre que se ve en este celular',ownerWa:'WhatsApp para enviar cotizaciones (opcional)',waHint:'Con indicativo, ej. 573001234567. Si lo deja vacío, WhatsApp le pregunta a quién enviarla.',
  save:'Guardar',erase:'Borrar los datos de este celular',eraseQ:'¿Borrar la lista guardada y la cotización de este celular?',
  okLoad:'Planilla leída: {n} productos. Revise y toque «Publicar».',okSame:'Es la misma planilla, no hay precios nuevos',errFile:'No se pudo leer la planilla. Revise que tenga una columna de Producto y otra de Precio.',
  offline:'Sin internet: se muestran los últimos precios guardados.',gotNew:'Llegaron precios nuevos',upToDate:'Los precios están al día',
  saved:'Guardado',code:'Cód.',made:'Hecho por',waHello:'Hola, le envío la cotización:',libs:'Cargando lector de Excel, intente de nuevo en un momento.',
  admin:'Administrador',adminT:'¿Administra los precios?',adminP:'Andrés o su secretaria: entre con la clave para subir el Excel y cambiar precios.',pin:'Clave',enter:'Entrar',badPin:'Clave incorrecta',
  ownerOn:'Modo administrador activo',exitOwner:'Salir del modo administrador',upload:'Subir Excel',share:'Enviar enlace',
  shareMsg:'Hola, esta es la app con la lista de precios de los negocios. Ábrala y guárdela en la pantalla del celular: ',
  publish:'Publicar',pending:'{n} cambios sin publicar',published:'Publicado: los negocios ya ven los precios nuevos',errPub:'No se pudo publicar. Revise el internet e intente de nuevo.',
  dirtyKeep:'Tiene cambios sin publicar; publíquelos primero.',addP:'Agregar producto',editT:'Cambiar producto',downloadX:'Descargar Excel',
  fName:'Producto',fPrice:'Precio de venta',fCode:'Código',fCat:'Categoría',fUnit:'Unidad',del:'Eliminar producto',delQ:'¿Eliminar este producto de la lista?',
  needNP:'Escriba el producto y el precio.',discard:'Descartar cambios',discardQ:'¿Descartar los cambios sin publicar y volver a la lista publicada?',adm:'ADMIN'},
 en: {app:'Prices Today',title:'Andrés’ Stores',update:'Refresh',settings:'Settings',search:'Search product or code…',all:'All',changes:'Changes',
  products:'products',changed:'changed',newp:'new',loaded:'Prices from',
  wT:'Store prices, always at hand',wP:'Andrés publishes the price list here. Whenever he changes it, this app updates itself when opened, and it keeps working offline.',
  noList:'Andrés has not published the price list yet. Tap “Refresh” later.',
  oT:'Price panel',oP:'Upload the Excel sheet. Check how it looks, tap “Publish” and the stores see it right away with the same link.',
  s1:'The assistant builds the sheet in Excel with Product and Sale price (one tab per store).',s2:'Tap “Upload Excel” and pick it.',s3:'Tap “Publish” and send the link to the stores on WhatsApp.',
  demo:'See an example',up:'Up',down:'Down',nw:'New',before:'Before',noRes:'No products match your search.',
  seeQuote:'See quote',quote:'Quote',items:'products in the quote',send:'Send via WhatsApp',empty:'Clear',add:'Add to quote',remove:'Remove',close:'Close',qty:'Quantity',total:'Total',
  bizName:'Name shown on this phone',ownerWa:'WhatsApp number for quotes (optional)',waHint:'With country code, e.g. 573001234567. Leave empty and WhatsApp will ask who to send it to.',
  save:'Save',erase:'Erase data on this phone',eraseQ:'Erase the saved list and quote from this phone?',
  okLoad:'Sheet read: {n} products. Review it and tap “Publish”.',okSame:'Same sheet, no new prices',errFile:'Could not read the sheet. Make sure it has a Product column and a Price column.',
  offline:'Offline: showing the last saved prices.',gotNew:'New prices arrived',upToDate:'Prices are up to date',
  saved:'Saved',code:'Code',made:'Made by',waHello:'Hi, here is the quote:',libs:'Loading the Excel reader, try again in a moment.',
  admin:'Admin',adminT:'Do you manage the prices?',adminP:'Andrés or his assistant: sign in with the PIN to upload the Excel and change prices.',pin:'PIN',enter:'Sign in',badPin:'Wrong PIN',
  ownerOn:'Admin mode on',exitOwner:'Leave admin mode',upload:'Upload Excel',share:'Send link',
  shareMsg:'Hi, this is the app with the store price list. Open it and add it to your home screen: ',
  publish:'Publish',pending:'{n} unpublished changes',published:'Published: the stores now see the new prices',errPub:'Could not publish. Check the internet and try again.',
  dirtyKeep:'You have unpublished changes; publish them first.',addP:'Add product',editT:'Edit product',downloadX:'Download Excel',
  fName:'Product',fPrice:'Sale price',fCode:'Code',fCat:'Category',fUnit:'Unit',del:'Delete product',delQ:'Delete this product from the list?',
  needNP:'Enter the product and the price.',discard:'Discard changes',discardQ:'Discard unpublished changes and go back to the published list?',adm:'ADMIN'}
};
const t = k => T[lang][k] ?? k;
const money = v => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: v % 1 ? 2 : 0 }).format(v);
const fmtDate = ms => new Intl.DateTimeFormat(lang === 'es' ? 'es-CO' : 'en-US', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ms));
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const keyOf = i => norm(i.c || i.n);

function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 3000) }
function saveData() { LS.set('pl_data', data) }
function markDirty() { dirty++; LS.set('pl_dirty', dirty); saveData(); render() }

/* ---------- Lectura de la planilla de Excel ---------- */
function toNum(v) {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  let s = String(v ?? '').replace(/[^\d.,-]/g, ''); if (!s) return null;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');   // 12.500 / 12.500,50
  else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');                // 12,500
  else s = s.replace(',', '.');
  const x = parseFloat(s); return isFinite(x) ? x : null;
}
function parseRows(rows) {
  let h = -1;
  for (let i = 0; i < Math.min(rows.length, 40); i++) { if (rows[i].some(c => /precio|valor|pvp|price/.test(norm(c)))) { h = i; break } }
  if (h < 0) return [];
  const hd = rows[h].map(norm);
  const find = (re, ex) => hd.findIndex(x => re.test(x) && !(ex && ex.test(x)));
  let p = find(/precio.*venta|^venta|pvp|price/);
  if (p < 0) p = find(/precio|valor/, /costo|compra/);
  if (p < 0) p = find(/precio|valor/);
  const n = find(/producto|descripcion|nombre|articulo|item|product/);
  const c = find(/^cod|codigo|^ref|sku|plu|code/);
  const cat = find(/categoria|linea|grupo|familia|seccion|category/);
  const u = find(/unidad|presentacion|empaque|medida|unit/);
  const b = find(/negocio|sucursal|tienda|sede|punto de venta/);
  if (n < 0 || p < 0) return [];
  const out = [];
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i] || []; const name = String(r[n] ?? '').trim(); const price = toNum(r[p]);
    if (!name || price == null) continue;
    out.push({ c: c >= 0 ? String(r[c] ?? '').trim() : '', n: name, cat: cat >= 0 ? String(r[cat] ?? '').trim() : '', u: u >= 0 ? String(r[u] ?? '').trim() : '', p: price, biz: b >= 0 ? String(r[b] ?? '').trim() : '' });
  }
  return out;
}
function parseWorkbook(wb) {
  const sheets = {}, order = [];
  wb.SheetNames.forEach(sn => {
    const items = parseRows(XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: '' }));
    items.forEach(i => { const k = i.biz || sn.trim(); delete i.biz; if (!sheets[k]) { sheets[k] = []; order.push(k) } sheets[k].push(i) });
  });
  return { sheets, order };
}
/* Compara con la lista publicada y marca qué subió, bajó o es nuevo */
function applyExcel(parsed, fileName) {
  if (!parsed.order.length) { toast(t('errFile')); return }
  let total = 0, anyChange = false;
  parsed.order.forEach(sn => {
    const old = data?.sheets?.[sn]; const map = {}; (old || []).forEach(i => map[keyOf(i)] = i);
    const same = old && old.length === parsed.sheets[sn].length && parsed.sheets[sn].every(i => map[keyOf(i)] && map[keyOf(i)].p === i.p);
    if (!same) anyChange = true;
    parsed.sheets[sn].forEach(i => {
      total++; const o = map[keyOf(i)];
      if (same) { if (o.prev != null) i.prev = o.prev; if (o.isNew) i.isNew = true; return }
      if (o) { if (o.p !== i.p) i.prev = o.p } else if (old) i.isNew = true;
    });
  });
  if (!anyChange && data && parsed.order.length === data.order.length) { toast(t('okSame')); return }
  data = { ...parsed, file: fileName, updatedAt: data?.updatedAt || Date.now() };
  if (!data.order.includes(st.sheet)) st.sheet = data.order[0];
  st.q = ''; st.cat = ''; st.onlyChg = false;
  markDirty(); toast(t('okLoad').replace('{n}', total));
}
function readFile(f) {
  if (!window.XLSX) { toast(t('libs')); return }
  const r = new FileReader();
  r.onload = e => { try { applyExcel(parseWorkbook(XLSX.read(e.target.result, { type: 'array' })), f.name) } catch (err) { console.error(err); toast(t('errFile')) } };
  r.readAsArrayBuffer(f);
}
function downloadXlsx() {
  if (!window.XLSX || !data) { toast(t('libs')); return }
  const wb = XLSX.utils.book_new();
  data.order.forEach(s => {
    const rows = [['Código', 'Producto', 'Categoría', 'Unidad', 'Precio de venta']].concat(data.sheets[s].map(i => [i.c, i.n, i.cat, i.u, i.p]));
    const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = [{ wch: 10 }, { wch: 34 }, { wch: 14 }, { wch: 10 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, s.slice(0, 31));
  });
  XLSX.writeFile(wb, `precios-${today()}.xlsx`);
}

/* ---------- Nube (Netlify) ---------- */
async function loadRemote(silent) {
  if (owner() && dirty) { if (!silent) toast(t('dirtyKeep')); return }
  try {
    const r = await fetch(API, { cache: 'no-store' }); if (!r.ok) throw 0;
    const d = await r.json();
    if (d && d.order && d.order.length) {
      const had = !!data, changed = !data || d.updatedAt !== data.updatedAt;
      data = d; saveData();
      if (!data.order.includes(st.sheet)) st.sheet = data.order[0];
      render();
      if (changed && had) toast(t('gotNew')); else if (!silent) toast(t('upToDate'));
    } else if (!silent) toast(t('noList'));
  } catch (e) { if (!silent) toast(t('offline')) }
}
async function api(body) {
  return fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', 'x-pin': pin }, body: JSON.stringify(body) });
}
async function publish() {
  const btn = $('#pubBtn'); if (btn) btn.disabled = true;
  try {
    const r = await api({ sheets: data.sheets, order: data.order, file: data.file || '' });
    if (r.status === 401) { toast(t('badPin')); return }
    if (!r.ok) throw 0;
    const j = await r.json(); data.updatedAt = j.updatedAt; dirty = 0; LS.set('pl_dirty', 0); saveData(); render(); toast(t('published'));
  } catch (e) { toast(t('errPub')) } finally { if (btn) btn.disabled = false }
}
async function login(p) {
  try {
    const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', 'x-pin': p }, body: JSON.stringify({ check: true }) });
    if (!r.ok) { toast(t('badPin')); return false }
    pin = p; LS.set('pl_pin', pin); return true;
  } catch (e) { toast(t('errPub')); return false }
}
function shareLink() {
  const url = SITE;
  window.open(`https://wa.me/?text=${encodeURIComponent(t('shareMsg') + url)}`, '_blank');
}

/* ---------- Ejemplo (solo se ve en este celular) ---------- */
function demo() {
  const base = [['101','Arroz Diana 500 g','Granos','Unidad',2900,2700],['102','Fríjol bola roja 500 g','Granos','Unidad',6800,6800],['103','Lenteja 500 g','Granos','Unidad',3900,3900],
   ['201','Aceite Premier 1.000 ml','Aceites','Botella',12500,11900],['202','Aceite Gourmet 900 ml','Aceites','Botella',15900,15900],
   ['301','Leche Proleche 900 ml','Lácteos','Bolsa',4300,4300],['302','Queso costeño libra','Lácteos','Libra',14000,13000],
   ['401','Ducales sabor a queso','Galletas','Taco',2600,2600],['402','Saltín Noel 5 tacos','Galletas','Paquete',7200,6900],['403','Galletas Muuu leche','Galletas','Paquete',5800,5800],
   ['501','Atún Van Camp’s lomitos 160 g','Enlatados','Lata',6900,7200],['502','Salchichas Zenú lata','Enlatados','Lata',5400,5400],
   ['601','Café Sello Rojo 250 g','Bebidas','Bolsa',11800,10900],['602','Chocolisto 200 g','Bebidas','Bolsa',6500,6500]];
  const mk = adj => base.map(r => ({ c: r[0], n: r[1], cat: r[2], u: r[3], p: Math.round(r[4] * adj / 100) * 100, prev: r[4] !== r[5] ? Math.round(r[5] * adj / 100) * 100 : undefined }));
  data = { sheets: { 'Negocio 1': mk(1).concat([{ c: '701', n: 'Panela Doña Pola 500 g', cat: 'Granos', u: 'Unidad', p: 3600, isNew: true }]), 'Negocio 2': mk(1.06) }, order: ['Negocio 1', 'Negocio 2'], file: 'ejemplo', updatedAt: 0 };
  st.sheet = 'Negocio 1'; render();
}

/* ---------- Pantalla ---------- */
const countChg = list => (list || []).filter(i => i.prev != null || i.isNew).length;
function itemTag(i) {
  if (i.isNew) return `<span class="tag nw">${t('nw')}</span>`;
  if (i.prev != null) return `<span class="tag ${i.p > i.prev ? 'up' : 'down'}">${i.p > i.prev ? t('up') : t('down')}</span><span class="was">${t('before')} ${money(i.prev)}</span>`;
  return '';
}
const footer = () => `<footer>${t('made')} <a href="https://vibraspositivashm.com" target="_blank" rel="noopener">Vibras Positivas HM</a></footer>`;
function filtered() {
  const list = data.sheets[st.sheet] || []; const q = norm(st.q);
  return list.filter(i => (!st.cat || i.cat === st.cat) && (!st.onlyChg || i.prev != null || i.isNew) && (!q || norm(i.n + ' ' + i.c + ' ' + i.cat).includes(q)));
}
function render() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-t]').forEach(el => el.textContent = t(el.dataset.t));
  $('#langBtn').textContent = lang === 'es' ? 'EN' : 'ES';
  $('#bizName').innerHTML = esc(cfg.name || t('title')) + (owner() ? `<span class="badge-own">${t('adm')}</span>` : '');
  $('#heroBtns').innerHTML = owner()
    ? `<button class="btn btn-main" id="upBtn">${t('upload')}</button><button class="btn btn-ghost" id="shBtn">${t('share')}</button>`
    : `<button class="btn btn-main" id="rfBtn">${t('update')}</button>`;
  if ($('#upBtn')) $('#upBtn').onclick = () => $('#file').click();
  if ($('#shBtn')) $('#shBtn').onclick = shareLink;
  if ($('#rfBtn')) $('#rfBtn').onclick = () => loadRemote(false);
  $('#meta').textContent = data && data.updatedAt ? `${t('loaded')} ${fmtDate(data.updatedAt)}` : '';
  const app = $('#app');

  if (!data) {
    app.innerHTML = owner()
      ? `<main><section class="welcome"><h2>${t('oT')}</h2><p>${t('oP')}</p><div class="steps"><div class="step"><i>1</i><span>${t('s1')}</span></div><div class="step"><i>2</i><span>${t('s2')}</span></div><div class="step"><i>3</i><span>${t('s3')}</span></div></div>
         <button class="btn btn-main" id="up2">${t('upload')}</button></section>${footer()}</main>`
      : `<main><section class="welcome"><h2>${t('wT')}</h2><p>${t('wP')}</p><p style="margin-top:12px;opacity:.75">${t('noList')}</p>
         <button class="btn btn-ghost" id="demoBtn">${t('demo')}</button></section>${footer()}</main>`;
    if ($('#up2')) $('#up2').onclick = () => $('#file').click();
    if ($('#demoBtn')) $('#demoBtn').onclick = demo;
    renderCart(); return;
  }

  const list = data.sheets[st.sheet] || [];
  const cats = [...new Set(list.map(i => i.cat).filter(Boolean))];
  const nChg = countChg(list), nNew = list.filter(i => i.isNew).length;
  let html = '';
  if (owner() && dirty) html += `<div class="pend"><span>${t('pending').replace('{n}', dirty)}</span><button class="btn" id="pubBtn">${t('publish')}</button></div>`;
  if (data.order.length > 1) html += `<div class="tabs">${data.order.map(s => `<button class="tab ${s === st.sheet ? 'on' : ''}" data-sheet="${esc(s)}">${esc(s)}</button>`).join('')}</div>`;
  html += `<div class="stats"><div class="stat"><b>${list.length}</b><span>${t('products')}</span></div>
    <div class="stat ${nChg - nNew ? 'hot' : ''}"><b>${nChg - nNew}</b><span>${t('changed')}</span></div><div class="stat"><b>${nNew}</b><span>${t('newp')}</span></div></div>`;
  if (owner()) html += `<div class="ownerbar"><button class="btn-sm" id="addBtn">${t('addP')}</button><button class="btn-sm" id="dlBtn">${t('downloadX')}</button>${dirty ? `<button class="btn-sm" id="disBtn">${t('discard')}</button>` : ''}</div>`;
  html += `<div class="searchbar"><input class="search" id="q" type="search" placeholder="${t('search')}" value="${esc(st.q)}" autocomplete="off">
    <div class="chips"><button class="chip ${!st.cat && !st.onlyChg ? 'on' : ''}" data-cat="">${t('all')}</button>
    ${nChg ? `<button class="chip alert ${st.onlyChg ? 'on' : ''}" data-chg="1">${t('changes')} (${nChg})</button>` : ''}
    ${cats.map(c => `<button class="chip ${st.cat === c ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>
    <main id="list">${listHtml(filtered())}${footer()}</main>`;
  app.innerHTML = html;

  app.querySelectorAll('[data-sheet]').forEach(b => b.onclick = () => { st.sheet = b.dataset.sheet; st.cat = ''; st.onlyChg = false; render() });
  app.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { st.cat = b.dataset.cat; st.onlyChg = false; render() });
  app.querySelectorAll('[data-chg]').forEach(b => b.onclick = () => { st.onlyChg = !st.onlyChg; st.cat = ''; render() });
  if ($('#pubBtn')) $('#pubBtn').onclick = publish;
  if ($('#addBtn')) $('#addBtn').onclick = () => editItem(null);
  if ($('#dlBtn')) $('#dlBtn').onclick = downloadXlsx;
  if ($('#disBtn')) $('#disBtn').onclick = () => { if (confirm(t('discardQ'))) { dirty = 0; LS.set('pl_dirty', 0); data = null; LS.del('pl_data'); render(); loadRemote(true) } };
  const qi = $('#q'); qi.oninput = () => { st.q = qi.value; $('#list').innerHTML = listHtml(filtered()) + footer(); bindItems() };
  bindItems(); renderCart();
}
function listHtml(rows) {
  if (!rows.length) return `<div class="empty">${t('noRes')}</div>`;
  const groups = {}; rows.forEach(i => { (groups[i.cat || '—'] ??= []).push(i) });
  return Object.keys(groups).map(g => `${g !== '—' ? `<div class="cat">${esc(g)}</div>` : ''}${groups[g].map((i, ix) => {
    const k = st.sheet + '|' + keyOf(i);
    return `<button class="item ${i.isNew ? 'new' : i.prev != null ? 'chg' : ''} ${cart[k] ? 'incart' : ''}" data-k="${esc(keyOf(i))}" style="animation-delay:${Math.min(ix, 12) * 25}ms">
      <div><div class="nm">${esc(i.n)}</div><div class="sub">${[i.c && t('code') + ' ' + esc(i.c), esc(i.u), cart[k] ? `${t('qty')}: ${cart[k]}` : ''].filter(Boolean).join(' · ')}</div></div>
      <div class="pr"><b>${money(i.p)}</b>${itemTag(i)}</div></button>`
  }).join('')}`).join('');
}
function bindItems() { document.querySelectorAll('.item').forEach(b => b.onclick = () => owner() ? editItem(b.dataset.k) : openItem(b.dataset.k)) }
const findItem = (sheet, k) => (data?.sheets?.[sheet] || []).find(i => keyOf(i) === k);

/* ---------- Andrés: agregar o cambiar un producto ---------- */
function editItem(k) {
  const list = data.sheets[st.sheet]; const i = k ? findItem(st.sheet, k) : null;
  sheet(`<h3>${i ? t('editT') : t('addP')}</h3><div class="sub">${esc(st.sheet)}</div>
   <div class="field"><label>${t('fName')}</label><input id="eN" value="${esc(i?.n)}"></div>
   <div class="field"><label>${t('fPrice')}</label><input id="eP" inputmode="decimal" value="${i ? i.p : ''}" style="font-size:24px;font-weight:800"></div>
   ${i?.prev != null ? `<div class="hint" style="margin:-8px 0 12px">${t('before')}: ${money(i.prev)}</div>` : ''}
   <div class="grid2"><div class="field"><label>${t('fCode')}</label><input id="eC" value="${esc(i?.c)}"></div><div class="field"><label>${t('fUnit')}</label><input id="eU" value="${esc(i?.u)}"></div></div>
   <div class="field"><label>${t('fCat')}</label><input id="eK" value="${esc(i?.cat)}" list="cats"><datalist id="cats">${[...new Set(list.map(x => x.cat).filter(Boolean))].map(c => `<option value="${esc(c)}">`).join('')}</datalist></div>
   <div class="row"><button class="btn btn-soft" id="eX">${t('close')}</button><button class="btn btn-dark" id="eS">${t('save')}</button></div>
   ${i ? `<button class="danger" id="eD">${t('del')}</button>` : ''}`);
  if (i) setTimeout(() => { const p = $('#eP'); p.focus(); p.select() }, 150);
  $('#eX').onclick = closeSheet;
  $('#eS').onclick = () => {
    const n = $('#eN').value.trim(), p = toNum($('#eP').value);
    if (!n || p == null) { toast(t('needNP')); return }
    const f = { n, p, c: $('#eC').value.trim(), u: $('#eU').value.trim(), cat: $('#eK').value.trim() };
    if (i) {
      if (p !== i.p) { if (i.prev == null && !i.isNew) i.prev = i.p; if (i.prev === p) delete i.prev; }
      Object.assign(i, f);
    } else list.push({ ...f, isNew: true });
    closeSheet(); markDirty();
  };
  if ($('#eD')) $('#eD').onclick = () => { if (confirm(t('delQ'))) { list.splice(list.indexOf(i), 1); delete cart[st.sheet + '|' + k]; saveCart(); closeSheet(); markDirty() } };
}

/* ---------- Negocios: cotización ---------- */
function openItem(k) {
  const i = findItem(st.sheet, k); if (!i) return; const ck = st.sheet + '|' + k; let n = cart[ck] || 1;
  sheet(`<h3>${esc(i.n)}</h3><div class="sub">${[i.c && t('code') + ' ' + esc(i.c), esc(i.u), esc(st.sheet)].filter(Boolean).join(' · ')}</div>
   <div style="font-size:30px;font-weight:800">${money(i.p)}</div>${itemTag(i)}
   <div class="qty"><button id="m">−</button><input id="n" inputmode="numeric" value="${n}"><button id="p">+</button></div>
   <div class="qtotal"><span>${t('total')}</span><span id="lt">${money(i.p * n)}</span></div>
   <div class="row">${cart[ck] ? `<button class="btn btn-soft" id="rm">${t('remove')}</button>` : `<button class="btn btn-soft" id="cl">${t('close')}</button>`}<button class="btn btn-dark" id="ad">${t('add')}</button></div>`);
  const inp = $('#n'), upd = () => { n = Math.max(1, parseInt(inp.value) || 1); inp.value = n; $('#lt').textContent = money(i.p * n) };
  $('#m').onclick = () => { inp.value = n - 1; upd() }; $('#p').onclick = () => { inp.value = n + 1; upd() }; inp.oninput = upd;
  $('#ad').onclick = () => { cart[ck] = n; saveCart(); closeSheet(); render() };
  if ($('#rm')) $('#rm').onclick = () => { delete cart[ck]; saveCart(); closeSheet(); render() };
  if ($('#cl')) $('#cl').onclick = closeSheet;
}
function cartLines() { return Object.entries(cart).map(([ck, q]) => { const [s, ...r] = ck.split('|'); const i = findItem(s, r.join('|')); return i ? { ck, s, i, q } : null }).filter(Boolean) }
function saveCart() { LS.set('pl_cart', cart) }
function renderCart() {
  const L = owner() ? [] : cartLines(); const bar = $('#cartbar');
  if (!L.length) { bar.classList.remove('show'); return }
  $('#cartCount').textContent = `${L.length} ${t('items')}`; $('#cartTotal').textContent = money(L.reduce((a, l) => a + l.i.p * l.q, 0)); bar.classList.add('show');
}
function openQuote() {
  const L = cartLines(); const tot = L.reduce((a, l) => a + l.i.p * l.q, 0);
  sheet(`<h3>${t('quote')}</h3><div class="sub">${esc(cfg.name || t('title'))} · ${fmtDate(Date.now())}</div>
   ${L.map(l => `<div class="qline"><div><b>${esc(l.i.n)}</b><div class="sub">${money(l.i.p)}${data.order.length > 1 ? ' · ' + esc(l.s) : ''}</div></div>
     <div class="q"><button data-d="${esc(l.ck)}">−</button><b>${l.q}</b><button data-u="${esc(l.ck)}">+</button><span style="min-width:78px;text-align:right">${money(l.i.p * l.q)}</span></div></div>`).join('')}
   <div class="qtotal"><span>${t('total')}</span><span>${money(tot)}</span></div>
   <div class="row"><button class="btn btn-soft" id="qc">${t('empty')}</button><button class="btn btn-wa" id="qs">${t('send')}</button></div>
   <button class="btn btn-soft" style="width:100%;margin-top:8px" id="qx">${t('close')}</button>`);
  document.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const k = b.dataset.d; cart[k]--; if (cart[k] < 1) delete cart[k]; saveCart(); render(); cartLines().length ? openQuote() : closeSheet() });
  document.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { cart[b.dataset.u]++; saveCart(); render(); openQuote() });
  $('#qc').onclick = () => { cart = {}; saveCart(); closeSheet(); render() };
  $('#qx').onclick = closeSheet;
  $('#qs').onclick = () => {
    const txt = `${t('waHello')}\n*${cfg.name || t('title')}* — ${fmtDate(Date.now())}\n\n` + L.map(l => `• ${l.q} x ${l.i.n} — ${money(l.i.p * l.q)}`).join('\n') + `\n\n*${t('total')}: ${money(tot)}*`;
    window.open(`https://wa.me/${(cfg.wa || '').replace(/\D/g, '')}?text=${encodeURIComponent(txt)}`, '_blank');
  };
}

/* ---------- Ajustes ---------- */
function openSettings() {
  sheet(`<h3>${t('settings')}</h3><div class="sub">&nbsp;</div>
   <div class="field"><label>${t('bizName')}</label><input id="fn" value="${esc(cfg.name)}" placeholder="${t('title')}"></div>
   <div class="field"><label>${t('ownerWa')}</label><input id="fw" inputmode="tel" value="${esc(cfg.wa)}" placeholder="573001234567"><div class="hint">${t('waHint')}</div></div>
   <div class="row"><button class="btn btn-soft" id="sx">${t('close')}</button><button class="btn btn-dark" id="ss">${t('save')}</button></div>
   <div class="box">${owner()
     ? `<h4>${t('ownerOn')}</h4><button class="btn btn-soft" style="width:100%" id="so">${t('exitOwner')}</button>`
     : `<h4>${t('adminT')}</h4><div class="hint" style="margin:0 0 10px">${t('adminP')}</div><div class="row"><input id="fp" type="password" inputmode="numeric" placeholder="${t('pin')}" style="flex:1;padding:12px 14px;border:1px solid var(--line);border-radius:12px;font-size:16px"><button class="btn btn-dark" id="sl">${t('enter')}</button></div>`}</div>
   <button class="danger" id="se">${t('erase')}</button>`);
  $('#sx').onclick = closeSheet;
  $('#ss').onclick = () => { cfg = { name: $('#fn').value.trim(), wa: $('#fw').value.trim() }; LS.set('pl_cfg', cfg); closeSheet(); render(); toast(t('saved')) };
  if ($('#sl')) $('#sl').onclick = async () => { const p = $('#fp').value.trim(); if (p && await login(p)) { closeSheet(); render(); toast(t('ownerOn')) } };
  if ($('#so')) $('#so').onclick = () => { pin = ''; LS.del('pl_pin'); closeSheet(); render(); loadRemote(true) };
  $('#se').onclick = () => { if (confirm(t('eraseQ'))) { LS.del('pl_data'); LS.del('pl_cart'); LS.set('pl_dirty', 0); dirty = 0; data = null; cart = {}; closeSheet(); render(); loadRemote(true) } };
}

/* ---------- Hoja inferior y arranque ---------- */
function sheet(html) { $('#sheet').innerHTML = html; $('#ov').classList.add('show') }
function closeSheet() { $('#ov').classList.remove('show') }
$('#ov').onclick = e => { if (e.target.id === 'ov') closeSheet() };
$('#file').onchange = e => { const f = e.target.files[0]; if (f) readFile(f); e.target.value = '' };
$('#setBtn').onclick = openSettings;
$('#cartOpen').onclick = openQuote;
$('#langBtn').onclick = () => { lang = lang === 'es' ? 'en' : 'es'; LS.set('pl_lang', lang); render() };
window.addEventListener('offline', () => toast(t('offline')));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') loadRemote(true) });

render();
loadRemote(true);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
