# Registre des clients

Application interne pour recenser des clients et consulter la liste des
clients enregistrés, avec export PDF. Backend Node.js / Express, base de
données **PostgreSQL**.

## Fonctionnalités

- **Nouveau client** (`/clients`) : formulaire d'enregistrement (nom,
  prénom, téléphone, email facultatif, adresse facultative).
- **Liste des clients** (`/clients/liste`) : tableau des clients recensés,
  recherche par nom/prénom/téléphone, pagination.
- **Modifier un client** (`/clients/:id/modifier`) : depuis la liste, un
  lien « Modifier » ouvre le formulaire pré-rempli.
- **Supprimer un client** (`/clients/:id/supprimer`) : depuis la liste, un
  lien « Supprimer » demande une confirmation avant l'envoi (irréversible).
- **Export PDF** (`/clients/liste/pdf`) : télécharge la liste (filtrée si
  une recherche est active) en PDF.
- **Mon compte** (`/mon-compte`) : l'administrateur connecté peut changer
  son mot de passe (l'ancien mot de passe est requis pour confirmer).
- **Connexion protégée par mot de passe** : tout le site est derrière une
  page de connexion ; aucune donnée client n'est accessible sans session
  authentifiée.

## Installation en local

Prérequis : Node.js 18+ et un PostgreSQL accessible (local ou distant).

```bash
npm install
cp .env.example .env
```

Ouvrez `.env` et renseignez au minimum :
1. `DATABASE_URL` : la chaîne de connexion vers votre PostgreSQL.
2. `SESSION_SECRET` : une valeur aléatoire longue, par exemple :
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

Créez ensuite le compte administrateur (aucun identifiant par défaut
n'existe dans le projet, volontairement) :

```bash
npm run create-admin
```

Démarrez l'application (elle crée les tables toute seule si besoin) :

```bash
npm start
```

Puis ouvrez `http://localhost:3000`.

## Déploiement sur Render

1. **Créez une base PostgreSQL** sur Render (New -> PostgreSQL), si ce
   n'est pas déjà fait.
2. Sur le **service web**, dans l'onglet *Environment*, définissez :
   - `NODE_ENV=production`
   - `SESSION_SECRET` (valeur aléatoire longue, voir ci-dessus)
   - `SESSION_COOKIE_NAME=recensement.sid` (optionnel)
   - `COOKIE_SECURE=true` (Render sert toujours en HTTPS, donc c'est correct)
   - `DATABASE_URL` : copiez l'**Internal Database URL** de votre base
     Render (si le site est sur Render aussi — plus rapide et gratuit ;
     sinon utilisez l'External Database URL).
3. Déployez. Au démarrage, l'application crée automatiquement les tables
   `users`, `clients` et `session` si elles n'existent pas encore — rien
   à migrer manuellement.
4. **Créez le compte administrateur.** Deux options :
   - **Avec un accès Shell** (disponible sur certains plans Render) :
     ouvrez le Shell du service et lancez `npm run create-admin`.
   - **Sans accès Shell** (plan sans Shell) : ajoutez temporairement la
     variable `ADMIN_BOOTSTRAP_SECRET` (voir `.env.example` pour la
     générer), redéployez, puis ouvrez :
     `https://votre-site.onrender.com/amorcage-admin?jeton=VOTRE_SECRET`
     Cette page ne fonctionne qu'une seule fois (tant qu'aucun compte
     n'existe) et se désactive d'elle-même ensuite. **Retirez la variable
     `ADMIN_BOOTSTRAP_SECRET` juste après** avoir créé le compte.

### « Je n'arrive plus à me connecter » sur un hébergeur comme Render

La cause la plus fréquente : la base de données utilisée par
l'application a changé (ou a été réinitialisée) après que le compte
administrateur a été créé — par exemple si l'app tournait auparavant sur
une base SQLite en fichier local, qui est effacée à chaque redéploiement
sur la plupart des hébergeurs (systèmes de fichiers éphémères). Le compte
existait, puis a disparu. Avec PostgreSQL (une base durable, externe au
service web), ce problème ne se reproduit plus : recréez simplement un
compte avec `npm run create-admin` (ou `/amorcage-admin`) une bonne fois,
il persistera aux redéploiements.

Autre cause possible : `COOKIE_SECURE=true` alors que le site n'est pas
réellement servi en HTTPS de bout en bout — le navigateur refuse alors
d'enregistrer le cookie de session, et la connexion semble échouer en
boucle. Sur Render, le HTTPS est automatique pour tout service web, donc
ce n'est normalement pas un problème là-bas ; mais vérifiez ce point si
vous déployez ailleurs.

## Sécurité mise en place

Ce projet applique plusieurs couches de protection, plutôt qu'une seule :

- **Mots de passe** : hachés avec bcrypt (coût 12, via `bcryptjs`), jamais
  stockés ni journalisés en clair. Comparaison à temps constant pour
  limiter les attaques par mesure de latence.
- **Sessions** : cookie de session `httpOnly`, `sameSite=lax`, signé par
  un secret serveur, stocké côté serveur dans PostgreSQL (`connect-pg-simple`)
  — donc persistant aux redémarrages et compatible avec plusieurs instances.
  La session est régénérée à la connexion (protection contre la fixation
  de session).
- **CSRF** : chaque formulaire embarque un jeton lié à la session, vérifié
  à chaque requête qui modifie l'état (POST). Sans ce jeton, la requête
  est rejetée.
- **Injection SQL** : impossible par construction — toutes les requêtes
  passent par des requêtes préparées avec paramètres liés (`pg`), aucune
  concaténation de chaînes SQL.
- **XSS** : les vues EJS échappent automatiquement toute donnée affichée
  (`<%= %>`). Aucune donnée utilisateur n'est insérée en HTML brut.
- **En-têtes de sécurité HTTP** : `helmet` + une politique CSP stricte qui
  n'autorise que les ressources du propre domaine du site (aucun script
  ou style externe).
- **Brute force** : les tentatives de connexion sont limitées (8 essais /
  15 minutes / IP). L'amorçage admin (voir plus bas) est limité à 5
  essais / 15 minutes / IP.
- **Validation stricte des entrées** : formats vérifiés côté serveur pour
  chaque champ (nom, téléphone, email...), avec des limites de longueur.
- **Aucun identifiant par défaut** : le compte administrateur doit être
  créé explicitement (`npm run create-admin` ou `/amorcage-admin`).
- **Changement de mot de passe** : possible uniquement en reconfirmant le
  mot de passe actuel.
- **Amorçage admin protégé** : la page `/amorcage-admin` est invisible
  (404) tant que `ADMIN_BOOTSTRAP_SECRET` n'est pas définie, et se
  désactive automatiquement dès qu'un compte existe — impossible de
  l'utiliser pour créer un deuxième compte ou reprendre un compte existant.

### Obligatoire avant une mise en production

1. **Servez le site en HTTPS** (Render le fait automatiquement), puis
   seulement à ce moment-là mettez `COOKIE_SECURE=true`. Sans HTTPS, ne
   mettez jamais `COOKIE_SECURE=true` (le cookie de session ne serait
   alors plus envoyé du tout par le navigateur).
2. Définissez un `SESSION_SECRET` fort et gardez le fichier `.env` hors de
   tout dépôt Git (déjà exclu par `.gitignore`).
3. Retirez `ADMIN_BOOTSTRAP_SECRET` dès que le compte admin est créé.
4. Sauvegardez régulièrement votre base PostgreSQL (Render propose des
   sauvegardes automatiques selon le plan choisi).

### Limites connues (à faire évoluer si le site grandit)

- Un seul rôle utilisateur existe (administrateur). Si plusieurs niveaux
  d'accès sont nécessaires, la table `users` peut être étendue avec un
  champ de rôle.

## Structure du projet

```
src/
  app.js               Point d'entrée : assemble middlewares, vues, routes
  config.js            Lecture centralisée des variables d'environnement
  db.js                 Connexion PostgreSQL (pool) + schéma
  middleware/
    auth.js            Protection des routes par session
    csrf.js            Protection CSRF (jeton par session)
    flash.js           Messages flash (Post/Redirect/Get)
    security.js        Helmet (en-têtes HTTP) + limitation de débit
    validators.js       Règles de validation des formulaires
  routes/
    auth.js            Connexion / déconnexion
    clients.js         Enregistrement, modification, suppression, liste, export PDF
    compte.js          Changement de mot de passe
    amorcage.js        Création du tout premier admin (hébergeurs sans Shell)
  services/
    userService.js     Authentification, création de compte, changement de mot de passe
    clientService.js   Accès aux données clients (CRUD complet)
    pdfService.js       Génération du PDF
scripts/
  createAdmin.js       CLI pour créer/réinitialiser l'administrateur
views/                 Templates EJS
public/                CSS et JS servis tels quels (dont la confirmation de suppression)
```

## Personnaliser les champs du formulaire client

Les champs actuels (nom, prénom, téléphone, email, adresse) sont définis
à trois endroits qu'il faut garder synchronisés :
1. Le schéma SQL dans `src/db.js` (table `clients`).
2. Les règles de validation dans `src/middleware/validators.js`.
3. Le formulaire dans `views/nouveau-client.ejs` et les colonnes du
   tableau dans `views/liste-clients.ejs` (+ colonnes du PDF dans
   `src/services/pdfService.js`).
