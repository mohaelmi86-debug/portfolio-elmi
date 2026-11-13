(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { profile: null, projects: [], skills: [], journey: [], trainings: [], category: "Tous", query: "", visible: new Set() };
  const storageKey = "portfolio-elmi-visible-projects-v1";
  const icons = { Finance:"▥", Lecture:"▣", Industrie:"⚙", Éducation:"✦", Commerce:"◇", Laboratoire:"⌕", Santé:"✚", Fintech:"◈", Impact:"♻", Construction:"⌂", Data:"⌗", Innovation:"✧" };

  async function loadXML(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error("Impossible de charger " + path + " (" + response.status + ")");
    const source = await response.text();
    const documentXML = new DOMParser().parseFromString(source, "application/xml");
    if (documentXML.querySelector("parsererror")) throw new Error("XML invalide : " + path);
    return documentXML;
  }
  const xmlText = (root, selector) => root.querySelector(selector)?.textContent.trim() || "";
  const xmlItems = (root, selector) => [...root.querySelectorAll(selector)].map(item => item.textContent.trim());
  function parseProfile(xml) {
    const root = xml.documentElement;
    return {
      name: xmlText(root, "name"), shortName: xmlText(root, "shortName"),
      headline: xmlText(root, "headline"), intro: xmlText(root, "intro"),
      location: xmlText(root, "location"), email: xmlText(root, "email"),
      approach: xmlText(root, "approach"), highlights: xmlItems(root, "highlights > item"),
      socials: [...root.querySelectorAll("socials > social")].map(s => ({
        label: xmlText(s, "label"), url: xmlText(s, "url")
      }))
    };
  }
  function parseProjects(xml) {
    return [...xml.querySelectorAll("projects > project")].map(p => ({
      id: p.getAttribute("id") || "", name: xmlText(p, "name"),
      category: xmlText(p, "category"), status: xmlText(p, "status"),
      description: xmlText(p, "description"), lead: xmlText(p, "lead"),
      problem: xmlText(p, "problem"), features: xmlItems(p, "features > item"),
      tech: xmlItems(p, "technologies > item"), business: xmlText(p, "businessModel"),
      next: xmlText(p, "nextSteps"), tags: xmlItems(p, "tags > item")
    }));
  }
  function parseSkills(xml) {
    return [...xml.querySelectorAll("skill-groups > group")].map(group => ({
      group: xmlText(group, "name"), items: xmlItems(group, "items > item")
    }));
  }
  function parseTrainings(xml) {
    return [...xml.querySelectorAll("formations > formation")].map(item => ({
      id: item.getAttribute("id") || "",
      name: xmlText(item, "name"),
      type: xmlText(item, "type"),
      status: xmlText(item, "status"),
      period: xmlText(item, "period"),
      description: xmlText(item, "description")
    }));
  }
  function parseJourney(xml) {
    return [...xml.querySelectorAll("journey > step")].map(step => ({
      title: xmlText(step, "title"), date: xmlText(step, "date"),
      description: xmlText(step, "description")
    }));
  }
  const node = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  function safeSavedSelection() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (Array.isArray(saved)) {
        state.visible = new Set(saved);
        return;
      }
    } catch (_) { /* Utilise la sélection par défaut */ }
    state.visible = new Set(state.projects.map(p => p.id));
  }
  function iconFor(project) {
    const cat = String(project.category || "").split(/[·–-]/)[0].trim();
    return icons[cat] || "✦";
  }
  function categoryName(project) {
    return String(project.category || "Autres").split(/[·–-]/)[0].trim();
  }
  function renderProfile() {
    const p = state.profile;
    $("#hero-headline").textContent = p.headline || "Concepteur de solutions numériques & IA";
    $("#hero-intro").textContent = p.intro || "";
    $("#profile-approach").textContent = p.approach || "";
    const highlights = $("#profile-highlights");
    highlights.replaceChildren();
    (p.highlights || []).forEach(item => {
      const row = node("div", "highlight-item");
      row.append(node("b", "", "✓"), node("span", "", item));
      highlights.append(row);
    });
    const emailLink = $("#email-link");
    if (p.email) {
      emailLink.href = "mailto:" + p.email;
      emailLink.textContent = "Écrire un message ↗";
    } else {
      emailLink.href = "#investors";
      emailLink.textContent = "Utiliser le formulaire de contact ↗";
    }
    const socials = $("#social-links");
    socials.replaceChildren();
    (p.socials || []).forEach(s => {
      const a = node("a", "", s.label + " ↗");
      a.href = s.url; a.target = "_blank"; a.rel = "noopener noreferrer";
      socials.append(a);
    });
    document.title = (p.name || "Portfolio") + " — Portfolio";
  }
  function renderSkills() {
    const grid = $("#skills-grid");
    grid.replaceChildren();
    state.skills.forEach(group => {
      const card = node("article", "skill-group");
      card.append(node("h3", "", group.group));
      const tags = node("div", "skill-tags");
      (group.items || []).forEach(item => tags.append(node("span", "", item)));
      card.append(tags); grid.append(card);
    });
  }
  function buildFilters() {
    const root = $("#category-filters");
    root.replaceChildren();
    const categories = ["Tous", ...new Set(state.projects.map(categoryName))];
    categories.forEach(category => {
      const button = node("button", "filter-chip", category);
      button.type = "button";
      button.setAttribute("aria-pressed", String(state.category === category));
      button.addEventListener("click", () => {
        state.category = category;
        $$(".filter-chip", root).forEach(b => b.setAttribute("aria-pressed", String(b.textContent === category)));
        renderProjects();
      });
      root.append(button);
    });
  }
  function renderPicker() {
    const root = $("#project-picker");
    root.replaceChildren();
    state.projects.forEach(project => {
      const label = node("label", "project-option");
      const input = document.createElement("input");
      input.type = "checkbox"; input.checked = state.visible.has(project.id);
      input.addEventListener("change", () => {
        if (input.checked) state.visible.add(project.id); else state.visible.delete(project.id);
        persistSelection(); renderProjects(); updateSelectionCount();
      });
      label.append(input, node("span", "", project.name)); root.append(label);
    });
    updateSelectionCount();
  }
  function updateSelectionCount() {
    $("#selection-count").textContent = state.visible.size + " / " + state.projects.length + " projets sélectionnés";
  }
  function persistSelection() {
    try { localStorage.setItem(storageKey, JSON.stringify([...state.visible])); } catch (_) { /* Stockage facultatif */ }
  }
  function renderProjects() {
    const grid = $("#project-grid");
    grid.replaceChildren();
    const query = state.query.trim().toLocaleLowerCase("fr");
    const matches = state.projects.filter(p => {
      const searchable = [p.name, p.category, p.description, p.lead, ...(p.tags || [])].join(" ").toLocaleLowerCase("fr");
      return state.visible.has(p.id) && (state.category === "Tous" || categoryName(p) === state.category) && (!query || searchable.includes(query));
    });
    matches.forEach(project => grid.append(createProjectCard(project)));
    $("#no-projects").hidden = matches.length > 0;
    if (!matches.length) grid.append(node("div", "loading", ""));
  }
  function createProjectCard(project) {
    const card = node("article", "project-card");
    const top = node("div", "card-topline");
    top.append(node("div", "project-icon", iconFor(project)), node("span", "project-category", project.category || "Projet"));
    const title = node("h3", "", project.name);
    const desc = node("p", "", project.description || project.lead || "");
    const tags = node("div", "card-tags");
    (project.tags || []).forEach(tag => tags.append(node("span", "", tag)));
    const bottom = node("div", "card-bottom");
    bottom.append(node("span", "status-text", project.status || "Projet"));
    const button = node("button", "details-button", "Découvrir ↗");
    button.type = "button"; button.addEventListener("click", () => openProject(project));
    bottom.append(button);
    card.append(top, title, desc, tags, bottom);
    return card;
  }
  function detailBlock(title, value) {
    const block = node("section", "modal-block");
    block.append(node("h3", "", title));
    if (Array.isArray(value)) {
      const list = document.createElement("ul");
      value.forEach(item => list.append(node("li", "", item)));
      block.append(list);
    } else block.append(node("p", "", value || "À préciser."));
    return block;
  }
  function openProject(project) {
    $("#modal-status").textContent = project.status || "Projet";
    $("#modal-category").textContent = project.category || "";
    $("#modal-title").textContent = project.name;
    $("#modal-lead").textContent = project.lead || project.description || "";
    const tags = $("#modal-tags"); tags.replaceChildren();
    (project.tags || []).forEach(tag => tags.append(node("span", "", tag)));
    const details = $("#modal-details"); details.replaceChildren();
    details.append(
      detailBlock("Le besoin", project.problem),
      detailBlock("Fonctionnalités", project.features),
      detailBlock("Architecture & technologies", project.tech),
      detailBlock("Modèle économique", project.business),
      detailBlock("Prochaines étapes", project.next)
    );
    $("#project-modal").hidden = false;
    document.body.style.overflow = "hidden";
    $("#modal-close").focus();
  }
  function closeProject() {
    $("#project-modal").hidden = true;
    document.body.style.overflow = "";
  }
  function renderJourney() {
    const root = $("#journey-list"); root.replaceChildren();
    state.journey.forEach((entry, i) => {
      const item = node("article", "journey-item");
      item.append(node("span", "journey-index", "ÉTAPE " + String(i + 1).padStart(2, "0")));
      item.append(node("h3", "", entry.title));
      item.append(node("div", "journey-date", entry.date));
      item.append(node("p", "", entry.description));
      root.append(item);
    });
  }
  function renderTrainings() {
    const root = $("#training-list");
    root.replaceChildren();
    state.trainings.forEach(training => {
      const card = node("article", "training-card");
      const top = node("div", "training-card-top");
      top.append(node("span", "training-icon", "✦"), node("span", "training-status", training.status || "Formation"));
      card.append(top);
      card.append(node("h3", "", training.name));
      if (training.type) card.append(node("div", "training-type", training.type));
      if (training.period) card.append(node("div", "training-period", training.period));
      card.append(node("p", "", training.description));
      root.append(card);
    });
  }
  function populateInvestorProjects() {
    const select = $("#investor-project");
    state.projects.forEach(project => {
      const option = document.createElement("option");
      option.value = project.name; option.textContent = project.name; select.append(option);
    });
  }
  function bindInteractions() {
    $("#project-search").addEventListener("input", event => {
      state.query = event.target.value; renderProjects();
    });
    $("#toggle-customizer").addEventListener("click", () => {
      const panel = $("#customizer-content"), open = panel.hidden;
      panel.hidden = !open;
      $("#toggle-customizer").setAttribute("aria-expanded", String(open));
      $("#toggle-customizer").innerHTML = open ? "Masquer la sélection <span>−</span>" : "Gérer ma sélection <span>＋</span>";
    });
    $("#select-all").addEventListener("click", () => {
      state.visible = new Set(state.projects.map(p => p.id)); persistSelection(); renderPicker(); renderProjects();
    });
    $("#reset-selection").addEventListener("click", () => {
      state.visible = new Set(state.projects.map(p => p.id)); persistSelection(); renderPicker(); renderProjects();
      state.category = "Tous"; buildFilters();
    });
    $("#modal-close").addEventListener("click", closeProject);
    $("#project-modal").addEventListener("click", event => { if (event.target === $("#project-modal")) closeProject(); });
    document.addEventListener("keydown", event => { if (event.key === "Escape" && !$("#project-modal").hidden) closeProject(); });
    $("#mobile-menu").addEventListener("click", () => {
      const menu = $("#mobile-nav"), open = menu.classList.toggle("open");
      $("#mobile-menu").setAttribute("aria-expanded", String(open));
      $("#mobile-menu").textContent = open ? "×" : "☰";
    });
    $$("#mobile-nav a").forEach(a => a.addEventListener("click", () => {
      $("#mobile-nav").classList.remove("open"); $("#mobile-menu").setAttribute("aria-expanded", "false"); $("#mobile-menu").textContent = "☰";
    }));
    $("#investor-form").addEventListener("submit", event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const email = state.profile.email;
      if (!email) {
        $("#investor-result").textContent = "Adresse de réception non configurée. Ajoute ton adresse professionnelle dans data/profile.json pour activer l’envoi de la demande.";
        return;
      }
      const body = [
        "Manifestation d’intérêt — Portfolio El-Mihdhoir MOHAMED ALI", "",
        "Nom / organisation : " + form.get("name"),
        "E-mail : " + form.get("email"),
        "Type : " + form.get("interest"),
        "Projet : " + form.get("project"),
        "Fourchette : " + form.get("amount"),
        "Délai : " + form.get("timing"),
        "Message : " + (form.get("message") || "—")
      ].join("\n");
      $("#investor-result").textContent = "Votre application e-mail va s’ouvrir avec votre demande préremplie. Vérifiez l’adresse destinataire avant l’envoi.";
      window.location.href = "mailto:" + encodeURIComponent(email) + "?subject=" + encodeURIComponent("Intérêt — " + form.get("project")) + "&body=" + encodeURIComponent(body);
    });
  }
  async function init() {
    try {
      const [profileXML, projectsXML, skillsXML, journeyXML, trainingsXML] = await Promise.all([
        loadXML("data/profile.xml"), loadXML("data/projects.xml"), loadXML("data/skills.xml"), loadXML("data/journey.xml"), loadXML("data/formations.xml")
      ]);
      state.profile = parseProfile(profileXML);
      state.projects = parseProjects(projectsXML);
      state.skills = parseSkills(skillsXML);
      state.journey = parseJourney(journeyXML);
      state.trainings = parseTrainings(trainingsXML);
      safeSavedSelection(); renderProfile(); renderSkills(); renderJourney(); renderTrainings(); buildFilters(); renderPicker(); renderProjects(); populateInvestorProjects(); bindInteractions();
      $("#year").textContent = new Date().getFullYear();
    } catch (error) {
      console.error(error);
      $("#project-grid").replaceChildren(node("p", "empty-state", "Le portfolio n’a pas pu charger ses données XML. Vérifie les fichiers du dossier data."));
      $("#no-projects").hidden = true;
    }
  }
  init();
})();