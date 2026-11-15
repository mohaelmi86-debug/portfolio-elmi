import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const allowedOrigin = Deno.env.get("PORTFOLIO_ALLOWED_ORIGIN") ?? "https://elmihdhoirmohamedali.netlify.app";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (origin && origin !== allowedOrigin) return json({ error: "Origine non autorisée." }, 403);
  if (req.method === "OPTIONS") {
    if (origin && origin !== allowedOrigin) return new Response(null, { status: 403 });
    return new Response("ok", { headers: corsHeaders });
  }
  if (!["GET", "PATCH"].includes(req.method)) return json({ error: "Méthode non autorisée." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const admins = (Deno.env.get("PORTFOLIO_ADMIN_EMAILS") ?? "")
    .split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (!url || !anon || !service || admins.length === 0) {
    return json({ error: "Configuration administrateur incomplète." }, 503);
  }

  const bearer = req.headers.get("Authorization");
  if (!bearer?.startsWith("Bearer ")) return json({ error: "Authentification requise." }, 401);
  const authClient = createClient(url, anon, { global: { headers: { Authorization: bearer } } });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user?.email || !admins.includes(user.email.toLowerCase())) {
    return json({ error: "Accès administrateur refusé." }, 403);
  }

  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  if (req.method === "GET") {
    const page = Math.max(0, Number(urlSafe(req.url, "page") ?? 0) || 0);
    const size = Math.min(100, Math.max(1, Number(urlSafe(req.url, "size") ?? 25) || 25));
    const status = urlSafe(req.url, "status");
    let query = db.from("contact_leads").select("id,created_at,name,email,organization,request_type,service_slug,project_slug,budget_range,timeline,message,status,source", { count: "exact" })
      .order("created_at", { ascending: false }).range(page * size, page * size + size - 1);
    if (status && ["new", "in_progress", "qualified", "closed", "spam"].includes(status)) query = query.eq("status", status);
    const { data, error, count } = await query;
    if (error) return json({ error: "Lecture des demandes impossible." }, 500);
    const { count: newCount, error: newCountError } = await db.from("contact_leads")
      .select("id", { count: "exact", head: true }).eq("status", "new");
    if (newCountError) return json({ error: "Comptage des demandes impossible." }, 500);
    return json({ data, count, newCount, page, size });
  }

  let payload: { id?: string; status?: string };
  try { payload = await req.json(); } catch { return json({ error: "JSON invalide." }, 400); }
  if (!payload.id || !["new", "in_progress", "qualified", "closed", "spam"].includes(payload.status ?? "")) {
    return json({ error: "Identifiant ou statut invalide." }, 400);
  }
  const { data, error } = await db.from("contact_leads").update({ status: payload.status })
    .eq("id", payload.id).select("id,status").single();
  if (error) return json({ error: "Mise à jour impossible." }, 500);
  return json({ data });
});

function urlSafe(requestUrl: string, key: string) {
  return new URL(requestUrl).searchParams.get(key);
}
