// Precios al Día — guarda y entrega la lista de precios de Andrés
// Cada negocio recibe un enlace propio (?n=código) y solo ve su lista.
// El costo y la rentabilidad solo los ve el administrador: a los negocios se les quita antes de entregar la lista.
// Cada negocio puede agregar productos propios con su enlace; se guardan aparte de la lista de Andrés.
import { getStore } from "@netlify/blobs";
import { createHmac } from "node:crypto";

// Permite que la app también funcione desde GitHub Pages
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, x-pin",
  "access-control-max-age": "86400"
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "content-type": "application/json", "cache-control": "no-store" } });

// Vencimiento del servicio (hora de Colombia). Para ampliar: cambiar VENCE en Netlify (AAAA-MM-DD).
const VENCE = () => process.env.VENCE || "2027-05-08";
const expired = () => Date.now() > new Date(VENCE() + "T23:59:59-05:00").getTime();

const secret = () => process.env.LINK_SECRET || process.env.OWNER_PIN || "";
const token = name => createHmac("sha256", secret()).update(String(name)).digest("base64url").slice(0, 12);
const linksFor = data => Object.fromEntries((data?.order || []).map(n => [n, token(n)]));
const isOwner = req => !!process.env.OWNER_PIN && (req.headers.get("x-pin") || "") === process.env.OWNER_PIN;

const sinCosto = list => (list || []).map(({ costo, rent, ...x }) => x);
const txt = (v, n) => String(v ?? "").trim().slice(0, n);
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const limpiar = arr => (Array.isArray(arr) ? arr : []).slice(0, 300).map(i => ({
  id: txt(i?.id, 24), n: txt(i?.n, 120), c: txt(i?.c, 30), u: txt(i?.u, 30), cat: txt(i?.cat, 40), p: num(i?.p),
  ...(num(i?.costo) > 0 ? { costo: num(i.costo), rent: num(i.rent) } : {})
})).filter(i => i.id && i.n);
const ownKey = name => "propios-" + token(name);

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (expired()) return json({ expired: true, vence: VENCE() }, req.method === "GET" ? 200 : 403);
  const store = getStore("precios");

  if (req.method === "GET") {
    const data = await store.get("lista", { type: "json" });
    if (isOwner(req)) {
      if (!data) return json({ vence: VENCE() });
      const own = {};
      await Promise.all(data.order.map(async s => { own[s] = (await store.get(ownKey(s), { type: "json" })) || []; }));
      return json({ ...data, own, links: linksFor(data), vence: VENCE() });
    }

    const n = new URL(req.url).searchParams.get("n");
    if (!n) return json({ needLink: true });
    if (!data) return json(null);
    const name = data.order.find(s => token(s) === n);
    if (!name) return json({ badLink: true });
    const own = (await store.get(ownKey(name), { type: "json" })) || [];
    return json({ sheets: { [name]: sinCosto(data.sheets[name]) }, order: [name], updatedAt: data.updatedAt, own });
  }

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "Datos inválidos" }, 400); }

    // Un negocio guarda sus productos propios con su enlace (no toca la lista de Andrés)
    const n = new URL(req.url).searchParams.get("n");
    if (n && body && Array.isArray(body.own)) {
      const data = await store.get("lista", { type: "json" });
      const name = data?.order?.find(s => token(s) === n);
      if (!name) return json({ badLink: true }, 404);
      await store.setJSON(ownKey(name), limpiar(body.own));
      return json({ ok: true });
    }

    if (!isOwner(req)) return json({ error: "Clave incorrecta" }, 401);
    if (body && body.check) return json({ ok: true, vence: VENCE() });
    if (!body || typeof body.sheets !== "object" || !Array.isArray(body.order) || !body.order.length)
      return json({ error: "Datos inválidos" }, 400);

    const data = { sheets: body.sheets, order: body.order, file: String(body.file || ""), updatedAt: Date.now() };
    await store.setJSON("lista", data);
    return json({ ok: true, updatedAt: data.updatedAt, links: linksFor(data), vence: VENCE() });
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config = { path: "/api/precios" };
