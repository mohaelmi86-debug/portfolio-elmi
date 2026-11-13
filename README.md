# Portfolio — El-Mihdhoir MOHAMED ALI

Portfolio statique et dynamique, géré par GitHub. Le site charge ses contenus à partir de fichiers XML versionnés.

## Architecture

```
/
├── index.html
├── styles.css
├── app.js
├── netlify.toml
├── .github/workflows/validate.yml
└── data/
    ├── profile.xml
    ├── projects.xml
    ├── skills.xml
    └── journey.xml
```

## Fonctionnalités

- Chargement des contenus XML dans le navigateur via `fetch` et `DOMParser`.
- Catalogue des projets généré dynamiquement depuis `data/projects.xml`.
- Recherche textuelle et filtres par catégorie.
- Sélection des projets à afficher, mémorisée dans le navigateur.
- Fiches projet détaillées : besoin, fonctionnalités, technologies, modèle économique et prochaines étapes.
- Compétences, parcours et formations chargés depuis leurs propres fichiers XML.
- Interface responsive, navigation mobile et fiches modales.
- Formulaire de manifestation d’intérêt : prépare un e-mail lorsque l’adresse de réception est renseignée dans `data/profile.xml`.

## Modifier le portfolio

Modifier le fichier XML concerné dans `data/`, en respectant les balises existantes, puis commit/push sur `main`.

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

GitHub Actions contrôle la syntaxe JavaScript et la validité des fichiers XML à chaque push et pull request.

## Déploiement Netlify

Le fichier `netlify.toml` configure la publication de la racine (`.`) sans commande de build.

Le site Netlify existant `neon-madeleine-137c76` a un dernier déploiement manuel (source `drop`, sans commit Git). Pour que chaque commit GitHub mette automatiquement le site à jour, relier ce dépôt depuis Netlify :
**Project configuration → Developer settings → Continuous deployment → Repository → Link repository**, puis choisir `mohaelmi86-debug/portfolio-elmi`, branche `main`.

Tant que ce lien n'est pas établi, les changements sont bien présents dans GitHub mais pas encore publiés sur le site public.

## À finaliser avant diffusion

- Ajouter l'adresse e-mail réelle dans `data/profile.xml` (balise `<email>`).
- Compléter les URL professionnelles dans `<socials>`.
- Vérifier les statuts et descriptions des projets avant chaque présentation publique.
