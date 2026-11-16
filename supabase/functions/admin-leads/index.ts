import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const allowedOrigin = Deno.env.get("PORTFOLIO_ALLOWED_ORIGIN") ?? "https://elmihdhoirmohamedali.netlify.app";
const isAllowedOrigin = (origin: string | null) => !!origin && (
  origin === allowedOrigin ||
  (origin.startsWith("https://deploy-preview-") && origin.endsWith("--elmihdhoirmohamedali.netlify.app")) ||
  /^https:\/\/[a-f0-9]+--elmihdhoirmohamedali\.netlify\.app$/.test(origin)
);
const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && isAllowedOrigin(origin) ? origin : allowedOrigin,
  "Vary": "Origin",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, PATCH, POST, OPTIONS",

});
const json = (body: unknown, status = 200, origin: string | null = null) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (origin && !isAllowedOrigin(origin)) return json({ error: "Origine non autorisée." }, 403, origin);
  if (req.method === "OPTIONS") {
    if (origin && !isAllowedOrigin(origin)) return new Response(null, { status: 403, headers: corsHeaders(origin) });
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (!["GET", "PATCH", "POST"].includes(req.method)) return json({ error: "Méthode non autorisée." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const admins = (Deno.env.get("PORTFOLIO_ADMIN_EMAILS") ?? "")
    .split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (!url || !anon || !service || admins.length === 0) {
    return json({ error: "Configuration administrateur incomplète." }, 503, origin);
  }

  const bearer = req.headers.get("Authorization");
  if (!bearer?.startsWith("Bearer ")) return json({ error: "Authentification requise." }, 401, origin);
  const authClient = createClient(url, anon, { global: { headers: { Authorization: bearer } } });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user?.email || !admins.includes(user.email.toLowerCase())) {
    return json({ error: "Accès administrateur refusé." }, 403, origin);
  }

  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  if (req.method === "GET" && urlSafe(req.url,"finance") === "1") {
    const [{data:docs,error:de},{data:pays,error:pe}]=await Promise.all([
      db.from("crm_documents").select("id,document_type,status,amount,issue_date,due_date,reference,title,client_id").order("issue_date",{ascending:false}).limit(1000),
      db.from("crm_payments").select("document_id,amount,payment_date,payment_method").order("payment_date",{ascending:false}).limit(5000)
    ]);
    if(de||pe)return json({error:"Synthèse financière indisponible."},500,origin);
    const invoices=(docs||[]).filter(x=>x.document_type==="invoice"&&x.status!=="cancelled");
    const quotes=(docs||[]).filter(x=>x.document_type==="quote"&&x.status!=="cancelled");
    const paidBy={};(pays||[]).forEach(p=>paidBy[p.document_id]=(paidBy[p.document_id]||0)+Number(p.amount));
    const totalInvoiced=invoices.reduce((n,x)=>n+Number(x.amount),0);
    const collected=(pays||[]).reduce((n,p)=>n+Number(p.amount),0);
    const outstanding=invoices.reduce((n,x)=>n+Math.max(0,Number(x.amount)-(paidBy[x.id]||0)),0);
    const overdue=invoices.filter(x=>x.due_date&&x.due_date<new Date().toISOString().slice(0,10)&&Number(x.amount)>(paidBy[x.id]||0));
    return json({data:{total_invoiced:totalInvoiced,collected,outstanding,overdue_amount:overdue.reduce((n,x)=>n+Number(x.amount)-(paidBy[x.id]||0),0),overdue_count:overdue.length,quotes_total:quotes.reduce((n,x)=>n+Number(x.amount),0),invoice_count:invoices.length,documents:docs||[],payments:pays||[]}},200,origin);
  }
  if (req.method === "GET" && urlSafe(req.url,"payments") === "1") {
    const documentId=urlSafe(req.url,"document_id");
    if(!documentId||!/^[0-9a-f-]{36}$/i.test(documentId))return json({error:"Document invalide."},400,origin);
    const {data,error}=await db.from("crm_payments").select("id,document_id,amount,payment_date,payment_method,reference,notes,created_at").eq("document_id",documentId).order("payment_date",{ascending:false}).limit(100);
    if(error)return json({error:"Paiements indisponibles."},500,origin);
    return json({data},200,origin);
  }
  if (req.method === "GET" && urlSafe(req.url, "documents") === "1") {
    const clientId=urlSafe(req.url,"client_id");
    if(!clientId||!/^[0-9a-f-]{36}$/i.test(clientId))return json({error:"Client invalide."},400,origin);
    const {data,error}=await db.from("crm_documents").select("id,client_id,document_type,reference,title,amount,status,issue_date,due_date,notes,created_at").eq("client_id",clientId).order("issue_date",{ascending:false}).limit(100);
    if(error)return json({error:"Documents client indisponibles."},500,origin);
    return json({data},200,origin);
  }
  if (req.method === "GET" && urlSafe(req.url, "interactions") === "1") {
    const clientId = urlSafe(req.url, "client_id");
    if (!clientId || !/^[0-9a-f-]{36}$/i.test(clientId)) return json({ error: "Client invalide." }, 400, origin);
    const { data, error } = await db.from("crm_interactions").select("id,client_id,interaction_type,title,details,occurred_at,created_by,created_at").eq("client_id", clientId).order("occurred_at", { ascending: false }).limit(100);
    if (error) return json({ error: "Historique client indisponible." }, 500, origin);
    return json({ data }, 200, origin);
  }
  if (req.method === "GET") {
    const page = Math.max(0, Number(urlSafe(req.url, "page") ?? 0) || 0);
    const size = Math.min(100, Math.max(1, Number(urlSafe(req.url, "size") ?? 25) || 25));
    const status = urlSafe(req.url, "status");
    const stage = urlSafe(req.url, "stage");
    let query = db.from("contact_leads").select("id,created_at,name,email,organization,request_type,service_slug,project_slug,budget_range,timeline,message,status,source,internal_notes,pipeline_stage,next_action,next_action_at,estimated_amount,proposal_amount,signed_amount", { count: "exact" })
      .order("created_at", { ascending: false }).range(page * size, page * size + size - 1);
    if (status && ["new", "in_progress", "qualified", "closed", "spam"].includes(status)) query = query.eq("status", status);
    if (stage && ["new", "contacted", "qualified", "proposal", "won", "lost"].includes(stage)) query = query.eq("pipeline_stage", stage);
    const { data, error, count } = await query;
    if (error) return json({ error: "Lecture des demandes impossible." }, 500, origin);
    const { count: newCount, error: newCountError } = await db.from("contact_leads")
      .select("id", { count: "exact", head: true }).eq("status", "new");
    if (newCountError) return json({ error: "Comptage des demandes impossible." }, 500, origin);
    return json({ data, count, newCount, page, size }, 200, origin);
  }

  let payload: Record<string, unknown>;
  try { payload = await req.json(); } catch { return json({ error: "JSON invalide." }, 400); }
  if (req.method === "POST" && payload.action === "create_payment") {
    const documentId=typeof payload.document_id==="string"?payload.document_id:"";
    const amount=Number(payload.amount),method=String(payload.payment_method??"");
    const paymentDate=typeof payload.payment_date==="string"?payload.payment_date:"";
    const reference=typeof payload.reference==="string"?payload.reference.trim():"";
    const notes=typeof payload.notes==="string"?payload.notes.trim():"";
    if(!/^[0-9a-f-]{36}$/i.test(documentId)||!Number.isFinite(amount)||amount<=0||amount>1e9||!["transfer","card","cash","check","sepa","paypal","other"].includes(method)||(paymentDate&&!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate))||reference.length>255||notes.length>2000)return json({error:"Données de paiement invalides."},400,origin);
    const {data:doc,error:docErr}=await db.from("crm_documents").select("id,amount,document_type,status").eq("id",documentId).single();
    if(docErr||!doc||doc.document_type!=="invoice"||doc.status==="cancelled")return json({error:"Paiement réservé à une facture valide."},400,origin);
    const {data:existing,error:sumErr}=await db.from("crm_payments").select("amount").eq("document_id",documentId);
    if(sumErr)return json({error:"Vérification des paiements impossible."},500,origin);
    const paid=(existing||[]).reduce((n,p)=>n+Number(p.amount),0);
    if(paid+amount>Number(doc.amount)+0.005)return json({error:"Le paiement dépasse le solde de la facture."},400,origin);
    const {data,error}=await db.from("crm_payments").insert({document_id:documentId,amount,payment_method:method,payment_date:paymentDate||new Date().toISOString().slice(0,10),reference:reference||null,notes:notes||null,created_by:user.email}).select("id,document_id,amount,payment_date,payment_method,reference,notes,created_at").single();
    if(error)return json({error:"Enregistrement du paiement impossible."},500,origin);
    if(paid+amount>=Number(doc.amount)-0.005)await db.from("crm_documents").update({status:"paid",updated_at:new Date().toISOString()}).eq("id",documentId);
    return json({data,paid_total:paid+amount,remaining:Math.max(0,Number(doc.amount)-paid-amount)},201,origin);
  }
  if (req.method === "POST" && payload.action === "create_document") {
    const clientId=typeof payload.client_id==="string"?payload.client_id:"";
    const type=String(payload.document_type??"");
    const reference=typeof payload.reference==="string"?payload.reference.trim():"";
    const title=typeof payload.title==="string"?payload.title.trim():"";
    const amount=Number(payload.amount);
    const status=String(payload.status??"draft");
    const issueDate=typeof payload.issue_date==="string"?payload.issue_date:"";
    const dueDate=typeof payload.due_date==="string"?payload.due_date:null;
    const notes=typeof payload.notes==="string"?payload.notes.trim():"";
    if(!/^[0-9a-f-]{36}$/i.test(clientId)||!["quote","invoice"].includes(type)||!reference||reference.length>80||!title||title.length>255||!Number.isFinite(amount)||amount<0||amount>1e9||!["draft","sent","accepted","paid","overdue","cancelled"].includes(status)|| (issueDate&&!/^\d{4}-\d{2}-\d{2}$/.test(issueDate))||(dueDate&&!/^\d{4}-\d{2}-\d{2}$/.test(dueDate))||notes.length>5000)return json({error:"Données document invalides."},400,origin);
    const {data,error}=await db.from("crm_documents").insert({client_id:clientId,document_type:type,reference,title,amount,status,issue_date:issueDate||new Date().toISOString().slice(0,10),due_date:dueDate||null,notes:notes||null,created_by:user.email}).select("id,client_id,document_type,reference,title,amount,status,issue_date,due_date,notes,created_at").single();
    if(error)return json({error:"Création du document impossible (référence peut-être déjà utilisée)."},500,origin);
    return json({data},201,origin);
  }
  if (req.method === "POST" && payload.action === "create_interaction") {
    const clientId = typeof payload.client_id === "string" ? payload.client_id : "";
    const type = String(payload.interaction_type ?? "");
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    const details = typeof payload.details === "string" ? payload.details.trim() : "";
    const occurredAt = typeof payload.occurred_at === "string" ? payload.occurred_at : "";
    if (!/^[0-9a-f-]{36}$/i.test(clientId) || !["call","email","meeting","note","other"].includes(type) || !title || title.length > 255 || details.length > 5000 || (occurredAt && Number.isNaN(Date.parse(occurredAt)))) return json({ error: "Données d’interaction invalides." }, 400, origin);
    const { data, error } = await db.from("crm_interactions").insert({ client_id: clientId, interaction_type: type, title, details: details || null, occurred_at: occurredAt || new Date().toISOString(), created_by: user.email }).select("id,client_id,interaction_type,title,details,occurred_at,created_by,created_at").single();
    if (error) return json({ error: "Enregistrement de l’interaction impossible." }, 500, origin);
    return json({ data }, 201, origin);
  }
  if (payload.action === "dashboard") {
    const { data: rows, error } = await db.from("contact_leads").select("pipeline_stage,estimated_amount,proposal_amount,signed_amount,next_action_at");
    if (error) return json({ error: "Calcul des indicateurs impossible." }, 500);
    const stats = { new:0, contacted:0, qualified:0, proposal:0, won:0, lost:0 };
    let estimatedAmount=0, proposalAmount=0, signedRevenue=0, late=0;
    const now=Date.now();
    for (const row of rows ?? []) {
      const stage=String(row.pipeline_stage||"new"); if(stage in stats) stats[stage]++;
      estimatedAmount+=Number(row.estimated_amount||0); proposalAmount+=Number(row.proposal_amount||0);
      signedRevenue+=Number(row.signed_amount||0);
      if(row.next_action_at && Date.parse(row.next_action_at)<now && !["won","lost"].includes(stage))late++;
    }
    const total=rows?.length??0;
    return json({stats,total,late,conversion:total?Math.round(stats.won/total*100):0,estimatedAmount,proposalAmount,signedRevenue});
  }
  const id = typeof payload.id === "string" ? payload.id : "";
  const allowed = ["status", "internal_notes", "pipeline_stage", "next_action", "next_action_at", "estimated_amount", "proposal_amount", "signed_amount"];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (Object.prototype.hasOwnProperty.call(payload, key)) patch[key] = payload[key];
  if (!id || Object.keys(patch).length === 0) return json({ error: "Identifiant ou champs invalides." }, 400);
  if ("status" in patch && !["new", "in_progress", "qualified", "closed", "spam"].includes(String(patch.status))) return json({ error: "Statut invalide." }, 400);
  if ("pipeline_stage" in patch && !["new", "contacted", "qualified", "proposal", "won", "lost"].includes(String(patch.pipeline_stage))) return json({ error: "Étape commerciale invalide." }, 400);
  for (const key of ["estimated_amount","proposal_amount","signed_amount"]) if (key in patch && (typeof patch[key] !== "number" || !Number.isFinite(patch[key]) || patch[key] < 0 || patch[key] > 1000000000)) return json({ error: `Montant ${key} invalide.` }, 400);
  if ("internal_notes" in patch && (typeof patch.internal_notes !== "string" || patch.internal_notes.length > 5000)) return json({ error: "Notes invalides (5000 caractères maximum)." }, 400);
  if ("next_action" in patch && patch.next_action !== null && (typeof patch.next_action !== "string" || patch.next_action.length > 500)) return json({ error: "Action invalide." }, 400);
  if ("next_action_at" in patch && patch.next_action_at !== null && (typeof patch.next_action_at !== "string" || Number.isNaN(Date.parse(patch.next_action_at)))) return json({ error: "Date de relance invalide." }, 400);
  const { data, error } = await db.from("contact_leads").update(patch).eq("id", id)
    .select("id,status,internal_notes,pipeline_stage,next_action,next_action_at,estimated_amount,proposal_amount,signed_amount").single();
  if (error) return json({ error: "Mise à jour impossible." }, 500);
  return json({ data });

});

function urlSafe(requestUrl: string, key: string) {
  return new URL(requestUrl).searchParams.get(key);
}
