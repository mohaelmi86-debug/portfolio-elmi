import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("PORTFOLIO_ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const clean = (value: unknown, max = 5000) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  try {
    const payload = await req.json();
    // Honeypot: bots fill this invisible field; respond normally without storing.
    if (clean(payload.website, 200)) return json({ ok: true });

    const name = clean(payload.name, 120);
    const email = clean(payload.email, 254).toLowerCase();
    const message = clean(payload.message, 5000);
    const requestType = clean(payload.request_type, 30);
    const allowedTypes = ["devis", "partenariat", "investissement", "collaboration", "autre"];

    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        message.length < 10 || !allowedTypes.includes(requestType) ||
        payload.consent !== true) {
      return json({ error: "Vérifiez les champs obligatoires et le consentement." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Configuration serveur submit-lead manquante.");
      return json({ error: "Service temporairement indisponible." }, 503);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await admin.from("contact_leads").insert({
      name,
      email,
      organization: clean(payload.organization, 160) || null,
      request_type: requestType,
      service_slug: clean(payload.service_slug, 80) || null,
      project_slug: clean(payload.project_slug, 80) || null,
      budget_range: clean(payload.budget_range, 80) || null,
      timeline: clean(payload.timeline, 80) || null,
      message,
      consent_at: new Date().toISOString(),
      source: "portfolio",
    });
    if (error) {
      console.error("Insertion lead échouée:", error.code);
      return json({ error: "Impossible d'enregistrer la demande." }, 500);
    }
    return json({ ok: true, message: "Demande enregistrée." }, 201);
  } catch {
    return json({ error: "Requête invalide." }, 400);
  }
});
