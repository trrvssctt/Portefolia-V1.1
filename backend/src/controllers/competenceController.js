const competenceModel = require('../models/competenceModel');
const { checkItemLimit } = require('../utils/planItemLimits');

async function create(req, res) {
  try {
    const portfolioId = Number(req.body.portfolio_id || req.body.portfolioId);
    if (!portfolioId) return res.status(400).json({ error: 'portfolio_id required' });
    const limitError = await checkItemLimit({ userId: req.userId, jwtRole: req.userPayload?.role, portfolioId, kind: 'competences' });
    if (limitError) return res.status(limitError.status).json({ error: limitError.error });
    const competence = {
      portfolio_id: portfolioId,
      nom: req.body.name || req.body.nom || null,
      niveau: req.body.level || req.body.niveau || null,
      categorie: req.body.category || req.body.categorie || null,
    };
    Object.keys(competence).forEach(k => competence[k] === undefined && delete competence[k]);
    const result = await competenceModel.create(competence);
    return res.status(201).json({ competence: result });
  } catch (err) {
    console.error('Error creating competence:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function update(req, res) {
  try {
    const id = Number(req.params.id);
    const data = {
      nom: req.body.name !== undefined ? req.body.name : req.body.nom,
      niveau: req.body.level !== undefined ? req.body.level : req.body.niveau,
      categorie: req.body.category !== undefined ? req.body.category : req.body.categorie,
    };
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
    const result = await competenceModel.update(id, data);
    return res.json({ competence: result });
  } catch (err) {
    console.error('Error updating competence:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function del(req, res) {
  try {
    const id = Number(req.params.id);
    await competenceModel.del(id);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting competence:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function listByPortfolio(req, res) {
  try {
    const portfolioId = Number(req.params.portfolioId);
    const rows = await competenceModel.findByPortfolio(portfolioId);
    return res.json({ competences: rows });
  } catch (err) {
    console.error('Error listing competences:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { create, update, del, listByPortfolio };
