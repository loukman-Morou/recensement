const PDFDocument = require('pdfkit');

const MARGIN = 40;
const COLUMNS = [
  { label: 'N°', key: 'index', width: 30 },
  { label: 'Nom', key: 'nom', width: 90 },
  { label: 'Prénom', key: 'prenom', width: 90 },
  { label: 'Téléphone', key: 'telephone', width: 90 },
  { label: 'Email', key: 'email', width: 130 },
  { label: 'Enregistré le', key: 'date_enregistrement', width: 90 },
];

function formatDate(value) {
  // Le pilote PostgreSQL (pg) convertit automatiquement les colonnes
  // TIMESTAMPTZ en objets Date JavaScript ; on garde une tolérance pour
  // une chaîne (utile si la valeur vient d'ailleurs, ex. tests).
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value ?? '');
  return date.toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/**
 * Génère un PDF listant les clients fournis et l'écrit directement dans
 * le flux HTTP de réponse (streaming, pas de fichier temporaire sur disque).
 */
function streamClientListPdf(clients, res, { searchTerm = '' } = {}) {
  const doc = new PDFDocument({ margin: MARGIN, size: 'A4', layout: 'landscape' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="registre-clients.pdf"'
  );
  doc.pipe(res);

  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .text('Registre des clients', { align: 'left' });

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#555555')
    .text(
      `Généré le ${new Date().toLocaleString('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })}` + (searchTerm ? ` — filtre : "${searchTerm}"` : ''),
      { align: 'left' }
    )
    .text(`Nombre de clients : ${clients.length}`, { align: 'left' });

  doc.moveDown(1);
  doc.fillColor('#000000');

  const tableTop = doc.y;
  let y = tableTop;

  function drawRow(rowY, values, { header = false } = {}) {
    let x = MARGIN;
    doc.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
    COLUMNS.forEach((col) => {
      doc.text(String(values[col.key] ?? ''), x, rowY, {
        width: col.width,
        ellipsis: true,
      });
      x += col.width;
    });
  }

  drawRow(y, Object.fromEntries(COLUMNS.map((c) => [c.key, c.label])), {
    header: true,
  });
  y += 18;
  doc
    .moveTo(MARGIN, y - 4)
    .lineTo(MARGIN + COLUMNS.reduce((sum, c) => sum + c.width, 0), y - 4)
    .strokeColor('#999999')
    .stroke();

  clients.forEach((client, i) => {
    if (y > doc.page.height - MARGIN - 20) {
      doc.addPage();
      y = MARGIN;
      drawRow(y, Object.fromEntries(COLUMNS.map((c) => [c.key, c.label])), {
        header: true,
      });
      y += 18;
    }
    drawRow(y, {
      index: i + 1,
      nom: client.nom,
      prenom: client.prenom,
      telephone: client.telephone,
      email: client.email || '—',
      date_enregistrement: formatDate(client.date_enregistrement),
    });
    y += 16;
  });

  doc.end();
}

module.exports = { streamClientListPdf };
