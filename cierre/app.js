/* Cierre Diario — Negocios de Andrés · Vibras Positivas HM */
const SITE = 'https://precios-andres.netlify.app/';
// En Netlify usa su propia API; en GitHub Pages (u otro sitio) usa la misma API de Netlify
const API = location.hostname.endsWith('netlify.app') ? '/api/cierres' : SITE + 'api/cierres';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch (e) { return d } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true } catch (e) { return false } },
  del(k) { try { localStorage.removeItem(k) } catch (e) {} }
};

// La clave, el enlace del negocio y el idioma son los mismos de Precios al Día
let lang = LS.get('pl_lang', 'es');
let pin = LS.get('pl_pin', '');
const qn = new URLSearchParams(location.search).get('n');
if (qn) LS.set('pl_lock', qn);
const lock = LS.get('pl_lock', '');
const owner = () => !!pin;

let db = LS.get('cd_pl', {});            // id -> planilla (+ neg, _dirty, _prev, _stamp)
let negs = LS.get('cd_negs', []);        // [{name, tok}]
let cfg = LS.get('cd_cfg', { wa: '' });
let vence = LS.get('pl_vence', '');
let lastSync = LS.get('cd_sync', 0);
let remoteMsg = '';                      // needLink | badLink | expired
const loaded = new Set();                // meses ya traídos en esta sesión
let busy = false;

const st = { view: 'list', tab: 'pl', neg: 'all', id: null, draft: null, isNew: false,
  rep: { type: 'm', anchor: '', metric: 've', sec: 'g', q: '', concept: null } };

const T = {
 es: { app: 'Cierre Diario', title: 'Negocios de Andrés', settings: 'Ajustes', update: 'Actualizar', nueva: 'Nueva planilla', planillas: 'Planillas', informes: 'Informes', todos: 'Todos',
  ventaHoy: 'Venta de hoy', ventaSem: 'Venta de la semana', ventaMes: 'Venta del mes', venta: 'Venta', efectivo: 'Efectivo', sinSubir: 'Sin subir', turno: 'Turno',
  noPl: 'Todavía no hay planillas. Toque «Nueva planilla» para hacer el cierre de hoy.',
  wT: 'El cierre diario de cada negocio, en el celular', wP: 'Se llena igual que la planilla de papel, pero suma sola. Queda guardada, se imprime, se manda por WhatsApp y con ella salen los informes de la semana, el mes y el año.',
  s1: 'Toque «Nueva planilla» y escriba las compras, los gastos y el efectivo.', s2: 'La app suma la venta y trae los saldos de la planilla anterior.', s3: 'Guarde. Andrés la ve de inmediato y saca los informes.',
  needLink: 'Para llenar el cierre, abra el enlace de su negocio que le mandó Andrés.', badLink: 'Este enlace ya no funciona. Pídale a Andrés el enlace nuevo de su negocio.',
  noNegs: 'Todavía no hay negocios. Publique la lista de precios o agregue un negocio en Ajustes.',
  expT: 'El servicio de esta app venció', expP: 'La app dejó de funcionar el {d}. Para seguir usándola, comuníquese con Vibras Positivas HM.', expBtn: 'Escribir por WhatsApp', venceSoon: 'La app vence el {d}. Comuníquese con Vibras Positivas HM para renovarla.',
  volver: 'Volver', guardar: 'Guardar', editar: 'Editar', imprimir: 'Imprimir', whatsapp: 'WhatsApp', excel: 'Excel', eliminar: 'Eliminar', cerrar: 'Cerrar',
  delQ: '¿Eliminar esta planilla? No se puede deshacer.', delOk: 'Planilla eliminada', delErr: 'No se pudo eliminar. Revise el internet.',
  fDatos: 'Datos del cierre', establecimiento: 'Establecimiento', fecha: 'Fecha', hIni: 'Hora inicio', hFin: 'Hora final', responsable: 'Responsable', auxiliar: 'Auxiliar',
  fGastos: 'Compras y gastos', fGastosS: 'Todo respaldado con factura original. Las compras a crédito no suman en la venta.',
  desc: 'Descripción', cr: 'Crédito', co: 'Contado', og: 'Otros gastos', op: 'Gast. operativos', addRow: 'Agregar renglón', quitar: 'Quitar',
  comprasPlaza: 'Compras en plaza', gastosMuertos: 'Gastos muertos', opNote: 'Fletes, vales, servicios, consumos del personal, etc.',
  tCr: 'Total crédito (no suma en la venta)', tCo: 'Total contado', tOg: 'Total otros gastos', tOp: 'Total gastos operativos', totales: 'Totales', noSumar: 'No sumar en la venta',
  fVenta: 'Venta del día', tg: 'Total gastos', tgN: 'Suma de las compras de contado más los gastos', efN: 'El efectivo que queda de la venta diaria', veN: 'Total de gastos más el efectivo',
  efAnt: 'Efectivo anterior planilla', efAcum: 'Total efectivo acumulado', efAcumN: 'Efectivo del día más el efectivo de la planilla anterior',
  fMov: 'Movimientos de caja', fMovS: 'Lo que entra y sale de la caja después del cierre.', descMov: 'Descripción del movimiento', en: 'Entra a caja', sa: 'Sale de caja', saldo: 'Saldo',
  saldoEf: 'Saldo efectivo acumulado', pasa: 'Este pasa a la siguiente planilla',
  fMat: 'Material', matAnt: 'Saldo material anterior planilla', matDia: 'Total compra de material en el día', matAcum: 'Saldo material acumulado', auto: 'Si lo deja vacío, se toma la suma de las compras (crédito más contado).',
  fCar: 'Seguimiento de cartera', carAnt: 'Saldo de cartera planilla anterior', cliente: 'Cliente', factura: '# Factura', ab: 'Abona', abT: 'Abonos de cartera', ll: 'Lleva en mercancía o préstamo', llS: 'Lleva / préstamo', carFin: 'Saldo cartera total',
  fFirmas: 'Entrega', reviso: 'Revisó (administrador o encargado de turno)', recibe: 'Recibe (auxiliar contable)', obs: 'Observaciones',
  traer: 'Traer saldos de la planilla anterior', traidos: 'Saldos traídos de la planilla del {d}', sinPrev: 'No hay una planilla anterior de este negocio.',
  needNeg: 'Escoja el establecimiento.', needFecha: 'Escriba la fecha.', saved: 'Planilla guardada', savedOff: 'Guardada en este celular. Se sube sola cuando haya internet.',
  pend: '{n} planillas sin subir', subir: 'Subir', subidas: 'Planillas subidas', errSubir: 'No se pudieron subir. Revise el internet.',
  offline: 'Sin internet: se muestran las planillas guardadas en este celular.', alDia: 'Planillas al día', sync: 'Actualizado',
  descartar: '¿Salir sin guardar los cambios?', warnEf: 'El efectivo anterior ({a}) no coincide con el saldo de la planilla anterior ({b}).',
  respNote: 'Es responsabilidad del cajero diligenciar y entregar este formato a la persona encargada, y de la persona encargada revisarlo y entregarlo al auxiliar contable.',
  entregar: 'Entregar sumado, revisado y firmado al auxiliar contable',
  semana: 'Semana', mes: 'Mes', anio: 'Año', rubro: 'Rubro', porPeriodo: 'por día', porMes: 'por mes', sinDatos: 'No hay planillas en este período.',
  ve: 'Venta', ef: 'Efectivo', mat: 'Compra de material', cierres: 'planillas', saldosFin: 'Saldos al cierre del período',
  porConcepto: 'Por concepto', secG: 'Compras y gastos', secC: 'Caja', secK: 'Cartera', buscar: 'Buscar un rubro: fletes, servicios, un cliente…', concepto: 'Concepto', total: 'Total', veces: 'Veces',
  verConcepto: 'Toque un concepto para ver cómo se movió en el período.', quitarF: 'Quitar filtro', noConc: 'No hay conceptos con esa búsqueda.', cargando: 'Cargando planillas…',
  repT: 'Informe', periodo: 'Período', resumen: 'Resumen', detalle: 'Detalle', seccion: 'Sección', valor: 'Valor', libs: 'Cargando el generador de Excel, intente de nuevo en un momento.',
  waTo: 'WhatsApp al que se mandan los cierres (opcional)', waHint: 'Con indicativo, ej. 573001234567. Si lo deja vacío, WhatsApp le pregunta a quién enviarlo.',
  adminT: '¿Administra los negocios?', adminP: 'Andrés o su secretaria: entre con la misma clave de Precios al Día para ver todos los negocios y los informes.', pin: 'Clave', enter: 'Entrar', badPin: 'Clave incorrecta',
  ownerOn: 'Modo administrador activo', exitOwner: 'Salir del modo administrador', adm: 'ADMIN',
  linksT: 'Enlace de cada negocio', linksP: 'Cada negocio recibe su propio enlace y solo ve y llena sus planillas.', enviar: 'Enviar', copy: 'Copiar', copied: 'Enlace copiado',
  shareBiz: 'Hola, esta es la app para llenar el cierre diario de {b}. Ábrala y guárdela en la pantalla del celular: ',
  addNeg: 'Agregar negocio', negName: 'Nombre del negocio', irPrecios: 'Abrir Precios al Día', made: 'Hecho por',
  waTitulo: 'CIERRE DIARIO', waInf: 'INFORME DE CIERRES' },
 en: { app: 'Daily Closing', title: 'Andrés’ Stores', settings: 'Settings', update: 'Refresh', nueva: 'New sheet', planillas: 'Sheets', informes: 'Reports', todos: 'All',
  ventaHoy: 'Sales today', ventaSem: 'Sales this week', ventaMes: 'Sales this month', venta: 'Sales', efectivo: 'Cash', sinSubir: 'Not uploaded', turno: 'Shift',
  noPl: 'No sheets yet. Tap “New sheet” to do today’s closing.',
  wT: 'Each store’s daily closing, on the phone', wP: 'Fill it in just like the paper sheet, but it adds up by itself. It is saved, printed, sent on WhatsApp, and it feeds the weekly, monthly and yearly reports.',
  s1: 'Tap “New sheet” and enter purchases, expenses and cash.', s2: 'The app adds up sales and brings balances from the previous sheet.', s3: 'Save. Andrés sees it right away and gets the reports.',
  needLink: 'To fill in the closing, open the link for your store that Andrés sent you.', badLink: 'This link no longer works. Ask Andrés for your store’s new link.',
  noNegs: 'No stores yet. Publish the price list or add a store in Settings.',
  expT: 'This app’s service has expired', expP: 'The app stopped working on {d}. To keep using it, contact Vibras Positivas HM.', expBtn: 'Message on WhatsApp', venceSoon: 'The app expires on {d}. Contact Vibras Positivas HM to renew it.',
  volver: 'Back', guardar: 'Save', editar: 'Edit', imprimir: 'Print', whatsapp: 'WhatsApp', excel: 'Excel', eliminar: 'Delete', cerrar: 'Close',
  delQ: 'Delete this sheet? This cannot be undone.', delOk: 'Sheet deleted', delErr: 'Could not delete. Check the internet.',
  fDatos: 'Closing details', establecimiento: 'Store', fecha: 'Date', hIni: 'Start time', hFin: 'End time', responsable: 'Person in charge', auxiliar: 'Assistant',
  fGastos: 'Purchases and expenses', fGastosS: 'Everything backed by the original invoice. Credit purchases do not count toward sales.',
  desc: 'Description', cr: 'Credit', co: 'Cash', og: 'Other expenses', op: 'Operating exp.', addRow: 'Add line', quitar: 'Remove',
  comprasPlaza: 'Local purchases', gastosMuertos: 'Sunk expenses', opNote: 'Freight, vouchers, utilities, staff consumption, etc.',
  tCr: 'Total credit (not counted in sales)', tCo: 'Total cash purchases', tOg: 'Total other expenses', tOp: 'Total operating expenses', totales: 'Totals', noSumar: 'Not counted in sales',
  fVenta: 'Sales of the day', tg: 'Total expenses', tgN: 'Cash purchases plus expenses', efN: 'Cash left from the day’s sales', veN: 'Total expenses plus cash',
  efAnt: 'Cash from previous sheet', efAcum: 'Total accumulated cash', efAcumN: 'Today’s cash plus cash from the previous sheet',
  fMov: 'Cash movements', fMovS: 'What goes in and out of the cash box after closing.', descMov: 'Movement description', en: 'Cash in', sa: 'Cash out', saldo: 'Balance',
  saldoEf: 'Accumulated cash balance', pasa: 'This carries to the next sheet',
  fMat: 'Material', matAnt: 'Material balance from previous sheet', matDia: 'Total material purchased today', matAcum: 'Accumulated material balance', auto: 'Leave empty to use the sum of purchases (credit plus cash).',
  fCar: 'Receivables', carAnt: 'Receivables balance from previous sheet', cliente: 'Customer', factura: 'Invoice #', ab: 'Pays', abT: 'Receivables paid', ll: 'Takes goods or loan', llS: 'Takes / loan', carFin: 'Total receivables balance',
  fFirmas: 'Handover', reviso: 'Reviewed by (manager or shift lead)', recibe: 'Received by (accounting assistant)', obs: 'Notes',
  traer: 'Bring balances from the previous sheet', traidos: 'Balances brought from the sheet of {d}', sinPrev: 'There is no previous sheet for this store.',
  needNeg: 'Choose the store.', needFecha: 'Enter the date.', saved: 'Sheet saved', savedOff: 'Saved on this phone. It uploads by itself when there is internet.',
  pend: '{n} sheets not uploaded', subir: 'Upload', subidas: 'Sheets uploaded', errSubir: 'Could not upload. Check the internet.',
  offline: 'Offline: showing the sheets saved on this phone.', alDia: 'Sheets are up to date', sync: 'Updated',
  descartar: 'Leave without saving changes?', warnEf: 'Previous cash ({a}) does not match the balance of the previous sheet ({b}).',
  respNote: 'The cashier must fill in this form and hand it to the person in charge, who must review it and hand it to the accounting assistant.',
  entregar: 'Hand in added up, reviewed and signed to the accounting assistant',
  semana: 'Week', mes: 'Month', anio: 'Year', rubro: 'Item', porPeriodo: 'by day', porMes: 'by month', sinDatos: 'No sheets in this period.',
  ve: 'Sales', ef: 'Cash', mat: 'Material purchased', cierres: 'sheets', saldosFin: 'Balances at period end',
  porConcepto: 'By concept', secG: 'Purchases and expenses', secC: 'Cash box', secK: 'Receivables', buscar: 'Search an item: freight, utilities, a customer…', concepto: 'Concept', total: 'Total', veces: 'Times',
  verConcepto: 'Tap a concept to see how it moved in the period.', quitarF: 'Clear filter', noConc: 'No concepts match your search.', cargando: 'Loading sheets…',
  repT: 'Report', periodo: 'Period', resumen: 'Summary', detalle: 'Detail', seccion: 'Section', valor: 'Amount', libs: 'Loading the Excel builder, try again in a moment.',
  waTo: 'WhatsApp number closings are sent to (optional)', waHint: 'With country code, e.g. 573001234567. Leave empty and WhatsApp will ask who to send it to.',
  adminT: 'Do you manage the stores?', adminP: 'Andrés or his assistant: sign in with the same PIN as Prices Today to see every store and the reports.', pin: 'PIN', enter: 'Sign in', badPin: 'Wrong PIN',
  ownerOn: 'Admin mode on', exitOwner: 'Leave admin mode', adm: 'ADMIN',
  linksT: 'Link for each store', linksP: 'Each store gets its own link and only sees and fills in its own sheets.', enviar: 'Send', copy: 'Copy', copied: 'Link copied',
  shareBiz: 'Hi, this is the app to fill in the daily closing for {b}. Open it and add it to your home screen: ',
  addNeg: 'Add store', negName: 'Store name', irPrecios: 'Open Prices Today', made: 'Made by',
  waTitulo: 'DAILY CLOSING', waInf: 'CLOSING REPORT' }
};
const t = k => (T[lang] && T[lang][k]) || T.es[k] || k;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => typeof v === 'number' ? (isFinite(v) ? Math.round(v) : 0) : (parseInt(String(v ?? '').replace(/\D/g, ''), 10) || 0);
const money = n => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n || 0)).toLocaleString('es-CO');
const fin = n => n ? Number(n).toLocaleString('es-CO') : '';
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const loc = () => lang === 'en' ? 'en-US' : 'es-CO';

