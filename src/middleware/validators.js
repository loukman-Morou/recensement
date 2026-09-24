const { body, param, validationResult } = require('express-validator');

// Autorise les lettres accentuées, espaces, apostrophes et tirets
// (ex. "Jean-Paul", "N'Guessan", "Élodie").
const NAME_PATTERN = /^[\p{L}\s'-]+$/u;
// Chiffres, espaces, +, - et parenthèses pour les numéros de téléphone.
const PHONE_PATTERN = /^[0-9+\s().-]+$/;

// Important : on valide le FORMAT ici, mais on n'échappe pas le HTML à
// l'écriture en base. L'échappement se fait à l'AFFICHAGE (les vues EJS
// utilisent <%= %>, qui échappe automatiquement). Échapper aussi à
// l'écriture provoquerait un double-encodage et corromprait les données.
const clientValidationRules = [
  body('nom')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères.')
    .bail()
    .matches(NAME_PATTERN)
    .withMessage('Le nom ne peut contenir que des lettres, espaces, tirets ou apostrophes.'),

  body('prenom')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le prénom doit contenir entre 2 et 100 caractères.')
    .bail()
    .matches(NAME_PATTERN)
    .withMessage('Le prénom ne peut contenir que des lettres, espaces, tirets ou apostrophes.'),

  body('telephone')
    .trim()
    .isLength({ min: 6, max: 20 })
    .withMessage('Le téléphone doit contenir entre 6 et 20 caractères.')
    .bail()
    .matches(PHONE_PATTERN)
    .withMessage('Le téléphone contient des caractères non autorisés.'),

  body('email')
    .trim()
    .optional({ values: 'falsy' })
    .isLength({ max: 254 })
    .isEmail()
    .withMessage("L'adresse email n'est pas valide.")
    .normalizeEmail(),

  body('adresse')
    .trim()
    .optional({ values: 'falsy' })
    .isLength({ max: 255 })
    .withMessage("L'adresse ne doit pas dépasser 255 caractères."),
];

const loginValidationRules = [
  body('username')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Identifiant requis."),
  body('password')
    .isLength({ min: 1, max: 200 })
    .withMessage('Mot de passe requis.'),
];

// Valide l'identifiant numérique présent dans l'URL (/clients/:id/...).
const clientIdParamRule = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Identifiant de client invalide.')
    .toInt(),
];

const passwordChangeValidationRules = [
  body('motDePasseActuel')
    .isLength({ min: 1, max: 200 })
    .withMessage('Le mot de passe actuel est requis.'),

  body('nouveauMotDePasse')
    .isLength({ min: 10, max: 200 })
    .withMessage('Le nouveau mot de passe doit contenir au moins 10 caractères.'),

  body('confirmationMotDePasse')
    .custom((value, { req }) => value === req.body.nouveauMotDePasse)
    .withMessage('La confirmation ne correspond pas au nouveau mot de passe.'),
];

function handleValidationErrors(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  req.validationErrors = result.array().map((e) => e.msg);
  next();
}

module.exports = {
  clientValidationRules,
  clientIdParamRule,
  loginValidationRules,
  passwordChangeValidationRules,
  handleValidationErrors,
};
