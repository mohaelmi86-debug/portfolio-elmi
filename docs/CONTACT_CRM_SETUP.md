# PORFOLIO 2.0 — Capture de demandes & CRM

## Principe de sécurité
- Les demandes de contact/devis sont enregistrées par une Edge Function serveur, jamais par une insertion directe depuis le navigateur.
- La table `public.contact_leads` est protégée par RLS et n'accorde aucun accès à `anon` ou `authenticated`.
- La clé `service_role` reste exclusivement côté serveur (secret Netlify/Supabase), jamais dans le HTML, JavaScript client ou Git.
- L'Edge Function devra valider les champs, limiter la taille du message, normaliser l'e-mail, appliquer un rate-limit/anti-spam et journaliser sans exposer les données personnelles.
- L'administration CRM nécessitera authentification et autorisation explicite (rôle admin), plus des politiques RLS propres.

## Migration
La migration `supabase/migrations/202611150001_contact_leads.sql` crée la boîte de réception privée des demandes, les statuts CRM et les index de suivi.

## Schéma fonctionnel
- Contact : nom, e-mail, organisation facultative, type de demande, service/projet, budget, délai, message et consentement.
- CRM : statuts `new`, `qualified`, `in_progress`, `closed`, `spam`, attribution et notes internes.
- Conservation : définir une durée de conservation et un processus de purge avant la mise en production (RGPD).
- Consentement : ne collecter que les données nécessaires à la réponse, afficher une information de confidentialité et conserver la date du consentement.

## Prochaine configuration
1. Le projet Supabase PORFOLIO est créé (région UE eu-west-3) et les Edge Functions `submit-lead` et `admin-leads` sont déployées.
2. La table `contact_leads` et sa politique RLS restrictive sont déjà en place.
3. Créer le compte Auth administrateur, puis renseigner `PORTFOLIO_ADMIN_EMAILS` et `PORTFOLIO_ALLOWED_ORIGIN` dans les secrets Edge Functions.
4. Publier le site sur Netlify et effectuer les tests navigateur/E2E avant ouverture.
