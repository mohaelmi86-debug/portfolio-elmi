# PORFOLIO 2.0 — Business Hub

## Vision
Faire évoluer le portfolio professionnel d'Elmi en un hub commercial exploitable : vitrine de compétences, catalogue de services, acquisition de prospects et gestion d'activité. Cette branche prépare la modernisation sans remplacer ni casser la version actuelle.

## État initial vérifié
- Site statique HTML/CSS/JavaScript.
- Données de profil, projets, compétences, parcours et formations chargées depuis `data/*.xml`.
- Filtrage et recherche de projets, fiches détaillées et personnalisation locale de la sélection.
- Formulaire actuel ouvrant un client mail via `mailto:` (pas de stockage serveur).
- Configuration Netlify actuelle : publication de la racine (`publish = "."`).
- Aucun backend CRM, stockage de demandes, gestion de devis/factures ou paiement confirmé dans le code examiné.

## Positionnement
**AI & Digital Product Builder** — conception de produits numériques, SaaS, automatisation IA, applications métier, data et outils professionnels.

Les projets présentés doivent clairement distinguer : idée, prototype, MVP, pilote et produit en production. Ne jamais présenter une maquette comme un produit commercialisé.

## Modules cibles
### Site public
- Accueil premium, parcours, compétences, formations et certifications.
- Portfolio filtrable avec fiches projets : problème, rôle réel, périmètre, fonctionnalités, stack, statut, résultats vérifiables et démonstration.
- Catalogue de services avec périmètre, livrables, délais indicatifs et prix « à partir de » uniquement lorsqu'ils sont validés.
- Formulaire de demande de devis avec consentement et confirmation.
- Témoignages publiés uniquement avec autorisation.
- Blog / ressources et SEO.
- Pages légales, confidentialité, cookies si nécessaires.

### Espace administration
- Authentification et rôles.
- CRUD des projets, services, études de cas et contenus.
- CRM : prospects, organisations, demandes, notes, historique et étapes du pipeline.
- Devis : lignes, TVA selon régime applicable, versions, acceptation et PDF.
- Factures et suivi des règlements, sans se substituer à un logiciel conforme.
- Tableau de bord : visiteurs, demandes, taux de conversion, devis acceptés, encaissements et revenus récurrents.
- Journal d'audit et export des données.

### Espace client
- Accès sécurisé aux projets confiés.
- Jalons, livrables, documents, devis, factures et paiements.
- Messagerie / commentaires dans une phase ultérieure.

## Architecture cible recommandée
- Conserver temporairement le frontend statique puis migrer progressivement vers React + TypeScript si nécessaire.
- Supabase : PostgreSQL, Auth, Storage, Row Level Security et fonctions serveur.
- Stripe Checkout/Billing pour les prestations ou abonnements éligibles, avec webhooks vérifiés côté serveur.
- Netlify pour l'hébergement du frontend et éventuellement les fonctions serverless.
- Aucun secret dans le frontend, les fichiers suivis par Git ou `netlify.toml`. Secrets uniquement dans les variables d'environnement du fournisseur.
- Prévoir export et sauvegarde des données, politique de conservation et contrôle d'accès.

## Modèle de données initial à concevoir
- profiles, organizations, user_roles
- projects, project_media, project_services
- services, service_packages
- leads, lead_events, contact_requests
- quotes, quote_items, quote_events
- invoices, invoice_items, payments
- client_memberships, project_milestones, deliverables
- analytics_events, audit_logs

Toutes les tables contenant des données clients doivent être protégées par RLS et testées avec des utilisateurs de plusieurs organisations. Le modèle multi-tenant est à activer seulement si le produit devient une plateforme multi-professionnels ; le MVP du portfolio personnel peut commencer avec un seul espace propriétaire.

## Roadmap
1. **Fondations & vitrine** : sauvegarde, audit qualité/accessibilité/mobile/SEO, nettoyage des contenus, design system, pages services et études de cas.
2. **Acquisition** : formulaire serveur, anti-spam, consentement, notifications, CRM prospects et pipeline.
3. **Commercial** : générateur de devis, acceptation, facturation et paiement sécurisé.
4. **Pilotage** : analytics, conversion, suivi des revenus et exports.
5. **SaaS multi-profils** : onboarding, abonnements, espaces isolés, rôles et marketplace — seulement après validation de la demande.

## Critères de validation avant production
- Build et vérifications automatiques réussis.
- Aucune clé secrète commise dans Git.
- Tests mobile, clavier, lecteur d'écran, formulaires et erreurs réseau.
- Tests RLS démontrant qu'un client ne peut lire/modifier les données d'un autre.
- Webhooks de paiement authentifiés, idempotents et testés en mode test.
- Devis, TVA, factures et mentions légales validés selon le statut réel de l'activité.
- Sauvegarde/restauration testée et procédure de suppression/export des données définie.

## Décisions à ne pas figer prématurément
- Nom de marque final et domaine.
- Tarification définitive des services.
- Statut juridique et régime de TVA.
- Ouverture d'une marketplace à d'autres professionnels.
- Hébergeur de données et périmètre des fonctions backend.