// Fechas: siempre con la hora real de Colombia
const hoy = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const D = s => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)) };
const iso = d => d.toISOString().slice(0, 10);
const addD = (s, n) => { const d = D(s); d.setUTCDate(d.getUTCDate() + n); return iso(d) };
const addM = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return iso(d).slice(0, 7) };
const fd = (s, o) => D(s).toLocaleDateString(loc(), { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', ...o });
const weekStart = s => addD(s, -((D(s).getUTCDay() + 6) % 7));
const fdt = ms => new Date(ms).toLocaleString(loc(), { timeZone: 'America/Bogota', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function toast(m) { const e = $('#toast'); e.textContent = m; e.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('show'), 3200) }
const saveDb = () => LS.set('cd_pl', db);
const negName = tok => (negs.find(n => n.tok === tok) || {}).name || '';
const scope = () => owner() ? (st.neg === 'all' ? negs.map(n => n.tok) : [st.neg]) : [lock];
const byDate = (a, b) => (b.fecha + (b.horaIni || '') + String(b.createdAt || 0).padStart(15, '0')).localeCompare(a.fecha + (a.horaIni || '') + String(a.createdAt || 0).padStart(15, '0'));
const planillas = () => { const s = scope(); return Object.values(db).filter(p => s.includes(p.neg)).sort(byDate) };

/* ---------- Cuentas de la planilla ---------- */
function calc(p) {
  const sum = (a, k) => (a || []).reduce((x, r) => x + num(r[k]), 0);
  const cr = sum(p.gastos, 'cr'), co = sum(p.gastos, 'co'), og = sum(p.gastos, 'og'), op = sum(p.gastos, 'op');
  const tg = co + og + op, ef = num(p.efectivo), ve = tg + ef, efAnt = num(p.efAnt), efAcum = ef + efAnt;
  let s = efAcum; const movS = (p.movs || []).map(m => (s += num(m.en) - num(m.sa)));
  const en = sum(p.movs, 'en'), sa = sum(p.movs, 'sa');
  const matAuto = cr + co, mat = (p.matDia === null || p.matDia === undefined || p.matDia === '') ? matAuto : num(p.matDia);
  const matAnt = num(p.matAnt), matAcum = matAnt + mat;
  let c = num(p.carAnt); const carS = (p.cartera || []).map(r => (c += num(r.ll) - num(r.ab)));
  const ab = sum(p.cartera, 'ab'), ll = sum(p.cartera, 'll');
  return { cr, co, og, op, tg, ef, ve, efAnt, efAcum, movS, en, sa, saldoEf: s, matAuto, mat, matAnt, matAcum, carAnt: num(p.carAnt), carS, ab, ll, carFin: c };
}
// La planilla inmediatamente anterior del mismo negocio
function prevOf(neg, fecha, id, createdAt) {
  return Object.values(db).filter(p => p.neg === neg && p.id !== id &&
    (p.fecha < fecha || (p.fecha === fecha && (p.createdAt || 0) < (createdAt || Infinity)))).sort(byDate)[0] || null;
}

/* ---------- Nube ---------- */
const headers = () => ({ 'content-type': 'application/json', ...(owner() ? { 'x-pin': pin } : {}) });
const post = body => fetch(API, { method: 'POST', headers: headers(), body: JSON.stringify(body) });

function merge(d) {
  const toks = new Set(d.toks), ids = new Set(d.planillas.map(p => p.id));
  for (const id of Object.keys(db)) {
    const p = db[id], ym = p.fecha.slice(0, 7);
    if (toks.has(p.neg) && ym >= d.from && ym <= d.to && !p._dirty && !ids.has(id)) delete db[id];
  }
  for (const rp of d.planillas) { const l = db[rp.id]; if (l && l._dirty) continue; db[rp.id] = rp }
  // Si el celular se llena, se guardan solo los últimos 14 meses; lo más viejo se trae al pedir un informe
  if (!saveDb()) { const lim = addM(hoy().slice(0, 7), -14); LS.set('cd_pl', Object.fromEntries(Object.entries(db).filter(([, p]) => p._dirty || p.fecha.slice(0, 7) >= lim))) }
}

async function load(from, to, quiet) {
  if (!owner() && !lock) { remoteMsg = 'needLink'; render(); return false }
  try {
    const url = `${API}?from=${from}&to=${to}` + (!owner() && lock ? `&n=${encodeURIComponent(lock)}` : '');
    const r = await fetch(url, { cache: 'no-store', headers: owner() ? { 'x-pin': pin } : {} });
    if (!r.ok) throw 0;
    const d = await r.json();
    if (d.vence) { vence = d.vence; LS.set('pl_vence', vence) }
    if (d.expired) { remoteMsg = 'expired'; render(); return false }
    if (d.needLink || d.badLink) {
      if (owner()) { pin = ''; LS.del('pl_pin') } // la clave guardada ya no sirve
      if (owner.retry !== 1 && lock && d.needLink) { owner.retry = 1; return load(from, to, quiet) }
      remoteMsg = d.badLink ? 'badLink' : 'needLink'; render(); return false;
    }
    remoteMsg = '';
    negs = d.negocios || []; LS.set('cd_negs', negs);
    if (st.neg !== 'all' && !negs.some(n => n.tok === st.neg)) st.neg = 'all';
    let y = from; while (y <= to) { loaded.add(y); y = addM(y, 1) }
    merge(d);
    lastSync = Date.now(); LS.set('cd_sync', lastSync);
    if (!quiet) toast(t('alDia'));
    return true;
  } catch (e) { if (!quiet) toast(t('offline')); return false }
}

async function pushDirty() {
  let ok = 0, fail = 0;
  for (const p of Object.values(db).filter(x => x._dirty)) {
    try {
      const { _dirty, _prev, _stamp, neg, ...pl } = p;
      const r = await post({ n: neg, planilla: pl, prevFecha: _prev || pl.fecha });
      if (r.status === 403) { remoteMsg = 'expired'; break }
      if (!r.ok) throw 0;
      const j = await r.json(), cur = db[p.id];
      if (cur && cur._stamp === _stamp) { delete cur._dirty; delete cur._prev; delete cur._stamp; cur.updatedAt = j.updatedAt }
      ok++;
    } catch (e) { fail++ }
  }
  saveDb();
  return { ok, fail };
}

async function refresh(quiet) {
  if (busy) return; busy = true;
  await pushDirty();
  const now = hoy().slice(0, 7);
  loaded.clear();
  await load(addM(now, -2), now, quiet);
  busy = false;
  if (st.view === 'list') render();
}
// Trae los meses que falten para un informe
async function ensure(from, to) {
  let need = false, y = from; while (y <= to) { if (!loaded.has(y)) need = true; y = addM(y, 1) }
  if (!need || ensure.busy === from + to) return;
  ensure.busy = from + to;
  const ok = await load(from, to, true);
  if (!ok) { let m = from; while (m <= to) { loaded.add(m); m = addM(m, 1) } } // sin internet: se trabaja con lo guardado
  ensure.busy = '';
  if (st.view === 'list' && st.tab === 'inf') render();
}

/* ---------- Pantallas ---------- */
function header() {
  $('#appName').textContent = t('app');
  const single = !owner() && negs[0] ? negs[0].name : (st.neg !== 'all' && negName(st.neg)) || t('title');
  $('#bizName').innerHTML = esc(single) + (owner() ? `<span class="badge-own">${t('adm')}</span>` : '');
  $('#langBtn').textContent = lang === 'es' ? 'EN' : 'ES';
  $('#setBtn').textContent = t('settings');
  document.documentElement.lang = lang;
  document.title = t('app') + ' · ' + t('title');
}
const footer = () => `<footer>${t('made')} <a href="https://vibraspositivashm.com" target="_blank" rel="noopener">Vibras Positivas HM</a></footer>`;

function render() {
  header();
  const app = $('#app'), hero = $('#hero'), meta = $('#meta');
  hero.innerHTML = ''; meta.textContent = '';
  if (remoteMsg === 'expired') {
    app.innerHTML = `<main><section class="welcome"><h2>${t('expT')}</h2><p>${t('expP').replace('{d}', vence ? fd(vence) : '')}</p>
      <a class="btn btn-main" style="display:inline-block;text-decoration:none;margin-top:16px" href="https://wa.me/573117700431" target="_blank" rel="noopener">${t('expBtn')}</a></section>${footer()}</main>`;
    return;
  }
  if (remoteMsg === 'needLink' || remoteMsg === 'badLink') {
    app.innerHTML = `<main><section class="welcome"><h2>${t('wT')}</h2><p>${t(remoteMsg)}</p>
      <button class="btn btn-main" id="goAdmin">${t('adminT')}</button></section>${footer()}</main>`;
    $('#goAdmin').onclick = openSettings; return;
  }
  if (st.view === 'form') return renderForm();
  if (st.view === 'view') return renderView();

  hero.innerHTML = `<button class="btn btn-main" id="newBtn">${t('nueva')}</button><button class="btn btn-ghost" id="updBtn">${t('update')}</button>`;
  $('#newBtn').onclick = () => openForm(null);
  $('#updBtn').onclick = () => refresh(false);
  if (lastSync) meta.textContent = `${t('sync')}: ${fdt(lastSync)}`;

  const left = vence ? Math.ceil((new Date(vence + 'T23:59:59-05:00') - Date.now()) / 864e5) : 999;
  const soon = owner() && left <= 30 ? `<div class="pend" style="background:#ffe9ea;border-color:#ffb3b5;color:#8a1f23"><span>${t('venceSoon').replace('{d}', fd(vence))}</span></div>` : '';
  const nd = Object.values(db).filter(p => p._dirty).length;
  const pend = nd ? `<div class="pend"><span>${t('pend').replace('{n}', nd)}</span><button class="btn" id="pushBtn">${t('subir')}</button></div>` : '';
  const chips = owner() && negs.length > 1 ? `<div class="chips"><button class="chip ${st.neg === 'all' ? 'on' : ''}" data-neg="all">${t('todos')}</button>${negs.map(n => `<button class="chip ${st.neg === n.tok ? 'on' : ''}" data-neg="${esc(n.tok)}">${esc(n.name)}</button>`).join('')}</div>` : '';
  const tabs = `<div class="tabs"><button class="tab ${st.tab === 'pl' ? 'on' : ''}" data-tab="pl">${t('planillas')}</button><button class="tab ${st.tab === 'inf' ? 'on' : ''}" data-tab="inf">${t('informes')}</button></div>`;

  app.innerHTML = soon + pend + tabs + chips + (st.tab === 'pl' ? listHTML() : reportHTML());
  $$('[data-tab]').forEach(b => b.onclick = () => { st.tab = b.dataset.tab; render() });
  $$('[data-neg]').forEach(b => b.onclick = () => { st.neg = b.dataset.neg; st.rep.concept = null; render() });
  $$('[data-open]').forEach(b => b.onclick = () => { st.id = b.dataset.open; st.view = 'view'; render(); scrollTo(0, 0) });
  if ($('#pushBtn')) $('#pushBtn').onclick = async () => { const r = await pushDirty(); toast(r.fail ? t('errSubir') : t('subidas')); render() };
  if ($('#firstBtn')) $('#firstBtn').onclick = () => openForm(null);
  if (st.tab === 'inf') bindReport();
}

function listHTML() {
  if (owner() && !negs.length) return `<main><div class="empty">${t('noNegs')}</div>${footer()}</main>`;
  const list = planillas(), h = hoy(), ws = weekStart(h), ym = h.slice(0, 7);
  let vh = 0, vs = 0, vm = 0;
  for (const p of list) { const v = calc(p).ve; if (p.fecha === h) vh += v; if (p.fecha >= ws && p.fecha <= addD(ws, 6)) vs += v; if (p.fecha.slice(0, 7) === ym) vm += v }
  const stats = `<div class="stats"><div class="stat hot"><b>${money(vh)}</b><span>${t('ventaHoy')}</span></div><div class="stat"><b>${money(vs)}</b><span>${t('ventaSem')}</span></div><div class="stat ok"><b>${money(vm)}</b><span>${t('ventaMes')}</span></div></div>`;
  if (!list.length) return stats + `<main><section class="welcome"><h2>${t('wT')}</h2><p>${t('wP')}</p>
    <div class="steps"><div class="step"><i>1</i><span>${t('s1')}</span></div><div class="step"><i>2</i><span>${t('s2')}</span></div><div class="step"><i>3</i><span>${t('s3')}</span></div></div>
    <button class="btn btn-main" id="firstBtn">${t('nueva')}</button></section>${footer()}</main>`;
  let out = '', last = '';
  list.forEach((p, i) => {
    const m = p.fecha.slice(0, 7);
    if (m !== last) { last = m; out += `<div class="cat">${esc(D(m + '-01').toLocaleDateString(loc(), { timeZone: 'UTC', month: 'long', year: 'numeric' }))}</div>` }
    const c = calc(p), multi = owner() && st.neg === 'all' && negs.length > 1;
    const sub = [multi ? negName(p.neg) : '', p.turno ? `${t('turno')} ${p.turno}` : '', p.responsable].filter(Boolean).map(esc).join(' · ');
    out += `<button class="item ${p._dirty ? 'wait' : ''}" data-open="${esc(p.id)}" style="animation-delay:${Math.min(i, 12) * 30}ms">
      <div><div class="nm">${esc(fd(p.fecha))}</div><div class="sub">${sub || '&nbsp;'}</div>${p._dirty ? `<span class="tag wt">${t('sinSubir')}</span>` : ''}</div>
      <div class="pr"><small>${t('venta')}</small><b>${money(c.ve)}</b><small>${t('efectivo')} ${money(c.ef)}</small></div></button>`;
  });
  return stats + `<main>${out}${footer()}</main>`;
}

/* ---------- Formulario ---------- */
const blank = () => ({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), fecha: hoy(), turno: '', horaIni: '', horaFin: '', responsable: '', auxiliar: '',
  gastos: [{}, {}, {}, {}], efectivo: 0, efAnt: 0, movs: [{}, {}], matAnt: 0, matDia: null, carAnt: 0, cartera: [{}, {}], reviso: '', recibe: '', obs: '', createdAt: Date.now() });

function carry(d, silent) {
  const pv = d.neg ? prevOf(d.neg, d.fecha, d.id, d.createdAt) : null;
  if (!pv) { if (!silent) toast(t('sinPrev')); return }
  const c = calc(pv); d.efAnt = c.saldoEf; d.matAnt = c.matAcum; d.carAnt = c.carFin;
  if (!silent) toast(t('traidos').replace('{d}', fd(pv.fecha)));
}
function openForm(id) {
  if (id) { st.draft = JSON.parse(JSON.stringify(db[id])); st.isNew = false; st.draft._orig = db[id].fecha }
  else {
    const d = blank(); d.neg = owner() ? (st.neg !== 'all' ? st.neg : (negs.length === 1 ? negs[0].tok : '')) : lock;
    const mine = planillas()[0]; if (mine && !owner()) { d.responsable = mine.responsable || ''; d.auxiliar = mine.auxiliar || '' }
    carry(d, true); st.draft = d; st.isNew = true;
  }
  for (const k of ['gastos', 'movs', 'cartera']) if (!st.draft[k] || !st.draft[k].length) st.draft[k] = [{}];
  st.touched = false; st.view = 'form'; render(); scrollTo(0, 0);
}
const inp = (k, v, ph) => `<input data-k="${k}" value="${esc(v ?? '')}" placeholder="${esc(ph || '')}" autocomplete="off">`;
const minp = (k, v, ph) => `<input class="money" data-k="${k}" data-m="1" inputmode="numeric" value="${fin(num(v))}" placeholder="${esc(ph || '0')}" autocomplete="off">`;

function renderForm() {
  const d = st.draft;
  const negField = owner() && negs.length > 1
    ? `<select data-k="neg"><option value="">—</option>${negs.map(n => `<option value="${esc(n.tok)}" ${d.neg === n.tok ? 'selected' : ''}>${esc(n.name)}</option>`).join('')}</select>`
    : `<input value="${esc(negName(d.neg))}" disabled>`;
  const gRows = d.gastos.map((r, i) => `<div class="ln"><div class="ln-top">${inp(`gastos.${i}.d`, r.d, t('desc'))}<button class="x" data-rm="gastos.${i}">${t('quitar')}</button></div>
    <div class="ln-cols c4"><div><label>${t('cr')}</label>${minp(`gastos.${i}.cr`, r.cr)}</div><div><label>${t('co')}</label>${minp(`gastos.${i}.co`, r.co)}</div>
    <div><label>${t('og')}</label>${minp(`gastos.${i}.og`, r.og)}</div><div><label>${t('op')}</label>${minp(`gastos.${i}.op`, r.op)}</div></div></div>`).join('');
  const mRows = d.movs.map((r, i) => `<div class="ln"><div class="ln-top">${inp(`movs.${i}.d`, r.d, t('descMov'))}<button class="x" data-rm="movs.${i}">${t('quitar')}</button></div>
    <div class="ln-cols c3"><div><label>${t('en')}</label>${minp(`movs.${i}.en`, r.en)}</div><div><label>${t('sa')}</label>${minp(`movs.${i}.sa`, r.sa)}</div>
    <div><label>${t('saldo')}</label><div class="ro" data-o="mov.${i}"></div></div></div></div>`).join('');
  const cRows = d.cartera.map((r, i) => `<div class="ln"><div class="ln-top">${inp(`cartera.${i}.cl`, r.cl, t('cliente'))}<input data-k="cartera.${i}.fa" value="${esc(r.fa ?? '')}" placeholder="${t('factura')}" style="max-width:110px" autocomplete="off"><button class="x" data-rm="cartera.${i}">${t('quitar')}</button></div>
    <div class="ln-cols c3"><div><label>${t('ab')}</label>${minp(`cartera.${i}.ab`, r.ab)}</div><div><label>${t('llS')}</label>${minp(`cartera.${i}.ll`, r.ll)}</div>
    <div><label>${t('saldo')}</label><div class="ro" data-o="car.${i}"></div></div></div></div>`).join('');

  $('#app').innerHTML = `<main>
    <div class="row" style="margin-top:12px"><button class="btn btn-soft" id="backBtn" style="flex:0 0 auto">${t('volver')}</button><button class="btn btn-sm" id="carryBtn">${t('traer')}</button></div>
    <div class="card"><h3>${t('fDatos')}</h3><div class="sub"></div>
      <div class="field"><label>${t('establecimiento')}</label>${negField}</div>
      <div class="grid2"><div class="field"><label>${t('fecha')}</label><input type="date" data-k="fecha" value="${esc(d.fecha)}"></div><div class="field"><label>${t('turno')}</label>${inp('turno', d.turno)}</div></div>
      <div class="grid2"><div class="field"><label>${t('hIni')}</label><input type="time" data-k="horaIni" value="${esc(d.horaIni)}"></div><div class="field"><label>${t('hFin')}</label><input type="time" data-k="horaFin" value="${esc(d.horaFin)}"></div></div>
      <div class="grid2"><div class="field"><label>${t('responsable')}</label>${inp('responsable', d.responsable)}</div><div class="field"><label>${t('auxiliar')}</label>${inp('auxiliar', d.auxiliar)}</div></div>
    </div>
    <div class="card"><h3>${t('fGastos')}</h3><div class="sub">${t('fGastosS')}</div>${gRows}
      <button class="btn btn-soft" data-add="gastos" style="width:100%">${t('addRow')}</button>
      <div style="margin-top:10px"><div class="tot note"><span>${t('tCr')}</span><b data-o="cr"></b></div><div class="tot"><span>${t('tCo')}</span><b data-o="co"></b></div>
      <div class="tot"><span>${t('tOg')}</span><b data-o="og"></b></div><div class="tot"><span>${t('tOp')}</span><b data-o="op"></b></div></div>
    </div>
    <div class="card"><h3>${t('fVenta')}</h3><div class="sub"></div>
      <div class="tot"><span>${t('tg')}<div class="hint" style="margin:0">${t('tgN')}</div></span><b data-o="tg"></b></div>
      <div class="tot"><span>${t('efectivo')}<div class="hint" style="margin:0">${t('efN')}</div></span>${minp('efectivo', d.efectivo)}</div>
      <div class="tot big"><span>${t('venta')}<div class="hint" style="margin:0;font-weight:400">${t('veN')}</div></span><b data-o="ve"></b></div>
      <div class="tot"><span>${t('efAnt')}</span>${minp('efAnt', d.efAnt)}</div>
      <div class="tot big"><span>${t('efAcum')}<div class="hint" style="margin:0;font-weight:400">${t('efAcumN')}</div></span><b data-o="efAcum"></b></div>
    </div>
    <div class="card"><h3>${t('fMov')}</h3><div class="sub">${t('fMovS')}</div>${mRows}
      <button class="btn btn-soft" data-add="movs" style="width:100%">${t('addRow')}</button>
      <div class="tot big" style="margin-top:10px"><span>${t('saldoEf')}<div class="hint" style="margin:0;font-weight:400">${t('pasa')}</div></span><b data-o="saldoEf"></b></div>
    </div>
    <div class="card"><h3>${t('fMat')}</h3><div class="sub"></div>
      <div class="tot"><span>${t('matAnt')}</span>${minp('matAnt', d.matAnt)}</div>
      <div class="tot"><span>${t('matDia')}<div class="hint" style="margin:0">${t('auto')}</div></span><input class="money" data-k="matDia" data-m="1" data-null="1" inputmode="numeric" value="${d.matDia === null || d.matDia === undefined ? '' : fin(num(d.matDia)) || '0'}" autocomplete="off"></div>
      <div class="tot big"><span>${t('matAcum')}<div class="hint" style="margin:0;font-weight:400">${t('pasa')}</div></span><b data-o="matAcum"></b></div>
    </div>
    <div class="card"><h3>${t('fCar')}</h3><div class="sub"></div>
      <div class="tot" style="margin-bottom:10px"><span>${t('carAnt')}</span>${minp('carAnt', d.carAnt)}</div>${cRows}
      <button class="btn btn-soft" data-add="cartera" style="width:100%">${t('addRow')}</button>
      <div class="tot big" style="margin-top:10px"><span>${t('carFin')}</span><b data-o="carFin"></b></div>
    </div>
    <div class="card"><h3>${t('fFirmas')}</h3><div class="sub">${t('entregar')}</div>
      <div class="field"><label>${t('reviso')}</label>${inp('reviso', d.reviso)}</div>
      <div class="field"><label>${t('recibe')}</label>${inp('recibe', d.recibe)}</div>
      <div class="field"><label>${t('obs')}</label>${inp('obs', d.obs)}</div>
    </div>
    ${footer()}</main>
    <div class="savebar"><div><small>${t('venta')}</small><b data-o="ve"></b></div><div><small>${t('saldoEf')}</small><b data-o="saldoEf"></b></div><button class="btn btn-mint" id="saveBtn">${t('guardar')}</button></div>`;

  totals();
  $('#backBtn').onclick = () => { if (st.touched && !confirm(t('descartar'))) return; st.view = st.isNew ? 'list' : 'view'; render() };
  $('#carryBtn').onclick = () => { carry(d); st.touched = true; renderForm() };
  $('#saveBtn').onclick = saveDraft;
  $$('[data-add]').forEach(b => b.onclick = () => { d[b.dataset.add].push({}); renderForm(); const f = $$(`[data-k^="${b.dataset.add}."]`).filter(e => /\.(d|cl)$/.test(e.dataset.k)).pop(); if (f) f.focus() });
  $$('[data-rm]').forEach(b => b.onclick = () => { const [k, i] = b.dataset.rm.split('.'); d[k].splice(+i, 1); if (!d[k].length) d[k].push({}); st.touched = true; renderForm() });
  $$('[data-k]').forEach(el => el.addEventListener(el.tagName === 'SELECT' || el.type === 'date' || el.type === 'time' ? 'change' : 'input', () => {
    const path = el.dataset.k.split('.'); let o = d; while (path.length > 1) o = o[path.shift()];
    if (el.dataset.m) {
      const empty = el.value.replace(/\D/g, '') === '';
      const v = num(el.value); o[path[0]] = el.dataset.null && empty ? null : v;
      el.value = empty ? '' : (v ? fin(v) : '0');
    } else o[path[0]] = el.value;
    st.touched = true;
    if (st.isNew && (el.dataset.k === 'neg' || el.dataset.k === 'fecha')) { carry(d, true); for (const k of ['efAnt', 'matAnt', 'carAnt']) { const e = $(`[data-k="${k}"]`); if (e) e.value = fin(d[k]) } }
    totals();
  }));
}
function totals() {
  const d = st.draft, c = calc(d);
  $$('[data-o]').forEach(e => {
    const k = e.dataset.o;
    e.textContent = k.startsWith('mov.') ? money(c.movS[+k.slice(4)]) : k.startsWith('car.') ? money(c.carS[+k.slice(4)]) : money(c[k]);
  });
  const m = $('[data-k="matDia"]'); if (m) m.placeholder = fin(c.matAuto) || '0';
}
async function saveDraft() {
  const d = st.draft;
  if (!d.neg) return toast(t('needNeg'));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha || '')) return toast(t('needFecha'));
  const has = (r, ks) => ks.some(k => r[k] && String(r[k]).trim() !== '' && r[k] !== 0);
  const p = { ...d };
  p.gastos = d.gastos.filter(r => has(r, ['d', 'cr', 'co', 'og', 'op'])).map(r => ({ d: (r.d || '').trim(), cr: num(r.cr), co: num(r.co), og: num(r.og), op: num(r.op) }));
  p.movs = d.movs.filter(r => has(r, ['d', 'en', 'sa'])).map(r => ({ d: (r.d || '').trim(), en: num(r.en), sa: num(r.sa) }));
  p.cartera = d.cartera.filter(r => has(r, ['cl', 'fa', 'ab', 'll'])).map(r => ({ cl: (r.cl || '').trim(), fa: (r.fa || '').trim(), ab: num(r.ab), ll: num(r.ll) }));
  for (const k of ['efectivo', 'efAnt', 'matAnt', 'carAnt']) p[k] = num(p[k]);
  const orig = p._orig; delete p._orig;
  p._dirty = 1; p._stamp = Date.now(); p._prev = (db[p.id] && db[p.id]._prev) || orig || p.fecha;
  db[p.id] = p; saveDb();
  st.id = p.id; st.view = 'view'; st.draft = null; render(); scrollTo(0, 0);
  const r = await pushDirty();
  toast(r.fail ? t('savedOff') : t('saved'));
  if (st.view === 'view') render();
}

