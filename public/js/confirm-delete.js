// Demande une confirmation avant l'envoi de tout formulaire de
// suppression. Écrit en JavaScript "self-hosted" externe (pas de script
// inline) pour rester compatible avec la politique de sécurité de contenu
// stricte du site (aucun script en ligne autorisé).
document.addEventListener('submit', function (event) {
  const form = event.target;
  if (!form.classList || !form.classList.contains('formulaire-suppression')) {
    return;
  }

  const nom = form.dataset.clientNom || 'ce client';
  const confirmation = window.confirm(
    'Supprimer définitivement ' + nom + ' du registre ?\n' +
    'Cette action est irréversible.'
  );

  if (!confirmation) {
    event.preventDefault();
  }
});
