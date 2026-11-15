# PORFOLIO — CRM privé (leads)

## Architecture de sécurité

- `contact_leads` : RLS activée, aucune lecture/écriture accordée à `anon` ou `authenticated`. Le rôle `service_role` est seul à accéder aux données.
- `submit-lead` : endpoint public POST, validation serveur, consentement obligatoire, honeypot anti-bot.
- `admin-leads` : endpoints GET/PATCH protégés par un JWT Supabase valide et une allowlist d'adresses e-mail administrateur. Le service role reste exclusivement dans les Edge Functions.
- Ne jamais placer `SUPABASE_SERVICE_ROLE_KEY` dans le HTML, le JavaScript navigateur, GitHub ou Netlify.

## Configuration des secrets Edge Functions

Dans Supabase > Project Settings > Edge Functions / Secrets, configurer :

- `PORTFOLIO_ALLOWED_ORIGIN` : origine exacte du site, par exemple `https://portfolio.example.fr` (sans slash final).
- `PORTFOLIO_ADMIN_EMAILS` : e-mails autorisés séparés par des virgules (ex. `contact@emmaplus.fr`).
- Les variables système `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` sont fournies par Supabase.

## Déploiement

Depuis le dossier du dépôt, avec Supabase CLI lié au projet PORFOLIO :

```bash
supabase functions deploy submit-lead --no-verify-jwt
supabase functions deploy admin-leads
```

Le contrôle JWT de `admin-leads` est effectué dans le code avec `auth.getUser()`; la fonction doit rester compatible avec l'envoi du bearer token. L'endpoint public `submit-lead` utilise `--no-verify-jwt`.

## API admin

- `GET /functions/v1/admin-leads?page=0&size=25&status=new` : liste paginée (maximum 100).
- `PATCH /functions/v1/admin-leads` JSON : `{"id":"<uuid>","status":"in_progress"}`.
- Statuts : `new`, `in_progress`, `qualified`, `closed`, `spam`.
- Requiert `Authorization: Bearer <access_token Supabase Auth>` d'un compte dont l'e-mail figure dans `PORTFOLIO_ADMIN_EMAILS`.

## État actuel (15 novembre 2026)

- Projet Supabase PORFOLIO actif en région `eu-west-3`.
- Table `contact_leads` créée, RLS activée et aucun accès direct anon/authenticated.
- Edge Functions `submit-lead` et `admin-leads` déployées.
- Interface `admin.html` versionnée sur `feature/portfolio-2.0`.
- Restent à faire : compte admin Auth, secrets allowlist/origine, publication Netlify et tests E2E.

## Contrôles avant mise en production

1. Restreindre CORS à l'origine Netlify / domaine final.
2. Vérifier que les secrets ne sont jamais exposés au client.
3. Créer le compte Supabase Auth administrateur et l'inscrire dans l'allowlist.
4. Tester refus sans token, refus d'un utilisateur non autorisé, pagination, filtres et mise à jour de statut.
5. Tester l'envoi du formulaire (validation, consentement, honeypot, erreurs réseau).
6. Ne pas considérer le CRM comme opérationnel avant ces tests.