/* ---------- Hoja: vista, impresión, WhatsApp y Excel ---------- */
function paperHTML(p) {
  const c = calc(p), m = v => v ? money(v) : '';
  const pad = (a, n) => a.concat(Array(Math.max(0, n - a.length)).fill({}));
  const g = pad(p.gastos || [], 6).map(r => `<tr><td>${esc(r.d)}&nbsp;</td><td class="r">${m(num(r.cr))}</td><td class="r">${m(num(r.co))}</td><td class="r">${m(num(r.og))}</td><td class="r">${m(num(r.op))}</td></tr>`).join('');
  const mv = pad(p.movs || [], 3).map((r, i) => `<tr><td colspan="2">${esc(r.d)}&nbsp;</td><td class="r">${m(num(r.en))}</td><td class="r">${m(num(r.sa))}</td><td class="r">${r.d || r.en || r.sa ? money(c.movS[i]) : ''}</td></tr>`).join('');
  const ca = pad(p.cartera || [], 3).map((r, i) => `<tr><td>${esc(r.cl)}&nbsp;</td><td>${esc(r.fa)}</td><td class="r">${m(num(r.ab))}</td><td class="r">${m(num(r.ll))}</td><td class="r">${r.cl || r.ab || r.ll ? money(c.carS[i]) : ''}</td></tr>`).join('');
  const cols = '<colgroup><col style="width:36%"><col style="width:16%"><col style="width:16%"><col style="width:16%"><col style="width:16%"></colgroup>';
  return `<div class="paper">
    <div class="ttl"><b>${t('waTitulo')}</b><span>Vibras Positivas HM</span></div>
    <table class="hd">${cols}
      <tr><td colspan="2"><span class="k">${t('establecimiento')}</span>${esc(negName(p.neg))}</td><td><span class="k">${t('turno')}</span>${esc(p.turno)}&nbsp;</td><td><span class="k">${t('hIni')}</span>${esc(p.horaIni)}&nbsp;</td><td><span class="k">${t('hFin')}</span>${esc(p.horaFin)}&nbsp;</td></tr>
      <tr><td><span class="k">${t('fecha')}</span>${esc(fd(p.fecha))}</td><td colspan="2"><span class="k">${t('responsable')}</span>${esc(p.responsable)}&nbsp;</td><td colspan="2"><span class="k">${t('auxiliar')}</span>${esc(p.auxiliar)}&nbsp;</td></tr>
    </table>
    <div class="note">${t('respNote')}</div>
    <table>${cols}
      <tr><th rowspan="2">${t('desc')}</th><th colspan="2">${t('comprasPlaza')}</th><th>${t('gastosMuertos')}</th><th style="font-size:8px">${t('opNote')}</th></tr>
      <tr><th>${t('cr')}</th><th>${t('co')}</th><th>${t('og')}</th><th>${t('op')}</th></tr>${g}
      <tr class="big"><td class="lb">${t('totales')}</td><td class="r dk" title="${t('noSumar')}">${money(c.cr)}</td><td class="r">${money(c.co)}</td><td class="r">${money(c.og)}</td><td class="r">${money(c.op)}</td></tr>
    </table>
    <table>${cols}
      <tr><td class="lb" colspan="2">${t('tg')}</td><td class="r">${money(c.tg)}</td><td colspan="2" rowspan="3" class="sign">${t('reviso')}: ${esc(p.reviso)}</td></tr>
      <tr><td class="lb" colspan="2">${t('efectivo')}</td><td class="r">${money(c.ef)}</td></tr>
      <tr class="big"><td class="lb" colspan="2">${t('venta')}</td><td class="r">${money(c.ve)}</td></tr>
      <tr><td class="lb" colspan="2">${t('efAnt')}</td><td class="r">${money(c.efAnt)}</td><td colspan="2" rowspan="2" class="sign">${t('recibe')}: ${esc(p.recibe)}</td></tr>
      <tr class="big"><td class="lb" colspan="2">${t('efAcum')}</td><td class="r">${money(c.efAcum)}</td></tr>
    </table>
    <table>${cols}
      <tr><th colspan="2">${t('descMov')}</th><th>${t('en')}</th><th>${t('sa')}</th><th>${t('saldo')}</th></tr>${mv}
      <tr class="big"><td class="dk" colspan="4" style="text-align:right">${t('pasa')} — ${t('saldoEf')}</td><td class="r">${money(c.saldoEf)}</td></tr>
    </table>
    <table>${cols}
      <tr><td class="lb" colspan="3">${t('matAnt')}</td><td class="r" colspan="2">${money(c.matAnt)}</td></tr>
      <tr><td class="lb" colspan="3">${t('matDia')}</td><td class="r" colspan="2">${money(c.mat)}</td></tr>
      <tr class="big"><td class="lb" colspan="3">${t('pasa')} — ${t('matAcum')}</td><td class="r" colspan="2">${money(c.matAcum)}</td></tr>
    </table>
    <table>${cols}
      <tr><th colspan="2">${t('fCar')}</th><td class="lb" colspan="2">${t('carAnt')}</td><td class="r">${money(c.carAnt)}</td></tr>
      <tr><th>${t('cliente')}</th><th>${t('factura')}</th><th>${t('ab')}</th><th style="font-size:8.5px">${t('ll')}</th><th>${t('carFin')}</th></tr>${ca}
      <tr class="big"><td class="lb" colspan="4">${t('carFin')}</td><td class="r">${money(c.carFin)}</td></tr>
    </table>
    ${p.obs ? `<div style="margin-top:4px"><span class="k">${t('obs')}</span>${esc(p.obs)}</div>` : ''}
  </div>`;
}

