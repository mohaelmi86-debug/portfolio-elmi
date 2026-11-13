# Portfolio — El-Mihdhoir MOHAMED ALI

Site vitrine professionnel à déploiement statique, dont le contenu est piloté par des fichiers de données versionnés dans GitHub.

## Architecture du projet

```
/
├── index.html          # Structure des pages et composants
├── styles.css          # Design responsive et composants visuels
├── app.js              # Rendu dynamique et interactions
└── data/
    ├── profile.json    # Identité, texte de présentation, réseaux et e-mail
    ├── projects.json   # Catalogue complet des projets et fiches détaillées
    ├── skills.json     # Compétences par domaine
    └── journey.json    # Étapes du parcours
```

## Fonctionnalités dynamiques

- Chargement du profil, des projets, compétences et étapes depuis les fichiers JSON.
- Recherche de projets et filtres par catégorie.
- Sélecteur de projets affichés ; la sélection est mémorisée dans le navigateur.
- Fiches détaillées par projet : besoin, fonctionnalités, technologies, modèle économique et prochaines étapes.
- Formulaire de manifestation d’intérêt préparant un e-mail à envoyer depuis le logiciel de messagerie de l'utilisateur.
- Navigation responsive et prise en charge de la préférence de réduction des animations.

## Modifier le portfolio

1. Modifier le fichier JSON pertinent dans `data/`.
2. Vérifier que le JSON est valide.
3. Commit et push sur la branche `main`.
4. Lorsque Netlify est relié au dépôt GitHub, le site se reconstruit automatiquement.

Aucune compilation n'est nécessaire : le site est servi directement depuis la racine du dépôt.

## Déploiement Netlify

- Build command : vide
- Publish directory : `.` (racine)
- Branch : `main`

Le site Netlify existant identifié est `neon-madeleine-137c76`. Vérifier dans Netlify que la source de déploiement est bien le dépôt `mohaelmi86-debug/portfolio-elmi`. Le dernier déploiement actuellement visible est un déploiement antérieur à cette refonte ; le présent commit GitHub n'est donc pas considéré comme publié tant qu'un nouveau déploiement Netlify n'est pas confirmé.

## À finaliser avant diffusion publique

- Remplacer l'adresse temporaire `contact@elmi-portfolio.fr` par l'adresse de contact réelle.
- Remplacer les liens LinkedIn et Notion génériques par les profils exacts.
- Réviser régulièrement les statuts et descriptions de projets pour refléter leur avancement réel.
- Faire vérifier le contenu personnel, les références et les informations de chaque projet avant diffusion.
