// PORFOLIO CRM — build refresh 2026-11-15
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const cfg = window.PORTFOLIO_CONFIG ?? {};
const client = cfg.supabaseUrl && cfg.supabaseAnonKey && !cfg.supabaseAnonKey.startsWith("REMPLACER")
  ? createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
const $ = (id) => document.getElementById(id);
const labels = { new: "Nouveau", in_progress: "En cours", qualified: "Qualifié", closed: "Clôturé", spam: "Spam" };
const stages = { new: "Nouveau", contacted: "Contacté", qualified: "Qualifié", proposal: "Proposition", won: "Gagné", lost: "Perdu" };
let page = 0, total = 0, leads = [], busy = false;
function feedback(id, message, error = false) { $(id).textContent = message; $(id).style.color = error ? "#ffb9b9" : ""; }
function setBusy(value) { busy = value; $("refresh").disabled = value; $("previous").disabled = value || page === 0; $("next").disabled = value || (page + 1) * 25 >= total; }
function showSession(user) { $("login-panel").hidden=!!user; $("crm-panel").hidden=!user; $("session-actions").hidden=!user; $("admin-email").textContent=user?.email??""; }
function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
async function loadLeads(){
 if(!client||busy)return;setBusy(true);feedback("load-message","Chargement…");
 try{
  const {data:{session}}=await client.auth.getSession();if(!session){showSession(null);return;}
  const status=$("status-filter").value,qs=new URLSearchParams({page:String(page),size:"25"});if(status)qs.set("status",status);
  const res=await fetch(`${cfg.supabaseUrl}/functions/v1/admin-leads?${qs}`,{headers:{Authorization:`Bearer ${session.access_token}`,apikey:cfg.supabaseAnonKey}});
  const body=await res.json();if(!res.ok)throw new Error(body.error||"Chargement impossible.");
  leads=body.data||[];total=body.count||0;$("total-count").textContent=String(total);$("new-count").textContent=String(body.newCount??0);$("shown-count").textContent=String(leads.length);$("page-label").textContent=`Page ${page+1}`;
  const kpiRes=await fetch(`${cfg.supabaseUrl}/functions/v1/admin-leads`,{method:"PATCH",headers:{Authorization:`Bearer ${session.access_token}`,apikey:cfg.supabaseAnonKey,"Content-Type":"application/json"},body:JSON.stringify({action:"dashboard"})});
  const kpi=await kpiRes.json();if(!kpiRes.ok)throw new Error(kpi.error||"KPIs indisponibles.");
  $("kpi-new").textContent=String(kpi.stats.new??0);$("kpi-contacted").textContent=String(kpi.stats.contacted??0);$("kpi-qualified").textContent=String(kpi.stats.qualified??0);$("kpi-proposal").textContent=String(kpi.stats.proposal??0);$("kpi-won").textContent=String(kpi.stats.won??0);$("kpi-lost").textContent=String(kpi.stats.lost??0);$("kpi-conversion").textContent=`${kpi.conversion??0}%`;$("kpi-late").textContent=String(kpi.late??0);renderPipeline(kpi.stats,kpi.total??0);
  renderLeads();feedback("load-message",total?`${total} demande(s)`:"Aucune demande.");
 }catch(e){feedback("load-message",e.message||"Erreur réseau.",true);}finally{setBusy(false);}
}
function renderLeads(){
 const root=$("leads-list");root.replaceChildren();const term=$("search").value.trim().toLowerCase();
 const filtered=leads.filter(l=>[l.name,l.email,l.organization,l.message,l.request_type,l.internal_notes,l.pipeline_stage,l.next_action].join(" ").toLowerCase().includes(term));
 if(!filtered.length){root.append(node("div","panel lead-card",term?"Aucun résultat sur cette page.":"Aucune demande à afficher."));return;}
 filtered.forEach(lead=>{
  const card=node("article","lead-card"),top=node("div","lead-top"),left=node("div");
  left.append(node("h3","",lead.name||"Contact sans nom"));const email=node("a","",lead.email);email.href=`mailto:${lead.email}`;left.append(email);
  top.append(left,node("span","status",labels[lead.status]||lead.status));card.append(top);
  const date=lead.created_at?new Date(lead.created_at).toLocaleString("fr-FR"):"Date inconnue";
  card.append(node("div","lead-meta",[date,lead.request_type,lead.organization,lead.service_slug,lead.project_slug].filter(Boolean).join(" · ")));
  if(lead.budget_range||lead.timeline)card.append(node("div","lead-meta",[`Budget : ${lead.budget_range||"—"}`, `Délai : ${lead.timeline||"—"}`].join(" · ")));
  card.append(node("p","lead-message",lead.message||"(Sans message)"));
  const controls=node("div","lead-controls"),select=node("select");select.setAttribute("aria-label",`Statut de ${lead.name}`);
  Object.entries(labels).forEach(([value,label])=>{const o=node("option","",label);o.value=value;o.selected=value===lead.status;select.append(o);});
  select.addEventListener("change",()=>updateLead(lead.id,{status:select.value},select));controls.append(select);
  const stageSelect=node("select");stageSelect.setAttribute("aria-label",`Étape commerciale de ${lead.name}`);
  Object.entries(stages).forEach(([value,label])=>{const o=node("option","",label);o.value=value;o.selected=value===(lead.pipeline_stage||"new");stageSelect.append(o);});
  stageSelect.addEventListener("change",()=>updateLead(lead.id,{pipeline_stage:stageSelect.value},stageSelect));controls.append(stageSelect);card.append(controls);
  const follow=node("div","lead-followup"),action=node("input");action.type="text";action.maxLength=500;action.placeholder="Prochaine action (ex. appeler, envoyer devis…)";action.value=lead.next_action||"";
  const due=node("input");due.type="datetime-local";due.setAttribute("aria-label","Date de relance");due.value=lead.next_action_at?new Date(new Date(lead.next_action_at).getTime()-new Date(lead.next_action_at).getTimezoneOffset()*60000).toISOString().slice(0,16):"";
  const saveFollow=node("button","button button-quiet","Enregistrer la relance");saveFollow.type="button";saveFollow.addEventListener("click",()=>updateLead(lead.id,{next_action:action.value||null,next_action_at:due.value?new Date(due.value).toISOString():null},saveFollow));
  follow.append(action,due,saveFollow);card.append(follow);
  const notes=node("section","lead-notes"),heading=node("label","notes-label","Notes internes (visibles uniquement dans le CRM)");heading.htmlFor=`notes-${lead.id}`;
  const area=node("textarea","notes-input");area.id=`notes-${lead.id}`;area.rows=3;area.maxLength=5000;area.placeholder="Contexte, échange, prochaine action…";area.value=lead.internal_notes||"";
  const save=node("button","button button-quiet","Enregistrer les notes");save.type="button";save.addEventListener("click",()=>updateLead(lead.id,{internal_notes:area.value},save));
  notes.append(heading,area,save);card.append(notes);
  const histBtn=node("button","button button-quiet","Voir l’historique");histBtn.type="button";
  const histBox=node("div","lead-history");histBox.hidden=true;
  histBtn.addEventListener("click",async()=>{histBox.hidden=!histBox.hidden;if(!histBox.hidden&& !histBox.dataset.loaded){histBox.textContent="Chargement de l’historique…";try{const {data:{session}}=await client.auth.getSession();const rr=await fetch(`${cfg.supabaseUrl}/functions/v1/admin-leads?history=${encodeURIComponent(lead.id)}`,{headers:{Authorization:`Bearer ${session.access_token}`,apikey:cfg.supabaseAnonKey}});const jj=await rr.json();if(!rr.ok)throw new Error(jj.error||"Historique indisponible");histBox.replaceChildren();(jj.history||[]).forEach(item=>{const line=node("div","lead-history-item");const when=new Date(item.created_at).toLocaleString("fr-FR");line.append(node("strong","",when+" · "+item.actor_email));line.append(node("pre","",JSON.stringify(item.changes,null,2)));histBox.append(line);});if(!jj.history?.length)histBox.textContent="Aucune activité enregistrée.";histBox.dataset.loaded="1";}catch(err){histBox.textContent=err.message||"Erreur historique";}}});
  card.append(histBtn,histBox);root.append(card);
 });
}
async function updateLead(id,patch,control){
 control.disabled=true;
 try{
  const {data:{session}}=await client.auth.getSession();if(!session)throw new Error("Session expirée.");
  const res=await fetch(`${cfg.supabaseUrl}/functions/v1/admin-leads`,{method:"PATCH",headers:{Authorization:`Bearer ${session.access_token}`,apikey:cfg.supabaseAnonKey,"Content-Type":"application/json"},body:JSON.stringify({id,...patch})});
  const body=await res.json();if(!res.ok)throw new Error(body.error||"Mise à jour impossible.");
  feedback("load-message",patch.status?"Statut mis à jour.":patch.pipeline_stage?"Étape commerciale mise à jour.":patch.next_action!==undefined?"Relance enregistrée.":"Notes enregistrées.");await loadLeads();
 }catch(e){feedback("load-message",e.message,true);control.disabled=false;}
}
$("login-form").addEventListener("submit",async e=>{e.preventDefault();if(!client){feedback("login-message","Configuration Supabase manquante dans admin-config.js.",true);return;}feedback("login-message","Connexion…");const {data,error}=await client.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});if(error){feedback("login-message",error.message,true);return;}showSession(data.user);feedback("login-message","");page=0;loadLeads();});
$("logout").addEventListener("click",async()=>{await client?.auth.signOut();showSession(null);});
$("refresh").addEventListener("click",loadLeads);$("previous").addEventListener("click",()=>{if(page>0){page--;loadLeads();}});$("next").addEventListener("click",()=>{if((page+1)*25<total){page++;loadLeads();}});
$("status-filter").addEventListener("change",()=>{page=0;loadLeads();});$("search").addEventListener("input",renderLeads);
if(!client)feedback("login-message","Ajoutez la clé anon publique dans admin-config.js pour activer la connexion.",true);else client.auth.getSession().then(({data})=>{showSession(data.session?.user||null);if(data.session)loadLeads();});

function renderPipeline(stats,total){
 const root=$("pipeline-bars");if(!root)return;root.replaceChildren();
 const items=[["Nouveaux",stats.new],["Contactés",stats.contacted],["Qualifiés",stats.qualified],["Propositions",stats.proposal],["Gagnés",stats.won],["Perdus",stats.lost]];
 items.forEach(([label,value])=>{
  const row=node("div","pipeline-row"),name=node("span","pipeline-label",label),track=node("div","pipeline-track"),fill=node("div","pipeline-fill"),count=node("strong","pipeline-count",String(value??0));
  fill.style.width=`${total?Math.min(100,(Number(value||0)/total)*100):0}%`;track.append(fill);row.append(name,track,count);root.append(row);
 });
}