function renderView() {
  const p = db[st.id];
  if (!p) { st.view = 'list'; return render() }
  const c = calc(p), pv = prevOf(p.neg, p.fecha, p.id, p.createdAt);
  const warn = pv && calc(pv).saldoEf !== c.efAnt ? `<div class="pend" style="margin:12px 0 0"><span>${t('warnEf').replace('{a}', money(c.efAnt)).replace('{b}', money(calc(pv).saldoEf))}</span></div>` : '';
  $('#app').innerHTML = `<main>
    <div class="row" style="margin-top:12px"><button class="btn btn-soft" id="backBtn" style="flex:0 0 auto">${t('volver')}</button>${p._dirty ? `<span class="tag wt" style="align-self:center">${t('sinSubir')}</span>` : ''}</div>
    <div class="actions"><button class="btn btn-dark" id="edBtn">${t('editar')}</button><button class="btn btn-soft" id="prBtn">${t('imprimir')}</button><button class="btn btn-wa" id="waBtn">${t('whatsapp')}</button><button class="btn btn-mint" id="xlBtn">${t('excel')}</button></div>
    ${warn}
    <div class="paperwrap">${paperHTML(p)}</div>
    ${owner() ? `<button class="danger" id="delBtn">${t('eliminar')}</button>` : ''}
    ${footer()}</main>`;
  fitPaper();
  $('#backBtn').onclick = () => { st.view = 'list'; render() };
  $('#edBtn').onclick = () => openForm(p.id);
  $('#prBtn').onclick = () => printHTML(paperHTML(p));
  $('#waBtn').onclick = () => sendWa(waText(p));
  $('#xlBtn').onclick = () => excelPlanilla(p);
  if ($('#delBtn')) $('#delBtn').onclick = async () => {
    if (!confirm(t('delQ'))) return;
    try {
      if (!(p._dirty && !p.updatedAt)) { const r = await post({ n: p.neg, del: p.id, fecha: p._prev || p.fecha }); if (!r.ok) throw 0 }
      delete db[p.id]; saveDb(); st.view = 'list'; render(); toast(t('delOk'));
    } catch (e) { toast(t('delErr')) }
  };
}
// En el celular la hoja se encoge para que quepa completa en la pantalla
function fitPaper() { const w = $('.paperwrap'), p = w && w.querySelector('.paper'); if (p) p.style.zoom = Math.min(1, (w.clientWidth - 2) / 560) }
window.addEventListener('resize', fitPaper);
function printHTML(html) { $('#print').innerHTML = html; setTimeout(() => window.print(), 60) }
function sendWa(txt) { window.open(`https://wa.me/${(cfg.wa || '').replace(/\D/g, '')}?text=${encodeURIComponent(txt)}`, '_blank') }
function waText(p) {
  const c = calc(p), L = [];
  L.push(`*${t('waTitulo')}* — ${negName(p.neg)}`);
  L.push(`${fd(p.fecha)}${p.turno ? ` · ${t('turno')} ${p.turno}` : ''}${p.horaIni || p.horaFin ? ` (${p.horaIni || ''}–${p.horaFin || ''})` : ''}`);
  if (p.responsable) L.push(`${t('responsable')}: ${p.responsable}`);
  L.push('');
  for (const r of p.gastos || []) { const v = [['cr', r.cr], ['co', r.co], ['og', r.og], ['op', r.op]].filter(x => x[1]).map(x => `${t(x[0])} ${money(x[1])}`).join(', '); L.push(`- ${r.d || '—'}: ${v}`) }
  if ((p.gastos || []).length) L.push('');
  L.push(`${t('tCr')}: ${money(c.cr)}`, `${t('tCo')}: ${money(c.co)}`, `${t('tOg')}: ${money(c.og)}`, `${t('tOp')}: ${money(c.op)}`);
  L.push(`*${t('tg')}: ${money(c.tg)}*`, `${t('efectivo')}: ${money(c.ef)}`, `*${t('venta').toUpperCase()}: ${money(c.ve)}*`, '');
  L.push(`${t('efAnt')}: ${money(c.efAnt)}`, `${t('efAcum')}: ${money(c.efAcum)}`);
  for (const r of p.movs || []) L.push(`- ${r.d || '—'}: ${r.en ? `${t('en')} ${money(r.en)}` : ''}${r.en && r.sa ? ', ' : ''}${r.sa ? `${t('sa')} ${money(r.sa)}` : ''}`);
  L.push(`*${t('saldoEf')}: ${money(c.saldoEf)}*`, '');
  L.push(`${t('matDia')}: ${money(c.mat)}`, `${t('matAcum')}: ${money(c.matAcum)}`, '');
  for (const r of p.cartera || []) L.push(`- ${r.cl || '—'}${r.fa ? ` (${r.fa})` : ''}: ${r.ab ? `${t('ab')} ${money(r.ab)}` : ''}${r.ab && r.ll ? ', ' : ''}${r.ll ? `${t('llS')} ${money(r.ll)}` : ''}`);
  L.push(`*${t('carFin')}: ${money(c.carFin)}*`);
  if (p.obs) L.push('', `${t('obs')}: ${p.obs}`);
  return L.join('\n');
}
function sheetFrom(rows, widths) { const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = widths.map(w => ({ wch: w })); return ws }
function excelPlanilla(p) {
  if (!window.XLSX) return toast(t('libs'));
  const c = calc(p), R = [];
  R.push([t('waTitulo')], [t('establecimiento'), negName(p.neg), '', t('fecha'), p.fecha], [t('turno'), p.turno, '', t('hIni'), p.horaIni], [t('responsable'), p.responsable, '', t('hFin'), p.horaFin], [t('auxiliar'), p.auxiliar], []);
  R.push([t('desc'), t('cr'), t('co'), t('og'), t('op')]);
  for (const r of p.gastos || []) R.push([r.d, r.cr || 0, r.co || 0, r.og || 0, r.op || 0]);
  R.push([t('totales'), c.cr, c.co, c.og, c.op], []);
  R.push([t('tg'), c.tg], [t('efectivo'), c.ef], [t('venta'), c.ve], [t('efAnt'), c.efAnt], [t('efAcum'), c.efAcum], []);
  R.push([t('descMov'), t('en'), t('sa'), t('saldo')]);
  (p.movs || []).forEach((r, i) => R.push([r.d, r.en || 0, r.sa || 0, c.movS[i]]));
  R.push([t('saldoEf'), '', '', c.saldoEf], []);
  R.push([t('matAnt'), c.matAnt], [t('matDia'), c.mat], [t('matAcum'), c.matAcum], []);
  R.push([t('carAnt'), '', '', '', c.carAnt], [t('cliente'), t('factura'), t('ab'), t('ll'), t('carFin')]);
  (p.cartera || []).forEach((r, i) => R.push([r.cl, r.fa, r.ab || 0, r.ll || 0, c.carS[i]]));
  R.push([t('carFin'), '', '', '', c.carFin], [], [t('reviso'), p.reviso], [t('recibe'), p.recibe], [t('obs'), p.obs]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheetFrom(R, [38, 18, 16, 20, 18]), 'Cierre');
  XLSX.writeFile(wb, `cierre-${norm(negName(p.neg)).replace(/\s+/g, '-') || 'negocio'}-${p.fecha}.xlsx`);
}

