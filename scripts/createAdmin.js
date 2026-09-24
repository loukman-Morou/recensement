// Script à lancer manuellement : `npm run create-admin`
//
// Volontairement séparé de l'application web : il n'existe AUCUN compte
// par défaut ni mot de passe codé en dur dans le projet. L'administrateur
// doit être créé explicitement, une fois, par la personne qui déploie
// l'application.

const readline = require('readline');
const userService = require('../src/services/userService');

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Masque la saisie du mot de passe dans le terminal (pas d'écho à l'écran).
function askHidden(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);

    let input = '';
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const onData = (char) => {
      if (char === '\n' || char === '\r' || char === '\u0004') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(input);
      } else if (char === '\u0003') {
        // Ctrl+C
        process.exit(1);
      } else if (char === '\u007f') {
        // Retour arrière
        input = input.slice(0, -1);
      } else {
        input += char;
      }
    };

    stdin.on('data', onData);
  });
}

async function main() {
  console.log("=== Création / réinitialisation de l'administrateur ===\n");

  const username = await ask("Nom d'utilisateur : ");
  if (!username || username.length < 3) {
    console.error("\nL'identifiant doit contenir au moins 3 caractères.");
    process.exit(1);
  }

  const password = await askHidden('Mot de passe (min. 10 caractères) : ');
  if (!password || password.length < 10) {
    console.error('\nLe mot de passe doit contenir au moins 10 caractères.');
    process.exit(1);
  }

  const confirmation = await askHidden('Confirmez le mot de passe : ');
  if (password !== confirmation) {
    console.error('\nLes deux mots de passe ne correspondent pas.');
    process.exit(1);
  }

  const { updated } = await userService.createOrUpdateUser(username, password);
  console.log(
    updated
      ? `\nMot de passe mis à jour pour "${username}".`
      : `\nCompte administrateur "${username}" créé avec succès.`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('Erreur :', err);
  process.exit(1);
});
