# Maison Créange : nouveau site vitrine

Site statique (HTML, CSS, JavaScript), sans bibliothèque externe.
Aucun service externe n'est chargé sans action du visiteur : polices auto-hébergées, carte Google Maps soumise à consentement.

## Arborescence

```
site/                      ← dossier à mettre en ligne tel quel (racine du domaine)
  index.html               Accueil
  a-propos-de-nous/        À propos de nous   (mêmes URL que l'ancien site)
  contactez-nous/          Contactez-nous
  avis-juridique/          Avis juridique
  404.html
  assets/css/main.css      styles (palette et typographies en variables CSS)
  assets/js/main.js        en-tête, menu mobile, apparitions au défilement, formulaire, carte
  assets/img/              photos du site actuel, en WebP + JPEG (640 / 1100 / 1600 px)
                           cut-*.webp : produits détourés (transparence) · detail-*.webp : gros plans
  assets/img/photos/       photos du shooting (P01.jpg…), qui remplacent les cadres vides
  assets/fonts/            Cormorant Garamond + Manrope (woff2)
src/                       ← sources des pages (en-tête, pied de page et formulaire partagés)
build.mjs                  assemble src/ → site/
```

## Modifier une page

1. Éditer le fichier dans `src/pages/` ou `src/partials/`.
2. `node build.mjs` (Node 18 ou plus récent).
3. Les CSS/JS se modifient directement dans `site/assets/`.

Les produits détourés s'insèrent avec `{{cut name="cut-chemise" alt="…" sizes="…"}}`.

Les photos s'insèrent avec `{{img name="facade-boutique" alt="…" sizes="…"}}` ; le script génère le `<picture>` WebP/JPEG responsive avec lazy loading.

## Prévisualiser

```
cd site
python -m http.server 8080      # ou : npx serve .
```
puis ouvrir http://localhost:8080. On peut aussi double-cliquer sur site/index.html (le formulaire ne s'envoie alors pas, faute de serveur).

## Formulaire de contact : à activer une fois

Le formulaire envoie réellement le message par courriel via **FormSubmit** (https://formsubmit.co), sans serveur à gérer.

- Au **premier envoi**, FormSubmit envoie un courriel d'activation à `creangeexclusif@hotmail.fr`. Il faut cliquer sur le lien une seule fois ; tant que ce n'est pas fait, le site affiche le message d'erreur (jamais de fausse confirmation).
- Pour utiliser un autre service (Web3Forms, Formspree, un script PHP chez l'hébergeur…), changer l'attribut `action` du formulaire dans `src/partials/contact-block.html`. Le script considère l'envoi réussi uniquement si la réponse est HTTP 2xx avec `"success": true`.
- Champs : Nom (obligatoire), Courriel (obligatoire, ajouté pour pouvoir répondre), Téléphone (facultatif), Message, case de consentement (obligatoire, texte d'origine conservé). Un champ piège anti-robots est inclus.

## Direction artistique

- Site éditorial, sobre : peu de texte, grandes photos, beaucoup d'espace, apparitions douces au défilement (aucune bibliothèque d'animation).
- Palette « lin et tabac » (variables en tête de main.css) : espresso #17120F, tabac #261D17, lin #EDE7DD, craie #F6F2EB (texte sur fond sombre), encre #1D1915 (texte sur fond clair), cognac #A85F30 (accent). Aucune couleur froide : les costumes bleus sont la seule tache de bleu de la page, ce qui les met en valeur.
- Les sections alternent fond sombre (`t-dark`, `t-tabac`) et fond clair (`t-light`, `t-lin2`) ; chaque classe de thème fixe ses propres couleurs de texte, de filet et d'accent.
- Typographies : Cormorant Garamond (titres) et Manrope (texte), auto-hébergées.

## Photos : cadres vides et liste de prises de vue

- Les emplacements sans photo satisfaisante sont des cadres vides numérotés : `{{ph id="P01" ratio="4/5" title="…" brief="…"}}` dans `src/pages/`.
- `node build.mjs` génère `PHOTOS-A-REALISER.md` : la liste de toutes les photos à prendre, avec format, page et description.
- Pour remplacer un cadre : déposer `P01.jpg` (ou `.webp`) dans `site/assets/img/photos/` puis relancer `node build.mjs`. Le cadre devient automatiquement la photo.
- Photos existantes conservées (gros plans cohérents) : `{{pic src="atelier-gilet.webp" ratio="1/1" alt="…"}}`.

## Pages

Accueil · Collections (`/collections/`) · Cérémonie (`/ceremonie/`) · La maison (`/a-propos-de-nous/`) · Contact et rendez-vous (`/contactez-nous/`) · Avis juridique. Le lien `?sujet=ceremonie` (ou `rendez-vous`, `retouche`) pré-remplit le type de demande du formulaire.

## Accessibilité et performance

- `prefers-reduced-motion` : aucune animation, tout le contenu est visible immédiatement.
- Navigation clavier, lien d'évitement, focus visible, menu mobile avec Échap et focus piégé.
- Sans JavaScript, toutes les pages restent lisibles et complètes.
- Données structurées `ClothingStore` (schema.org), balises Open Graph, `sitemap.xml`, `robots.txt`.
