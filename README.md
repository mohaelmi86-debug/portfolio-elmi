# Portfolio — El-Mihdhoir MOHAMED ALI

Portfolio professionnel statique, versionné sur GitHub et publié avec Netlify.

**Site public :** https://elmihdhoirmohamedali.netlify.app/  
**Dépôt :** https://github.com/mohaelmi86-debug/portfolio-elmi

## Positionnement

Product Builder No-Code & IA — conception de produits numériques, automatisation, applications métier et solutions SaaS.

Le portfolio présente également une expérience en laboratoire d’analyses industrielles, amiante, métrologie et qualité.

## Architecture

```
/
├── index.html
├── styles.css
├── app.js
├── favicon.svg
├── _headers
├── robots.txt
├── sitemap.xml
├── netlify.toml
├── .github/workflows/validate.yml
└── data/
    ├── profile.xml
    ├── projects.xml
    ├── skills.xml
    ├── journey.xml
    └── formations.xml
```

## Fonctionnalités

- Contenus de profil, projets, compétences, parcours et formations stockés dans des fichiers XML.
- Recherche plein texte dans les projets, leurs fonctionnalités, technologies et descriptions.
- Filtres par catégorie.
- Fiches projet détaillées dans une fenêtre modale accessible au clavier.
- Navigation mobile et lien d’évitement vers le contenu principal.
- Données structurées Person et métadonnées de partage.
- Gestion de chargement partiel : l’indisponibilité d’un fichier XML ne bloque plus toutes les autres rubriques.
- Le formulaire de collaboration prépare un e-mail via le logiciel de messagerie du visiteur ; il ne transmet pas les données automatiquement.

## Modifier le portfolio

Modifier le fichier XML concerné dans `data/`, en respectant les balises existantes, puis créer un commit sur une branche et ouvrir une Pull Request vers `main`.

Les statuts doivent refléter l’avancement réel : concept, maquette, prototype, pilote ou production. Ne pas présenter une fonctionnalité planifiée comme déjà opérationnelle.

Exemple pour ajouter un projet dans `data/projects.xml` :

```xml
<project id="mon-projet">
  <name>Nom du projet</name>
  <category>Catégorie · Domaine</category>
  <status>État d'avancement</status>
  <description>Description courte</description>
  <lead>Présentation détaillée</lead>
  <problem>Problème résolu</problem>
  <features><item>Fonctionnalité</item></features>
  <technologies><item>Technologie</item></technologies>
  <businessModel>Modèle économique</businessModel>
  <nextSteps>Prochaine étape</nextSteps>
  <tags><item>Tag</item></tags>
</project>
```

## Contrôles qualité

GitHub Actions vérifie la syntaxe JavaScript, le XML des données, l’unicité des identifiants de projets et quelques invariants HTML/SEO à chaque push et Pull Request vers `main`.

## Déploiement

Le projet Netlify de production est `elmihdhoirmohamedali` et publie la racine du dépôt via `netlify.toml`.

Les modifications préparées sur une branche GitHub ne remplacent pas encore le site public. Après validation et fusion dans `main`, Netlify devra publier le commit lorsque le quota de déploiement du compte sera de nouveau disponible.

## Informations publiques

Les coordonnées et liens professionnels sont centralisés dans `data/profile.xml`. Vérifier toute modification avant publication.
