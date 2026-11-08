// Precios al Día — guarda y entrega la lista de precios de Andrés
import { getStore } from "@netlify/blobs";

// Permite que la app también funcione desde GitHub Pages
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, x-pin",
  "access-control-max-age": "86400"
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "content-type": "application/json", "cache-control": "no-store" } });

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const store = getStore("precios");

  if (req.method === "GET") {
    const data = await store.get("lista", { type: "json" });
    return json(data || null);
  }

  if (req.method === "POST") {
    const pin = req.headers.get("x-pin") || "";
    if (!process.env.OWNER_PIN || pin !== process.env.OWNER_PIN) return json({ error: "Clave incorrecta" }, 401);

    let body;
    try { body = await req.json(); } catch { return json({ error: "Datos inválidos" }, 400); }
    if (body && body.check) return json({ ok: true });
    if (!body || typeof body.sheets !== "object" || !Array.isArray(body.order) || !body.order.length)
      return json({ error: "Datos inválidos" }, 400);

    const updatedAt = Date.now();
    await store.setJSON("lista", { sheets: body.sheets, order: body.order, file: String(body.file || ""), updatedAt });
    return json({ ok: true, updatedAt });
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config = { path: "/api/precios" };