/* ---------- Informes ---------- */
const METRICS = ['ve', 'ef', 'tg', 'co', 'cr', 'og', 'op', 'en', 'sa', 'mat', 'ab', 'll'];
const mLabel = k => ({ ve: t('venta'), ef: t('efectivo'), tg: t('tg'), co: t('tCo'), cr: t('tCr'), og: t('tOg'), op: t('tOp'), en: t('en'), sa: t('sa'), mat: t('mat'), ab: t('abT'), ll: t('ll') }[k]);
function period() {
  const r = st.rep; if (!r.anchor) r.anchor = hoy();
  const a = r.anchor, y = a.slice(0, 4);
  if (r.type === 'w') {
    const from = weekStart(a), to = addD(from, 6);
    return { from, to, label: `${fd(from, { weekday: undefined, year: undefined })} – ${fd(to, { weekday: undefined })}`,
      buckets: Array.from({ length: 7 }, (_, i) => { const k = addD(from, i); return { k, lb: D(k).toLocaleDateString(loc(), { timeZone: 'UTC', weekday: 'short' }).replace('.', ''), full: fd(k) } }) };
  }
  if (r.type === 'm') {
    const ym = a.slice(0, 7), n = new Date(Date.UTC(+y, +ym.slice(5), 0)).getUTCDate();
    return { from: ym + '-01', to: `${ym}-${String(n).padStart(2, '0')}`, label: D(ym + '-01').toLocaleDateString(loc(), { timeZone: 'UTC', month: 'long', year: 'numeric' }),
      buckets: Array.from({ length: n }, (_, i) => { const k = `${ym}-${String(i + 1).padStart(2, '0')}`; return { k, lb: (i === 0 || (i + 1) % 5 === 0) ? String(i + 1) : '', full: fd(k) } }) };
  }
  return { from: y + '-01-01', to: y + '-12-31', label: y,
    buckets: Array.from({ length: 12 }, (_, i) => { const k = `${y}-${String(i + 1).padStart(2, '0')}`; const d = D(k + '-01'); return { k, lb: d.toLocaleDateString(loc(), { timeZone: 'UTC', month: 'short' }).replace('.', ''), full: d.toLocaleDateString(loc(), { timeZone: 'UTC', month: 'long', year: 'numeric' }) } }) };
}
function shift(n) {
  const r = st.rep, a = r.anchor || hoy();
  r.anchor = r.type === 'w' ? addD(a, 7 * n) : r.type === 'm' ? addM(a.slice(0, 7), n) + '-01' : `${+a.slice(0, 4) + n}-01-01`;
  r.concept = null;
}
// Arma todo el informe del período y del negocio escogidos
function report() {
  const pe = period(), r = st.rep, bk = f => r.type === 'y' ? f.slice(0, 7) : f;
  const list = planillas().filter(p => p.fecha >= pe.from && p.fecha <= pe.to).reverse();
  const tot = Object.fromEntries(METRICS.map(k => [k, 0]));
  const per = Object.fromEntries(pe.buckets.map(b => [b.k, { n: 0, ...Object.fromEntries(METRICS.map(k => [k, 0])) }]));
  const conc = { g: {}, c: {}, k: {} }, series = {};
  const put = (sec, label, vals, fecha) => {
    const key = norm(label) || '—';
    const o = conc[sec][key] || (conc[sec][key] = { key, label: (label || '').trim() || '—', n: 0, cr: 0, co: 0, og: 0, op: 0, en: 0, sa: 0, ab: 0, ll: 0, total: 0 });
    let sum = 0; for (const [k, v] of Object.entries(vals)) { o[k] += v; sum += v }
    o.n++; o.total += sum;
    const sk = sec + '|' + key; (series[sk] || (series[sk] = {}))[bk(fecha)] = ((series[sk] || {})[bk(fecha)] || 0) + sum;
  };
  const ult = {};
  for (const p of list) {
    const c = calc(p), b = per[bk(p.fecha)]; if (!b) continue;
    b.n++; for (const k of METRICS) { tot[k] += c[k]; b[k] += c[k] }
    for (const g of p.gastos || []) put('g', g.d, { cr: num(g.cr), co: num(g.co), og: num(g.og), op: num(g.op) }, p.fecha);
    for (const m of p.movs || []) put('c', m.d, { en: num(m.en), sa: num(m.sa) }, p.fecha);
    for (const k of p.cartera || []) put('k', k.cl, { ab: num(k.ab), ll: num(k.ll) }, p.fecha);
    ult[p.neg] = c; // la última planilla de cada negocio en el período deja los saldos
  }
  const saldos = { ef: 0, mat: 0, car: 0 }; for (const c of Object.values(ult)) { saldos.ef += c.saldoEf; saldos.mat += c.matAcum; saldos.car += c.carFin }
  return { pe, list, tot, per, conc, series, saldos };
}
const secCols = s => s === 'g' ? ['cr', 'co', 'og', 'op'] : s === 'c' ? ['en', 'sa'] : ['ab', 'll'];
const secLabel = s => t(s === 'g' ? 'secG' : s === 'c' ? 'secC' : 'secK');
const colLabel = k => k === 'll' ? t('llS') : t(k);
const negLabel = () => owner() ? (st.neg === 'all' ? t('title') : negName(st.neg)) : (negs[0] || {}).name || '';

