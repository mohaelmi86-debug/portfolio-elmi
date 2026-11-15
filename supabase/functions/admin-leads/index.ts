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
    let query = db.from("contact_leads").select("id,created_at,name,email,organization,request_type,service_slug,project_slug,budget_range,timeline,message,status,source,internal_notes,pipeline_stage,next_action,next_action_at", { count: "exact" })
      .order("created_at", { ascending: false }).range(page * size, page * size + size - 1);
    if (status && ["new", "in_progress", "qualified", "closed", "spam"].includes(status)) query = query.eq("status", status);
    const { data, error, count } = await query;
    if (error) return json({ error: "Lecture des demandes impossible." }, 500);
    const { count: newCount, error: newCountError } = await db.from("contact_leads")
      .select("id", { count: "exact", head: true }).eq("status", "new");
    if (newCountError) return json({ error: "Comptage des demandes impossible." }, 500);
    return json({ data, count, newCount, page, size });
  }

  let payload: Record<string, unknown>;
  try { payload = await req.json(); } catch { return json({ error: "JSON invalide." }, 400); }
  const id = typeof payload.id === "string" ? payload.id : "";
  const allowed = ["status", "internal_notes", "pipeline_stage", "next_action", "next_action_at"];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (Object.prototype.hasOwnProperty.call(payload, key)) patch[key] = payload[key];
  if (!id || Object.keys(patch).length === 0) return json({ error: "Identifiant ou champs invalides." }, 400);
  if ("status" in patch && !["new", "in_progress", "qualified", "closed", "spam"].includes(String(patch.status))) return json({ error: "Statut invalide." }, 400);
  if ("pipeline_stage" in patch && !["new", "contacted", "qualified", "proposal", "won", "lost"].includes(String(patch.pipeline_stage))) return json({ error: "Étape commerciale invalide." }, 400);
  if ("internal_notes" in patch && (typeof patch.internal_notes !== "string" || patch.internal_notes.length > 5000)) return json({ error: "Notes invalides (5000 caractères maximum)." }, 400);
  if ("next_action" in patch && patch.next_action !== null && (typeof patch.next_action !== "string" || patch.next_action.length > 500)) return json({ error: "Action invalide." }, 400);
  if ("next_action_at" in patch && patch.next_action_at !== null && (typeof patch.next_action_at !== "string" || Number.isNaN(Date.parse(patch.next_action_at)))) return json({ error: "Date de relance invalide." }, 400);
  const { data, error } = await db.from("contact_leads").update(patch).eq("id", id)
    .select("id,status,internal_notes,pipeline_stage,next_action,next_action_at").single();
  if (error) return json({ error: "Mise à jour impossible." }, 500);
  return json({ data });
