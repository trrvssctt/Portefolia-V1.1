const carteModel = require('../models/carteModel');
const commandeModel = require('../models/commandeModel');

async function activateCard(req, res) {
  try {
    const userId = req.userId;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const carte = await carteModel.findById(id);
    if (!carte) return res.status(404).json({ error: 'Carte introuvable' });

    // Vérifier que la carte appartient à l'utilisateur via la commande
    const commande = await commandeModel.findById(carte.commande_id);
    if (!commande || String(commande.utilisateur_id) !== String(userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (carte.statut !== 'Livrée') {
      return res.status(400).json({ error: 'La carte doit être livrée avant activation' });
    }

    const updated = await carteModel.activate(id);
    return res.json({ carte: updated });
  } catch (err) {
    console.error('carteController.activateCard error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function deactivateCard(req, res) {
  try {
    const userId = req.userId;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const carte = await carteModel.findById(id);
    if (!carte) return res.status(404).json({ error: 'Carte introuvable' });

    const commande = await commandeModel.findById(carte.commande_id);
    if (!commande || String(commande.utilisateur_id) !== String(userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await carteModel.deactivate(id);
    return res.json({ carte: updated });
  } catch (err) {
    console.error('carteController.deactivateCard error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { activateCard, deactivateCard };
