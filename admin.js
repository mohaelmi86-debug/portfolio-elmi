import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const cfg = window.PORTFOLIO_CONFIG ?? {};
const client = cfg.supabaseUrl && cfg.supabaseAnonKey && !cfg.supabaseAnonKey.startsWith("REMPLACER")
  ? createClient(cfg.supabaseUrl, cfg.supabaseAnonKey)
  : null;
const $ = (id) => document.getElementById(id);
const labels = { new: "Nouveau", in_progress: "En cours", qualified: "Qualifié", closed: "Clôturé", spam: "Spam" };
let page = 0, total = 0, leads = [], busy = false;

function feedback(id, message, error = false) { $(id).textContent = message; $(id).style.color = error ? "#ffb9b9" : ""; }
function setBusy(value) { busy = value; $("refresh").disabled = value; $("previous").disabled = value || page === 0; $("next").disabled = value || (page + 1) * 25 >= total; }

function showSession(user) {
  $("login-panel").hidden = !!user; $("crm-panel").hidden = !user; $("session-actions").hidden = !user;
  $("admin-email").textContent = user?.email ?? "";
}
function node(tag, cls, text) { const n = document.createElement(tag); if(cls)n.className=cls; if(text!==undefined)n.textContent=text; return n; }

async function loadLeads() {
  if(!client || busy) return;
  setBusy(true); feedback("load-message","Chargement…");
  try {
    const {data:{session}} = await client.auth.getSession();
    if(!session){showSession(null);return;}
    const status=$("status-filter").value;
    const qs=new URLSearchParams({page:String(page),size:"25"}); if(status)qs.set("status",status);
    const res=await fetch(`${cfg.supabaseUrl}/functions/v1/admin-leads?${qs}`,{headers:{Authorization:`Bearer ${session.access_token}`,apikey:cfg.supabaseAnonKey}});
    const body=await res.json(); if(!res.ok)throw new Error(body.error||"Chargement impossible.");
    leads=body.data||[];total=body.count||0;
    $("total-count").textContent=String(total);$("new-count").textContent=String(body.newCount??0);$("shown-count").textContent=String(leads.length);$("page-label").textContent=`Page ${page+1}`;
    renderLeads();feedback("load-message",total?`${total} demande(s)`:"Aucune demande.");
  } catch(e){feedback("load-message",e.message||"Erreur réseau.",true);}
  finally{setBusy(false);}
}
function renderLeads(){
  const root=$("leads-list");root.replaceChildren();
  const term=$("search").value.trim().toLowerCase();
  const filtered=leads.filter(l=>[l.name,l.email,l.organization,l.message,l.request_type].join(" ").toLowerCase().includes(term));
  if(!filtered.length){root.append(node("div","panel lead-card",term?"Aucun résultat sur cette page.":"Aucune demande à afficher."));return;}
  filtered.forEach(lead=>{
    const card=node("article","lead-card"),top=node("div","lead-top"),left=node("div");
    left.append(node("h3","",lead.name||"Contact sans nom"));
    const email=node("a","",lead.email);email.href=`mailto:${lead.email}`;left.append(email);
    top.append(left,node("span","status",labels[lead.status]||lead.status));card.append(top);
    const date=lead.created_at?new Date(lead.created_at).toLocaleString("fr-FR"):"Date inconnue";
    card.append(node("div","lead-meta",[date,lead.request_type,lead.organization,lead.service_slug,lead.project_slug].filter(Boolean).join(" · ")));
    if(lead.budget_range||lead.timeline)card.append(node("div","lead-meta",[`Budget : ${lead.budget_range||"—"}`, `Délai : ${lead.timeline||"—"}`].join(" · ")));
    card.append(node("p","lead-message",lead.message||"(Sans message)"));
    const controls=node("div","lead-controls"),select=node("select");
    select.setAttribute("aria-label",`Statut de ${lead.name}`);
    Object.entries(labels).forEach(([value,label])=>{const o=node("option","",label);o.value=value;o.selected=value===lead.status;select.append(o);});
    select.addEventListener("change",()=>updateStatus(lead.id,select.value,select));controls.append(select);card.append(controls);root.append(card);
  });
}
async function updateStatus(id,status,select){
  select.disabled=true;
  try{
    const {data:{session}}=await client.auth.getSession();if(!session)throw new Error("Session expirée.");
    const res=await fetch(`${cfg.supabaseUrl}/functions/v1/admin-leads`,{method:"PATCH",headers:{Authorization:`Bearer ${session.access_token}`,apikey:cfg.supabaseAnonKey,"Content-Type":"application/json"},body:JSON.stringify({id,status})});
    const body=await res.json();if(!res.ok)throw new Error(body.error||"Mise à jour impossible.");
    feedback("load-message","Statut mis à jour.");await loadLeads();
  }catch(e){feedback("load-message",e.message,true);select.disabled=false;}
}
$("login-form").addEventListener("submit",async e=>{
  e.preventDefault();if(!client){feedback("login-message","Configuration Supabase manquante dans admin-config.js.",true);return;}
  feedback("login-message","Connexion…");
  const {data,error}=await client.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
  if(error){feedback("login-message",error.message,true);return;}
  showSession(data.user);feedback("login-message","");page=0;loadLeads();
});
$("logout").addEventListener("click",async()=>{await client?.auth.signOut();showSession(null);});
$("refresh").addEventListener("click",loadLeads);
$("previous").addEventListener("click",()=>{if(page>0){page--;loadLeads();}});
$("next").addEventListener("click",()=>{if((page+1)*25<total){page++;loadLeads();}});
$("status-filter").addEventListener("change",()=>{page=0;loadLeads();});
$("search").addEventListener("input",renderLeads);
if(!client)feedback("login-message","Ajoutez la clé anon publique dans admin-config.js pour activer la connexion.",true);
else client.auth.getSession().then(({data})=>{showSession(data.session?.user||null);if(data.session)loadLeads();});
