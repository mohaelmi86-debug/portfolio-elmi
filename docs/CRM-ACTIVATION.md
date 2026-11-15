# Activation du CRM PORFOLIO

Le CRM est préparé dans `admin.html`, `admin.js`, `admin.css`. L'API `admin-leads` est déployée dans Supabase.

## 1. Créer le compte administrateur

Dans Supabase > Authentication > Users > Add user :
- Email : adresse d'administration (ex. contact@emmaplus.fr)
- définir un mot de passe fort
- confirmer l'utilisateur si l'option est proposée.

## 2. Autoriser l'administrateur dans l'Edge Function

Dans Supabase > Edge Functions > Secrets (ou Project Settings > Secrets), ajouter :

- `PORTFOLIO_ADMIN_EMAILS=contact@emmaplus.fr`
- `PORTFOLIO_ALLOWED_ORIGIN=https://VOTRE-DOMAINE-PORTFOLIO`

Ne pas utiliser `*` en production. Si Netlify utilise encore son sous-domaine, saisir son URL exacte.

Les variables standard `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` sont injectées par Supabase.

## 3. Accéder au CRM

Ouvrir `/admin.html` sur le site déployé, puis se connecter avec l'utilisateur Auth créé à l'étape 1.

## 4. Vérification sécurité

- `admin-leads` a `verify_jwt=false`, car il vérifie lui-même le JWT via `auth.getUser()` et applique l'allowlist avant toute opération service_role.
- `submit-lead` est public par conception ; validation, consentement et honeypot sont côté serveur.
- La clé `anon` de `admin-config.js` est une clé publique, jamais une clé service_role.
- La table `contact_leads` conserve RLS et aucun accès direct client : les opérations CRM passent par la fonction protégée.
- Ne jamais communiquer ou committer la clé `service_role`.

## État

Déployé : `submit-lead`, `admin-leads`.
À configurer manuellement : compte Auth, allowlist e-mail et origine CORS.
Tests end-to-end à effectuer avant usage réel.
