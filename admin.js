// PORFOLIO CRM — build refresh 2026-11-15
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const cfg = window.PORTFOLIO_CONFIG ?? {};
const client = cfg.supabaseUrl && cfg.supabaseAnonKey && !cfg.supabaseAnonKey.startsWith("REMPLACER")
  ? createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
const $ = (id) => document.getElementById(id);
const labels = { new: "Nouveau", in_progress: "En cours", qualified: "Qualifié", closed: "Clôturé", spam: "Spam" };
const stages = { new: "Nouveau", contacted: "Contacté", qualified: "Qualifié", proposal: "Proposition", won: "Gagné", lost: "Perdu" };
let page = 0, total = 0, leads = [], busy = false, clientsMode = false;
function feedback(id, message, error = false) { $(id).textContent = message; $(id).style.color = error ? "#ffb9b9" : ""; }
function setBusy(value) { busy = value; $("refresh").disabled = value; $("previous").disabled = value || page === 0; $("next").disabled = value || (page + 1) * 25 >= total; }
function showSession(user) { $("login-panel").hidden=!!user; $("crm-panel").hidden=!user; $("session-actions").hidden=!user; $("admin-email").textContent=user?.email??""; }
function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
async function loadLeads(){
 if(!client||busy)return;setBusy(true);feedback("load-message","Chargement…");
 try{
  const {data:{session}}=await client.auth.getSession();if(!session){showSession(null);return;}
  const status=$("status-filter").value,qs=new URLSearchParams({page:String(page),size:"25"});if(status)qs.set("status",status);if(clientsMode)qs.set("clients","1");
  const res=await fetch(`${cfg.supabaseUrl}/functions/v1/admin-leads?${qs}`,{headers:{Authorization:`Bearer ${session.access_token}`,apikey:cfg.supabaseAnonKey}});
  const body=await res.json();if(!res.ok)throw new Error(body.error||"Chargement impossible.");
  leads=body.data||[];total=body.count||0;$("total-count").textContent=String(total);$("new-count").textContent=String(body.newCount??0);$("shown-count").textContent=String(leads.length);$("page-label").textContent=`Page ${page+1}`;
  const kpiRes=await fetch(`${cfg.supabaseUrl}/functions/v1/admin-leads`,{method:"PATCH",headers:{Authorization:`Bearer ${session.access_token}`,apikey:cfg.supabaseAnonKey,"Content-Type":"application/json"},body:JSON.stringify({action:"dashboard"})});
  const kpi=await kpiRes.json();if(!kpiRes.ok)throw new Error(kpi.error||"KPIs indisponibles.");
  $("kpi-new").textContent=String(kpi.stats.new??0);$("kpi-contacted").textContent=String(kpi.stats.contacted??0);$("kpi-qualified").textContent=String(kpi.stats.qualified??0);$("kpi-proposal").textContent=String(kpi.stats.proposal??0);$("kpi-won").textContent=String(kpi.stats.won??0);$("kpi-lost").textContent=String(kpi.stats.lost??0);$("kpi-conversion").textContent=`${kpi.conversion??0}%`;$("kpi-late").textContent=String(kpi.late??0);$("kpi-estimate").textContent=money(kpi.estimatedAmount);$("kpi-proposals-eur").textContent=money(kpi.proposalAmount);$("kpi-revenue").textContent=money(kpi.signedRevenue);renderPipeline(kpi.stats,kpi.total??0);
  if(clientsMode){renderClients();loadFinanceKPIs();}else{renderLeads();loadFinanceKPIs();}$("crm-title").textContent=clientsMode?"Clients gagnés":"Demandes entrantes";$("export-csv").textContent=clientsMode?"⇩ Export clients CSV":"⇩ Export CSV";feedback("load-message",clientsMode?`${total} client(s) gagné(s)`:total?`${total} demande(s)`:"Aucune demande.");$("clients-view").textContent=clientsMode?"← Retour aux demandes":"👥 Clients gagnés";
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
  const amounts=node("div","lead-amounts");[[ "estimated_amount","Valeur estimée (€)" ],["proposal_amount","Proposition (€)"],["signed_amount","CA signé (€)"]].forEach(([key,label])=>{const wrap=node("label","amount-field",label),inp=node("input");inp.type="number";inp.min="0";inp.step="0.01";inp.value=String(lead[key]??0);inp.setAttribute("aria-label",label);wrap.append(inp);amounts.append(wrap);inp.addEventListener("change",()=>updateLead(lead.id,{[key]:Number(inp.value)},inp));});card.append(amounts);
  const controls=node("div","lead-controls"),select=node("select");select.setAttribute("aria-label",`Statut de ${lead.name}`);
  Object.entries(labels).forEach(([value,label])=>{const o=node("option","",label);o.value=value;o.selected=value===lead.status;select.append(o);});
  select.addEventListener("change",()=>updateLead(lead.id,{status:select.value},select));controls.append(select);
  const stageSelect=node("select");stageSelect.setAttribute("aria-label",`Étape commerciale de ${lead.name}`);
  Object.entries(stages).forEach(([value,label])=>{const o=node("option","",label);o.value=value;o.selected=value===(lead.pipeline_stage||"new");stageSelect.append(o);});
  stageSelect.addEventListener("change",()=>updateLead(lead.id,{pipeline_stage:stageSelect.value},stageSelect));controls.append(stageSelect);if(lead.pipeline_stage==="won"){const convert=node("button","button button-primary","Convertir en client");convert.type="button";convert.addEventListener("click",()=>convertClient(lead.id,convert));controls.append(convert);}card.append(controls);
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
async function convertClient(leadId,button){
 button.disabled=true;
 try{const {data:{session}}=await client.auth.getSession();const res=await fetch(`${cfg.supabaseUrl}/functions/v1/admin-leads`,{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`,apikey:cfg.supabaseAnonKey,"Content-Type":"application/json"},body:JSON.stringify({action:"convert",lead_id:leadId})});const body=await res.json();if(!res.ok)throw new Error(body.error||"Conversion impossible.");feedback("load-message","Prospect converti en client.");clientsMode=true;page=0;await loadLeads();}catch(e){feedback("load-message",e.message,true);button.disabled=false;}
}
async function loadFinanceKPIs(){const box=$("finance-kpis");if(!clientsMode){box.hidden=true;return;}box.hidden=false;try{const {data:{session}}=await client.auth.getSession();const r=await fetch(cfg.supabaseUrl+"/functions/v1/admin-leads?finance=1",{headers:{Authorization:"Bearer "+session.access_token,apikey:cfg.supabaseAnonKey}});const j=await r.json();if(!r.ok)throw new Error(j.error||"Synthèse indisponible");const d=j.data;$("fin-invoiced").textContent=money(d.total_invoiced);$("fin-collected").textContent=money(d.collected);$("fin-outstanding").textContent=money(d.outstanding);$("fin-overdue").textContent=money(d.overdue_amount)+" ("+d.overdue_count+")";$("fin-quotes").textContent=money(d.quotes_total);}catch(e){$("fin-invoiced").textContent="—";feedback("load-message","KPI finance : "+e.message,true);}}
function renderClients(){
 const root=$("leads-list");root.replaceChildren();const term=$("search").value.trim().toLowerCase();
 const filtered=leads.filter(c=>[c.name,c.email,c.organization,c.phone,c.notes].join(" ").toLowerCase().includes(term));
 if(!term){const add=node("button","button button-primary","＋ Ajouter un client");add.type="button";add.addEventListener("click",()=>addClientManually(add));root.append(add);}
 if(!filtered.length){root.append(node("div","panel lead-card",term?"Aucun résultat sur cette page.":"Aucun client enregistré."));return;}
 filtered.forEach(c=>{
  const card=node("article","lead-card"),top=node("div","lead-top"),left=node("div","");
  left.append(node("h3","",c.name||"Client sans nom"),node("div","lead-meta",c.organization||"Client particulier"));
  if(c.email){const a=node("a","",c.email);a.href="mailto:"+c.email;left.append(a);}
  top.append(left,node("span","status",c.status==="active"?"Actif":"Inactif"));card.append(top,node("div","lead-meta","Client depuis le "+new Date(c.created_at).toLocaleDateString("fr-FR")));
  const form=node("section","lead-notes"),fields=[];
  [["name","Nom","text"],["email","Email","email"],["organization","Organisation","text"],["phone","Téléphone","tel"]].forEach(([key,label,type])=>{const wrap=node("label","amount-field",label),input=node("input");input.type=type;input.value=c[key]||"";input.maxLength=255;wrap.append(input);form.append(wrap);fields.push([key,input]);});
  const notesLabel=node("label","notes-label","Notes client");const notes=node("textarea","notes-input");notes.rows=3;notes.maxLength=5000;notes.value=c.notes||"";form.append(notesLabel,notes);
  const statusWrap=node("label","amount-field","Statut"),status=node("select");[["active","Actif"],["inactive","Inactif"]].forEach(([v,l])=>{const o=node("option","",l);o.value=v;o.selected=c.status===v;status.append(o);});statusWrap.append(status);form.append(statusWrap);
  const save=node("button","button button-primary","Enregistrer la fiche");save.type="button";save.addEventListener("click",()=>updateClient(c.id,{...Object.fromEntries(fields.map(([k,i])=>[k,i.value.trim()])),notes:notes.value,status:status.value},save));
  form.append(save);card.append(form);
  const detailsBox=node("details","client-interactions"),summary=node("summary","","Historique & échanges");detailsBox.append(summary);
  const interactionForm=node("div","lead-followup"),typeSelect=node("select");
  [["call","Appel"],["email","E-mail"],["meeting","Réunion"],["note","Note"],["other","Autre"]].forEach(([v,l])=>{const o=node("option","",l);o.value=v;typeSelect.append(o);});
  const titleInput=node("input");titleInput.placeholder="Objet de l’échange";titleInput.maxLength=255;
  const detailInput=node("textarea","notes-input");detailInput.rows=2;detailInput.maxLength=5000;detailInput.placeholder="Compte rendu / détails";
  const dateInput=node("input");dateInput.type="datetime-local";dateInput.setAttribute("aria-label","Date de l’échange");dateInput.value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
  const addInteraction=node("button","button button-primary","Ajouter l’échange");addInteraction.type="button";
  const historyRoot=node("div","client-history");historyRoot.textContent="Ouvrez cette section pour charger l’historique.";
  let historyLoaded=false;
  const loadInteractions=async()=>{historyRoot.textContent="Chargement…";try{const {data:{session}}=await client.auth.getSession();const rr=await fetch(cfg.supabaseUrl+"/functions/v1/admin-leads?interactions=1&client_id="+encodeURIComponent(c.id),{headers:{Authorization:"Bearer "+session.access_token,apikey:cfg.supabaseAnonKey}});const jj=await rr.json();if(!rr.ok)throw new Error(jj.error||"Historique indisponible.");historyRoot.replaceChildren();(jj.data||[]).forEach(it=>{const item=node("article","client-history-item");item.append(node("strong","",new Date(it.occurred_at).toLocaleString("fr-FR")+" · "+({call:"Appel",email:"E-mail",meeting:"Réunion",note:"Note",other:"Autre"}[it.interaction_type]||it.interaction_type)),node("div","",it.title),node("p","",it.details||""));historyRoot.append(item);});if(!jj.data?.length)historyRoot.textContent="Aucun échange enregistré.";historyLoaded=true;}catch(err){historyRoot.textContent=err.message||"Erreur historique";}};
  detailsBox.addEventListener("toggle",()=>{if(detailsBox.open&&!historyLoaded)loadInteractions();});
  addInteraction.addEventListener("click",async()=>{addInteraction.disabled=true;try{const {data:{session}}=await client.auth.getSession();if(!session)throw new Error("Session expirée.");const rr=await fetch(cfg.supabaseUrl+"/functions/v1/admin-leads",{method:"POST",headers:{Authorization:"Bearer "+session.access_token,apikey:cfg.supabaseAnonKey,"Content-Type":"application/json"},body:JSON.stringify({action:"create_interaction",client_id:c.id,interaction_type:typeSelect.value,title:titleInput.value,details:detailInput.value,occurred_at:dateInput.value?new Date(dateInput.value).toISOString():null})});const jj=await rr.json();if(!rr.ok)throw new Error(jj.error||"Ajout impossible.");titleInput.value="";detailInput.value="";feedback("load-message","Échange client enregistré.");historyLoaded=false;await loadInteractions();}catch(err){feedback("load-message",err.message||"Erreur",true);}finally{addInteraction.disabled=false;}});
  interactionForm.append(typeSelect,titleInput,dateInput,detailInput,addInteraction);detailsBox.append(interactionForm,historyRoot);card.append(detailsBox);
  const docs=node("details","client-documents");docs.append(node("summary","","Devis & factures"));
  const df=node("div","lead-followup"),dt=node("select");
  [["quote","Devis"],["invoice","Facture"]].forEach(([v,l])=>{const o=node("option","",l);o.value=v;dt.append(o);});
  const dr=node("input");dr.placeholder="Référence";dr.maxLength=80;
  const dtitle=node("input");dtitle.placeholder="Objet / prestation";dtitle.maxLength=255;
  const dam=node("input");dam.type="number";dam.min="0";dam.step="0.01";dam.placeholder="Montant €";
  const ds=node("select");[["draft","Brouillon"],["sent","Envoyé"],["accepted","Accepté"],["paid","Payé"],["overdue","En retard"],["cancelled","Annulé"]].forEach(([v,l])=>{const o=node("option","",l);o.value=v;ds.append(o);});
  const dd=node("input");dd.type="date";dd.setAttribute("aria-label","Échéance");
  const dn=node("textarea","notes-input");dn.rows=2;dn.maxLength=5000;dn.placeholder="Notes";
  const db=node("button","button button-primary","Créer");db.type="button";
  const dl=node("div","client-history");let loaded=false;
  const loadDocuments=async()=>{dl.textContent="Chargement…";try{const {data:{session}}=await client.auth.getSession();const rr=await fetch(cfg.supabaseUrl+"/functions/v1/admin-leads?documents=1&client_id="+encodeURIComponent(c.id),{headers:{Authorization:"Bearer "+session.access_token,apikey:cfg.supabaseAnonKey}});const jj=await rr.json();if(!rr.ok)throw new Error(jj.error||"Documents indisponibles");dl.replaceChildren();(jj.data||[]).forEach(x=>{const it=node("article","client-history-item");it.dataset.docid=x.id;it.style.cursor="pointer";it.title="Cliquer pour gérer les encaissements";it.addEventListener("click",()=>{payBox.hidden=x.document_type!=="invoice";if(payBox.hidden)return;[...dl.querySelectorAll(".client-history-item")].forEach(y=>y.style.outline="");it.style.outline="2px solid var(--accent,#777)";loadPayments(x.id);});it.append(node("strong","",x.reference+" · "+(x.document_type==="quote"?"Devis":"Facture")),node("div","",x.title+" · "+money(x.amount)),node("div","lead-meta",x.issue_date+" · "+x.status+(x.due_date?" · échéance "+x.due_date:"")));const pdf=node("button","button button-quiet","Imprimer / PDF");pdf.type="button";pdf.addEventListener("click",ev=>{ev.stopPropagation();const w=window.open("","_blank");if(!w){feedback("load-message","Autorisez les fenêtres pop-up pour générer le PDF.",true);return;}const typ=x.document_type==="quote"?"DEVIS":"FACTURE";w.document.write("<!doctype html><html lang=fr><meta charset=utf-8><title>"+escapeHtml(typ+" "+x.reference)+"</title><style>body{font:14px Arial;color:#172033;margin:40px}header{border-bottom:3px solid #172033;padding-bottom:20px}h1{font-size:28px;letter-spacing:2px}section{margin:28px 0}.line{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding:15px 0}.total{font-size:22px;font-weight:bold;text-align:right;margin-top:25px}.muted{color:#667085;font-size:12px}@media print{body{margin:15mm}}</style><header><h1>"+typ+"</h1><strong>"+escapeHtml(x.reference)+"</strong><p>"+escapeHtml(x.issue_date)+"</p></header><section><h3>Client</h3><strong>"+escapeHtml(c.name)+"</strong><p>"+escapeHtml(c.organization||"")+"</p><p>"+escapeHtml(c.email||"")+"</p><p>"+escapeHtml(c.phone||"")+"</p></section><section><h3>Objet</h3><div class=line><span>"+escapeHtml(x.title)+"</span><strong>"+money(x.amount)+"</strong></div><div class=total>Total : "+money(x.amount)+"</div></section><p>"+(x.due_date?"Échéance : "+escapeHtml(x.due_date):"")+"</p><p>"+escapeHtml(x.notes||"")+"</p><footer class=muted>Document généré depuis PORFOLIO CRM. Compléter les mentions légales et fiscales obligatoires avant émission officielle.</footer><script>window.onload=()=>window.print()<\\/script></html>");w.document.close();});it.append(pdf);dl.append(it);});if(!jj.data?.length)dl.textContent="Aucun document";loaded=true;}catch(err){dl.textContent=err.message||"Erreur";}};
  docs.addEventListener("toggle",()=>{if(docs.open&&!loaded)loadDocuments();});
  db.addEventListener("click",async()=>{db.disabled=true;try{const {data:{session}}=await client.auth.getSession();const rr=await fetch(cfg.supabaseUrl+"/functions/v1/admin-leads",{method:"POST",headers:{Authorization:"Bearer "+session.access_token,apikey:cfg.supabaseAnonKey,"Content-Type":"application/json"},body:JSON.stringify({action:"create_document",client_id:c.id,document_type:dt.value,reference:dr.value,title:dtitle.value,amount:Number(dam.value),status:ds.value,due_date:dd.value||null,notes:dn.value})});const jj=await rr.json();if(!rr.ok)throw new Error(jj.error||"Création impossible");dr.value="";dtitle.value="";dam.value="";dn.value="";feedback("load-message","Devis/facture créé.");loaded=false;await loadDocuments();}catch(err){feedback("load-message",err.message||"Erreur",true);}finally{db.disabled=false;}});
  df.append(dt,dr,dtitle,dam,ds,dd,dn,db);
  const payBox=node("div","payment-panel"),payTitle=node("strong","","Encaissements facture"),payRef=node("input");payRef.placeholder="Référence paiement";payRef.maxLength=255;
  const payAmount=node("input");payAmount.type="number";payAmount.min="0.01";payAmount.step="0.01";payAmount.placeholder="Montant encaissé €";
  const payDate=node("input");payDate.type="date";payDate.value=new Date().toISOString().slice(0,10);
  const payMethod=node("select");[["transfer","Virement"],["sepa","SEPA"],["card","Carte"],["paypal","PayPal"],["check","Chèque"],["cash","Espèces"],["other","Autre"]].forEach(([v,l])=>{const o=node("option","",l);o.value=v;payMethod.append(o);});
  const payBtn=node("button","button button-primary","Enregistrer paiement");payBtn.type="button";
  const payList=node("div","client-history");payBox.append(payTitle,payAmount,payDate,payMethod,payRef,payBtn,payList);payBox.hidden=true;
  const loadPayments=async docId=>{payList.textContent="Chargement encaissements…";try{const {data:{session}}=await client.auth.getSession();const rr=await fetch(cfg.supabaseUrl+"/functions/v1/admin-leads?payments=1&document_id="+encodeURIComponent(docId),{headers:{Authorization:"Bearer "+session.access_token,apikey:cfg.supabaseAnonKey}});const jj=await rr.json();if(!rr.ok)throw new Error(jj.error||"Paiements indisponibles");payList.replaceChildren();(jj.data||[]).forEach(p=>payList.append(node("div","client-history-item",p.payment_date+" · "+money(p.amount)+" · "+p.payment_method+(p.reference?" · "+p.reference:""))));if(!jj.data?.length)payList.textContent="Aucun encaissement enregistré";}catch(e){payList.textContent=e.message;}};
  payBtn.addEventListener("click",async()=>{const selected=[...dl.querySelectorAll(".client-history-item")].find(x=>x.dataset.docid);if(!selected){feedback("load-message","Sélectionnez d’abord une facture dans la liste.",true);return;}payBtn.disabled=true;try{const {data:{session}}=await client.auth.getSession();const rr=await fetch(cfg.supabaseUrl+"/functions/v1/admin-leads",{method:"POST",headers:{Authorization:"Bearer "+session.access_token,apikey:cfg.supabaseAnonKey,"Content-Type":"application/json"},body:JSON.stringify({action:"create_payment",document_id:selected.dataset.docid,amount:Number(payAmount.value),payment_date:payDate.value,payment_method:payMethod.value,reference:payRef.value})});const jj=await rr.json();if(!rr.ok)throw new Error(jj.error||"Paiement refusé");payAmount.value="";payRef.value="";feedback("load-message","Paiement enregistré · reste à encaisser : "+money(jj.remaining));await loadPayments(selected.dataset.docid);loaded=false;await loadDocuments();}catch(e){feedback("load-message",e.message,true);}finally{payBtn.disabled=false;}});
  df.append(payBox);docs.append(df,dl,payBox);
  const printBtn=node("button","button button-quiet","PDF / Imprimer");printBtn.type="button";printBtn.addEventListener("click",()=>{const w=window.open("","_blank");if(!w){feedback("load-message","Autorisez les fenêtres pop-up pour générer le PDF.",true);return;}const rows=[...dl.querySelectorAll(".client-history-item")].map(x=>x.innerText);w.document.write("<!doctype html><html lang='fr'><meta charset='utf-8'><title>Documents "+escapeHtml(c.name)+"</title><style>body{font:14px Arial;margin:35px;color:#222}h1{font-size:22px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px;text-align:left}button{display:none}@media print{body{margin:12mm}}</style><h1>Documents commerciaux — "+escapeHtml(c.name||"Client")+"</h1><p>"+escapeHtml(c.organization||"")+" · "+escapeHtml(c.email||"")+"</p><table><tr><th>Référence</th><th>Type</th><th>Objet</th><th>Montant</th><th>Statut</th></tr>"+rows.map(x=>"<tr><td>"+escapeHtml(x)+"</td></tr>").join("")+"</table><script>window.onload=()=>window.print()<\\/script></html>");w.document.close();});
  docs.append(printBtn);card.append(docs);root.append(card);
 });
}
async function addClientManually(button){
 button.disabled=true;
 try{const {data:{session}}=await client.auth.getSession();if(!session)throw new Error("Session expirée.");
 const res=await fetch(cfg.supabaseUrl+"/functions/v1/admin-leads",{method:"POST",headers:{Authorization:"Bearer "+session.access_token,apikey:cfg.supabaseAnonKey,"Content-Type":"application/json"},body:JSON.stringify({action:"create_client",name:"Nouveau client"})});
 const body=await res.json();if(!res.ok)throw new Error(body.error||"Création impossible.");await loadLeads();
 }catch(e){feedback("load-message",e.message||"Erreur réseau.",true);}finally{button.disabled=false;}
}
async function updateClient(id,patch,button){
 button.disabled=true;
 try{const {data:{session}}=await client.auth.getSession();if(!session)throw new Error("Session expirée.");
 const res=await fetch(cfg.supabaseUrl+"/functions/v1/admin-leads",{method:"PATCH",headers:{Authorization:"Bearer "+session.access_token,apikey:cfg.supabaseAnonKey,"Content-Type":"application/json"},body:JSON.stringify({action:"update_client",client_id:id,...patch})});
 const body=await res.json();if(!res.ok)throw new Error(body.error||"Modification impossible.");
 feedback("load-message","Fiche client enregistrée.");await loadLeads();
 }catch(e){feedback("load-message",e.message||"Erreur réseau.",true);button.disabled=false;}