function reportHTML() {
  const r = st.rep, R = report(), pe = R.pe;
  ensure(pe.from.slice(0, 7), pe.to.slice(0, 7));
  const wait = ensure.busy ? `<div class="hint" style="text-align:center;margin-top:8px">${t('cargando')}</div>` : '';
  const cs = r.concept && R.conc[r.concept.sec][r.concept.key] ? r.concept : (r.concept = null);
  const serie = cs ? (R.series[cs.sec + '|' + cs.key] || {}) : null;
  const val = b => cs ? (serie[b.k] || 0) : R.per[b.k][r.metric];
  const max = Math.max(1, ...pe.buckets.map(val));
  const title = cs ? `${R.conc[cs.sec][cs.key].label} · ${secLabel(cs.sec)}` : mLabel(r.metric);
  const chart = `<div class="chart">${pe.buckets.map((b, i) => `<button class="bar" data-bar="${esc(b.full)}|${val(b)}"><i class="${val(b) ? '' : 'z'}" style="height:${Math.max(1.5, val(b) / max * 100)}%;animation-delay:${i * 18}ms"></i><small>${esc(b.lb) || '&nbsp;'}</small></button>`).join('')}</div>`;
  const rows = pe.buckets.filter(b => val(b) || (!cs && R.per[b.k].n)).map(b => `<tr><td>${esc(b.full)}</td><td>${cs ? '' : R.per[b.k].n}</td><td>${money(val(b))}</td></tr>`).join('');
  const totalSel = cs ? R.conc[cs.sec][cs.key].total : R.tot[r.metric];
  const cols = secCols(r.sec), q = norm(r.q);
  const concs = Object.values(R.conc[r.sec]).filter(o => !q || o.key.includes(q)).sort((a, b) => b.total - a.total);
  const ctot = cols.map(k => concs.reduce((s, o) => s + o[k], 0));
  const ctable = concs.length ? `<div class="tblwrap"><table class="tbl"><thead><tr><th>${t(r.sec === 'k' ? 'cliente' : 'concepto')}</th>${cols.map(k => `<th>${colLabel(k)}</th>`).join('')}<th>${t('veces')}</th></tr></thead><tbody>
    ${concs.map(o => `<tr data-conc="${esc(o.key)}" style="cursor:pointer;${cs && cs.sec === r.sec && cs.key === o.key ? 'background:#eef1f9' : ''}"><td>${esc(o.label)}</td>${cols.map(k => `<td>${o[k] ? money(o[k]) : ''}</td>`).join('')}<td>${o.n}</td></tr>`).join('')}
    </tbody><tfoot><tr><td>${t('total')}</td>${ctot.map(v => `<td>${money(v)}</td>`).join('')}<td></td></tr></tfoot></table></div>` : `<div class="empty">${t('noConc')}</div>`;

  return `<main>
    <div class="seg">${[['w', 'semana'], ['m', 'mes'], ['y', 'anio']].map(([k, l]) => `<button class="${r.type === k ? 'on' : ''}" data-type="${k}">${t(l)}</button>`).join('')}</div>
    <div class="nav"><button data-shift="-1">&lsaquo;</button><b>${esc(pe.label)}</b><button data-shift="1">&rsaquo;</button></div>${wait}
    <div class="actions"><button class="btn btn-mint" id="rxl">${t('excel')}</button><button class="btn btn-soft" id="rpr">${t('imprimir')}</button><button class="btn btn-wa" id="rwa">${t('whatsapp')}</button><button class="btn btn-dark" id="rhoy">${t(r.type === 'w' ? 'semana' : r.type === 'm' ? 'mes' : 'anio')} ${lang === 'es' ? 'actual' : 'now'}</button></div>
    ${!R.list.length ? `<div class="empty">${t('sinDatos')}</div>` : `
    <div class="kpis">${METRICS.map((k, i) => `<button class="kpi ${!cs && r.metric === k ? 'on' : ''}" data-metric="${k}" style="animation-delay:${i * 25}ms"><span>${mLabel(k)}</span><b>${money(R.tot[k])}</b></button>`).join('')}</div>
    <div class="card"><h3>${esc(title)}</h3><div class="sub">${t(r.type === 'y' ? 'porMes' : 'porPeriodo')} · ${R.list.length} ${t('cierres')}${cs ? ` · <a href="#" id="clrConc" style="color:var(--coral);font-weight:600">${t('quitarF')}</a>` : ''}</div>
      <div class="field" style="margin:0"><select id="metricSel">${METRICS.map(k => `<option value="${k}" ${!cs && r.metric === k ? 'selected' : ''}>${t('rubro')}: ${mLabel(k)}</option>`).join('')}${cs ? `<option selected>${t('rubro')}: ${esc(title)}</option>` : ''}</select></div>
      ${chart}
      <div class="tblwrap"><table class="tbl"><thead><tr><th>${t('periodo')}</th><th>${cs ? '' : t('planillas')}</th><th>${t('valor')}</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td>${t('total')}</td><td>${cs ? '' : R.list.length}</td><td>${money(totalSel)}</td></tr></tfoot></table></div>
    </div>
    <div class="card"><h3>${t('saldosFin')}</h3><div class="sub"></div>
      <div class="tot"><span>${t('saldoEf')}</span><b>${money(R.saldos.ef)}</b></div><div class="tot"><span>${t('matAcum')}</span><b>${money(R.saldos.mat)}</b></div><div class="tot"><span>${t('carFin')}</span><b>${money(R.saldos.car)}</b></div>
    </div>
    <div class="card"><h3>${t('porConcepto')}</h3><div class="sub">${t('verConcepto')}</div>
      <div class="seg" style="margin-top:0">${['g', 'c', 'k'].map(s => `<button class="${r.sec === s ? 'on' : ''}" data-sec="${s}">${secLabel(s)}</button>`).join('')}</div>
      <input class="search" id="concQ" placeholder="${t('buscar')}" value="${esc(r.q)}">
      <div id="concT">${ctable}</div>
    </div>`}
    ${footer()}</main>`;
}
function bindReport() {
  const r = st.rep;
  $$('[data-type]').forEach(b => b.onclick = () => { r.type = b.dataset.type; r.concept = null; render() });
  $$('[data-shift]').forEach(b => b.onclick = () => { shift(+b.dataset.shift); render() });
  $('#rhoy').onclick = () => { r.anchor = hoy(); r.concept = null; render() };
  $('#rxl').onclick = excelReport;
  $('#rpr').onclick = () => printHTML(reportPrint());
  $('#rwa').onclick = () => sendWa(reportWa());
  $$('[data-metric]').forEach(b => b.onclick = () => { r.metric = b.dataset.metric; r.concept = null; render() });
  if ($('#metricSel')) $('#metricSel').onchange = e => { if (METRICS.includes(e.target.value)) { r.metric = e.target.value; r.concept = null; render() } };
  $$('[data-sec]').forEach(b => b.onclick = () => { r.sec = b.dataset.sec; render() });
  $$('[data-bar]').forEach(b => b.onclick = () => { const [l, v] = b.dataset.bar.split('|'); toast(`${l}: ${money(+v)}`) });
  const bindConc = () => $$('[data-conc]').forEach(tr => tr.onclick = () => { r.concept = { sec: r.sec, key: tr.dataset.conc }; render(); const c = $('.chart'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' }) });
  bindConc();
  if ($('#clrConc')) $('#clrConc').onclick = e => { e.preventDefault(); r.concept = null; render() };
  if ($('#concQ')) $('#concQ').oninput = e => { // se filtra sin perder el teclado
    r.q = e.target.value; const tmp = document.createElement('div'); tmp.innerHTML = reportHTML();
    $('#concT').innerHTML = tmp.querySelector('#concT').innerHTML; bindConc();
  };
}
function reportWa() {
  const R = report(), L = [`*${t('waInf')}* — ${negLabel()}`, `${t(st.rep.type === 'w' ? 'semana' : st.rep.type === 'm' ? 'mes' : 'anio')}: ${R.pe.label} · ${R.list.length} ${t('cierres')}`, ''];
  for (const k of METRICS) L.push(`${k === 've' ? '*' : ''}${mLabel(k)}: ${money(R.tot[k])}${k === 've' ? '*' : ''}`);
  L.push('', `${t('saldoEf')}: ${money(R.saldos.ef)}`, `${t('matAcum')}: ${money(R.saldos.mat)}`, `${t('carFin')}: ${money(R.saldos.car)}`);
  const top = Object.values(R.conc.g).sort((a, b) => b.total - a.total).slice(0, 8);
  if (top.length) { L.push('', `*${t('porConcepto')}*`); for (const o of top) L.push(`- ${o.label}: ${money(o.total)}`) }
  return L.join('\n');
}
function reportPrint() {
  const R = report(), r = st.rep, used = R.pe.buckets.filter(b => R.per[b.k].n), mk = ['ve', 'ef', 'tg', 'co', 'cr', 'og', 'op'];
  const sec = s => { const cols = secCols(s), a = Object.values(R.conc[s]).sort((x, y) => y.total - x.total); if (!a.length) return '';
    return `<div class="psec">${secLabel(s)}</div><table class="tbl"><thead><tr><th>${t(s === 'k' ? 'cliente' : 'concepto')}</th>${cols.map(k => `<th>${colLabel(k)}</th>`).join('')}<th>${t('veces')}</th></tr></thead><tbody>${a.map(o => `<tr><td>${esc(o.label)}</td>${cols.map(k => `<td>${o[k] ? money(o[k]) : ''}</td>`).join('')}<td>${o.n}</td></tr>`).join('')}</tbody></table>` };
  return `<div class="ph"><h2>${t('waInf')} — ${esc(negLabel())}</h2><p>${t(r.type === 'w' ? 'semana' : r.type === 'm' ? 'mes' : 'anio')}: ${esc(R.pe.label)} · ${R.list.length} ${t('cierres')} · ${fdt(Date.now())}</p></div>
    <div class="psec">${t('resumen')}</div><table class="tbl"><tbody>${METRICS.map(k => `<tr><td>${mLabel(k)}</td><td>${money(R.tot[k])}</td></tr>`).join('')}
    <tr><td>${t('saldoEf')}</td><td>${money(R.saldos.ef)}</td></tr><tr><td>${t('matAcum')}</td><td>${money(R.saldos.mat)}</td></tr><tr><td>${t('carFin')}</td><td>${money(R.saldos.car)}</td></tr></tbody></table>
    <div class="psec">${t(r.type === 'y' ? 'porMes' : 'porPeriodo')}</div><table class="tbl"><thead><tr><th>${t('periodo')}</th>${mk.map(k => `<th>${k === 'tg' ? t('tg') : k === 've' ? t('venta') : k === 'ef' ? t('efectivo') : t(k)}</th>`).join('')}</tr></thead><tbody>
    ${used.map(b => `<tr><td>${esc(b.full)}</td>${mk.map(k => `<td>${money(R.per[b.k][k])}</td>`).join('')}</tr>`).join('')}</tbody><tfoot><tr><td>${t('total')}</td>${mk.map(k => `<td>${money(R.tot[k])}</td>`).join('')}</tr></tfoot></table>
    ${sec('g')}${sec('c')}${sec('k')}`;
}
function excelReport() {
  if (!window.XLSX) return toast(t('libs'));
  const R = report(), wb = XLSX.utils.book_new(), tipo = t(st.rep.type === 'w' ? 'semana' : st.rep.type === 'm' ? 'mes' : 'anio');
  const res = [[t('waInf'), negLabel()], [tipo, R.pe.label], [t('fecha'), `${R.pe.from} / ${R.pe.to}`], [t('planillas'), R.list.length], [], [t('rubro'), t('total')]];
  for (const k of METRICS) res.push([mLabel(k), R.tot[k]]);
  res.push([], [t('saldosFin')], [t('saldoEf'), R.saldos.ef], [t('matAcum'), R.saldos.mat], [t('carFin'), R.saldos.car]);
  XLSX.utils.book_append_sheet(wb, sheetFrom(res, [40, 24]), t('resumen'));
  const per = [[t('periodo'), t('planillas'), ...METRICS.map(mLabel)]];
  for (const b of R.pe.buckets) per.push([st.rep.type === 'y' ? b.full : b.k, R.per[b.k].n, ...METRICS.map(k => R.per[b.k][k])]);
  per.push([t('total'), R.list.length, ...METRICS.map(k => R.tot[k])]);
  XLSX.utils.book_append_sheet(wb, sheetFrom(per, [22, 10, ...METRICS.map(() => 18)]), tipo);
  for (const s of ['g', 'c', 'k']) {
    const cols = secCols(s), rows = [[t(s === 'k' ? 'cliente' : 'concepto'), ...cols.map(colLabel), t('total'), t('veces')]];
    for (const o of Object.values(R.conc[s]).sort((a, b) => b.total - a.total)) rows.push([o.label, ...cols.map(k => o[k]), o.total, o.n]);
    XLSX.utils.book_append_sheet(wb, sheetFrom(rows, [36, ...cols.map(() => 18), 18, 8]), secLabel(s).slice(0, 31));
  }
  const pl = [[t('fecha'), t('establecimiento'), t('turno'), t('hIni'), t('hFin'), t('responsable'), ...METRICS.map(mLabel), t('efAnt'), t('efAcum'), t('saldoEf'), t('matAcum'), t('carFin')]];
  const det = [[t('fecha'), t('establecimiento'), t('seccion'), t('concepto'), t('factura'), t('cr'), t('co'), t('og'), t('op'), t('en'), t('sa'), t('ab'), t('llS')]];
  for (const p of R.list) {
    const c = calc(p), n = negName(p.neg);
    pl.push([p.fecha, n, p.turno, p.horaIni, p.horaFin, p.responsable, ...METRICS.map(k => c[k]), c.efAnt, c.efAcum, c.saldoEf, c.matAcum, c.carFin]);
    for (const g of p.gastos || []) det.push([p.fecha, n, t('secG'), g.d, '', g.cr || 0, g.co || 0, g.og || 0, g.op || 0, 0, 0, 0, 0]);
    for (const m of p.movs || []) det.push([p.fecha, n, t('secC'), m.d, '', 0, 0, 0, 0, m.en || 0, m.sa || 0, 0, 0]);
    for (const k of p.cartera || []) det.push([p.fecha, n, t('secK'), k.cl, k.fa, 0, 0, 0, 0, 0, 0, k.ab || 0, k.ll || 0]);
  }
  XLSX.utils.book_append_sheet(wb, sheetFrom(pl, [12, 20, 10, 10, 10, 20, ...Array(17).fill(17)]), t('planillas'));
  XLSX.utils.book_append_sheet(wb, sheetFrom(det, [12, 20, 20, 32, 12, ...Array(8).fill(15)]), t('detalle'));
  XLSX.writeFile(wb, `informe-cierres-${R.pe.from}-a-${R.pe.to}.xlsx`);
}

/* ---------- Ajustes ---------- */
const closeSheet = () => $('#ov').classList.remove('show');
function openSettings() {
  const link = n => `${SITE}cierre/?n=${n.tok}`;
  const adminBox = owner()
    ? `<div class="box"><h4>${t('ownerOn')}</h4>
        <p class="hint" style="margin-bottom:10px">${t('linksP')}</p>
        ${negs.map((n, i) => `<div class="tot"><span style="font-weight:600">${esc(n.name)}</span><span style="display:flex;gap:6px"><button class="btn-sm" data-cp="${i}">${t('copy')}</button><button class="btn-sm" data-sh="${i}" style="background:#1fb35a;color:#fff;border-color:#1fb35a">${t('enviar')}</button></span></div>`).join('')}
        <div class="field" style="margin-top:12px"><label>${t('addNeg')}</label><div class="row"><input id="negNew" placeholder="${t('negName')}" style="flex:1"><button class="btn btn-dark" id="negAdd" style="flex:0 0 auto">${t('addNeg')}</button></div></div>
        <button class="danger" id="so">${t('exitOwner')}</button></div>`
    : `<div class="box"><h4>${t('adminT')}</h4><p class="hint" style="margin-bottom:10px">${t('adminP')}</p>
        <div class="row"><input id="pinIn" type="password" inputmode="numeric" placeholder="${t('pin')}" style="flex:1;padding:12px 14px;border:1px solid var(--line);border-radius:12px;font-size:16px;min-width:0"><button class="btn btn-dark" id="pinGo" style="flex:0 0 auto">${t('enter')}</button></div></div>`;
  $('#sheet').innerHTML = `<h3>${t('settings')}</h3><div class="sub"></div>
    <div class="field"><label>${t('waTo')}</label><input id="waIn" inputmode="numeric" value="${esc(cfg.wa)}"><div class="hint">${t('waHint')}</div></div>
    <div class="row"><button class="btn btn-dark" id="cfgSave">${t('guardar')}</button><button class="btn btn-soft" id="cfgClose">${t('cerrar')}</button></div>
    ${adminBox}
    <a class="btn btn-soft" style="display:block;text-align:center;text-decoration:none;margin-top:16px" href="../${!owner() && lock ? '?n=' + encodeURIComponent(lock) : ''}">${t('irPrecios')}</a>`;
  $('#ov').classList.add('show');
  $('#cfgClose').onclick = closeSheet;
  $('#cfgSave').onclick = () => { cfg.wa = $('#waIn').value.replace(/\D/g, ''); LS.set('cd_cfg', cfg); closeSheet(); toast(t('saved')) };
  $$('[data-cp]').forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(link(negs[+b.dataset.cp])); toast(t('copied')) } catch (e) { prompt('', link(negs[+b.dataset.cp])) } });
  $$('[data-sh]').forEach(b => b.onclick = () => { const n = negs[+b.dataset.sh]; window.open(`https://wa.me/?text=${encodeURIComponent(t('shareBiz').replace('{b}', n.name) + link(n))}`, '_blank') });
  if ($('#negAdd')) $('#negAdd').onclick = async () => {
    const name = $('#negNew').value.trim(); if (!name) return;
    try { const r = await post({ addNegocio: name }); if (!r.ok) throw 0; negs = (await r.json()).negocios; LS.set('cd_negs', negs); openSettings(); render() } catch (e) { toast(t('errSubir')) }
  };
  if ($('#so')) $('#so').onclick = () => { pin = ''; LS.del('pl_pin'); db = Object.fromEntries(Object.entries(db).filter(([, p]) => p._dirty)); saveDb(); negs = []; LS.del('cd_negs'); st.neg = 'all'; closeSheet(); remoteMsg = ''; render(); refresh(true) };
  if ($('#pinGo')) $('#pinGo').onclick = async () => {
    const p = $('#pinIn').value.trim(); if (!p) return;
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', 'x-pin': p }, body: JSON.stringify({ check: true }) });
      if (r.status === 403) { remoteMsg = 'expired'; closeSheet(); return render() }
      if (!r.ok) return toast(t('badPin'));
      pin = p; LS.set('pl_pin', pin); remoteMsg = ''; closeSheet(); render(); refresh(false);
    } catch (e) { toast(t('offline')) }
  };
}

/* ---------- Arranque ---------- */
$('#setBtn').onclick = openSettings;
$('#ov').onclick = e => { if (e.target.id === 'ov') closeSheet() };
$('#langBtn').onclick = () => { lang = lang === 'es' ? 'en' : 'es'; LS.set('pl_lang', lang); if (st.view === 'form') renderForm(), header(); else render() };
window.addEventListener('online', () => refresh(true));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && st.view === 'list') refresh(true) });
window.addEventListener('afterprint', () => { $('#print').innerHTML = '' });

render();
refresh(true);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
