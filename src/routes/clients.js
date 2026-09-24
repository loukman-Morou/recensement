const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  clientValidationRules,
  clientIdParamRule,
  handleValidationErrors,
} = require('../middleware/validators');
const clientService = require('../services/clientService');
const { streamClientListPdf } = require('../services/pdfService');

const router = express.Router();

router.use(requireAuth);

const NOUVEAU_CLIENT_LOCALS = {
  titrePage: 'Nouveau client',
  pageActive: 'nouveau',
};

const MODIFIER_CLIENT_LOCALS = {
  titrePage: 'Modifier un client',
  pageActive: 'liste',
};

function clientIntrouvable(res) {
  return res.status(404).render('erreur', {
    titre: 'Client introuvable',
    message: "Ce client n'existe pas, ou a déjà été supprimé.",
  });
}

// Page 1 : recenser un nouveau client.
router.get('/clients', (req, res) => {
  res.render('nouveau-client', {
    ...NOUVEAU_CLIENT_LOCALS,
    erreurs: [],
    valeurs: {},
  });
});

router.post(
  '/clients',
  clientValidationRules,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      if (req.validationErrors) {
        return res.status(400).render('nouveau-client', {
          ...NOUVEAU_CLIENT_LOCALS,
          erreurs: req.validationErrors,
          valeurs: req.body,
        });
      }

      const { nom, prenom, telephone, email, adresse } = req.body;
      await clientService.createClient({ nom, prenom, telephone, email, adresse });

      res.setFlash('succes', `${prenom} ${nom} a été enregistré(e) avec succès.`);
      res.redirect('/clients');
    } catch (err) {
      next(err);
    }
  }
);

// Page 2 : consulter la liste des clients recensés.
router.get('/clients/liste', async (req, res, next) => {
  try {
    const search = typeof req.query.q === 'string' ? req.query.q : '';
    const page = parseInt(req.query.page, 10) || 1;

    const result = await clientService.listClients({ search, page });

    res.render('liste-clients', {
      titrePage: 'Liste des clients',
      pageActive: 'liste',
      clients: result.rows,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      search,
    });
  } catch (err) {
    next(err);
  }
});

// Export PDF de la liste (respecte le même filtre de recherche que l'écran).
router.get('/clients/liste/pdf', async (req, res, next) => {
  try {
    const search = typeof req.query.q === 'string' ? req.query.q : '';
    const clients = await clientService.listAllClients({ search });
    streamClientListPdf(clients, res, { searchTerm: search });
  } catch (err) {
    next(err);
  }
});

// Modifier un client existant.
router.get(
  '/clients/:id/modifier',
  clientIdParamRule,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      if (req.validationErrors) return clientIntrouvable(res);

      const client = await clientService.getClientById(req.params.id);
      if (!client) return clientIntrouvable(res);

      res.render('modifier-client', {
        ...MODIFIER_CLIENT_LOCALS,
        erreurs: [],
        valeurs: client,
        clientId: client.id,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/clients/:id/modifier',
  clientIdParamRule,
  clientValidationRules,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      if (req.validationErrors && req.validationErrors.length > 0) {
        const existe = await clientService.getClientById(req.params.id);
        if (!existe) return clientIntrouvable(res);

        return res.status(400).render('modifier-client', {
          ...MODIFIER_CLIENT_LOCALS,
          erreurs: req.validationErrors,
          valeurs: req.body,
          clientId: req.params.id,
        });
      }

      const { nom, prenom, telephone, email, adresse } = req.body;
      const misAJour = await clientService.updateClient(req.params.id, {
        nom,
        prenom,
        telephone,
        email,
        adresse,
      });

      if (!misAJour) return clientIntrouvable(res);

      res.setFlash('succes', `${prenom} ${nom} a été mis(e) à jour.`);
      res.redirect('/clients/liste');
    } catch (err) {
      next(err);
    }
  }
);

// Supprimer un client.
router.post(
  '/clients/:id/supprimer',
  clientIdParamRule,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      if (req.validationErrors) return clientIntrouvable(res);

      const client = await clientService.getClientById(req.params.id);
      if (!client) return clientIntrouvable(res);

      await clientService.deleteClient(req.params.id);
      res.setFlash('succes', `${client.prenom} ${client.nom} a été supprimé(e).`);
      res.redirect('/clients/liste');
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
