# Registre des clients

Application interne pour recenser des clients et consulter la liste des
clients enregistrés, avec export PDF. Backend Node.js / Express, base de
données SQLite (fichier unique, aucun serveur de BDD à administrer).

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

## Prérequis

**Node.js 22.13 ou plus récent.** Ce projet utilise le module SQLite
intégré à Node.js (`node:sqlite`) plutôt qu'un paquet natif à compiler
(comme `better-sqlite3`), justement pour éviter d'avoir besoin d'installer
Visual Studio / des outils de compilation C++ sur votre machine (une
source fréquente d'échec de `npm install` sous Windows). Vérifiez votre
version avec `node -v`.

## Installation

```bash
npm install
cp .env.example .env
```

Ouvrez `.env` et :
1. Renseignez `SESSION_SECRET` avec une valeur aléatoire longue. Vous
   pouvez en générer une avec :
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
2. En production, mettez `NODE_ENV=production` et `COOKIE_SECURE=true`
   **uniquement si le site est servi en HTTPS** (voir plus bas).

Créez ensuite le compte administrateur (aucun identifiant par défaut
n'existe dans le projet, volontairement) :

```bash
npm run create-admin
```

Démarrez l'application :

```bash
npm start
```

Puis ouvrez `http://localhost:3000`.

## Sécurité mise en place

Ce projet applique plusieurs couches de protection, plutôt qu'une seule :

- **Mots de passe** : hachés avec bcrypt (coût 12, via `bcryptjs`), jamais
  stockés ni journalisés en clair. Comparaison à temps constant pour
  limiter les attaques par mesure de latence.
- **Sessions** : cookie de session `httpOnly`, `sameSite=lax`, signé par
  un secret serveur. La session est régénérée à la connexion (protection
  contre la fixation de session).
- **CSRF** : chaque formulaire embarque un jeton lié à la session, vérifié
  à chaque requête qui modifie l'état (POST). Sans ce jeton, la requête
  est rejetée.
- **Injection SQL** : impossible par construction — toutes les requêtes
  passent par des requêtes préparées avec paramètres liés (`node:sqlite`),
  aucune concaténation de chaînes SQL.
- **XSS** : les vues EJS échappent automatiquement toute donnée affichée
  (`<%= %>`). Aucune donnée utilisateur n'est insérée en HTML brut.
- **En-têtes de sécurité HTTP** : `helmet` + une politique CSP stricte qui
  n'autorise que les ressources du propre domaine du site (aucun script
  ou style externe).
- **Brute force** : les tentatives de connexion sont limitées (8 essais /
  15 minutes / IP).
- **Validation stricte des entrées** : formats vérifiés côté serveur pour
  chaque champ (nom, téléphone, email...), avec des limites de longueur.
- **Aucun identifiant par défaut** : le compte administrateur doit être
  créé explicitement via `npm run create-admin`.
- **Changement de mot de passe** : possible uniquement en reconfirmant le
  mot de passe actuel (une session laissée ouverte sur un poste partagé
  ne suffit donc pas à elle seule pour reprendre le compte).

### Obligatoire avant une mise en production

1. **Servez le site en HTTPS.** Ce projet ne fait pas lui-même de TLS ;
   placez-le derrière un reverse proxy (Nginx, Caddy, ou le load balancer
   de votre hébergeur) qui termine le HTTPS, puis mettez
   `COOKIE_SECURE=true` dans `.env`. Sans HTTPS, ne mettez jamais
   `COOKIE_SECURE=true` (le cookie de session ne serait alors plus envoyé
   du tout par le navigateur).
2. Définissez un `SESSION_SECRET` fort et gardez le fichier `.env` hors de
   tout dépôt Git (déjà exclu par `.gitignore`).
3. Sauvegardez régulièrement le fichier `data/recensement.db`.

### Limites connues (à faire évoluer si le site grandit)

- Les sessions sont actuellement stockées en mémoire (`express-session`
  sans magasin externe) : elles sont perdues si le serveur redémarre, et
  ce mode ne convient pas à plusieurs instances du serveur en parallèle.
  Pour un usage à plus grande échelle, ajoutez un magasin de session
  partagé (par exemple Redis, via `connect-redis`).
- Un seul rôle utilisateur existe (administrateur). Si plusieurs niveaux
  d'accès sont nécessaires, la table `users` peut être étendue avec un
  champ de rôle.
- Le module `node:sqlite` est encore marqué "expérimental" par Node.js
  (mais activement utilisé en production par de nombreux projets). Au
  démarrage, un message `ExperimentalWarning` peut s'afficher dans la
  console : c'est normal et sans conséquence.

## Structure du projet

```
src/
  app.js               Point d'entrée : assemble middlewares, vues, routes
  config.js            Lecture centralisée des variables d'environnement
  db.js                 Connexion SQLite + schéma
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
