
const express = require('express');
const db = require('../db'); // Assurez-vous que ce module exporte un Pool ou Client pg
const { getbabyInfo } = require('../services/babyService');
const { authenticateToken } = require('../services/authService'); // Assurez-vous d'importer authenticateToken si nécessaire

const router = express.Router();

// Route pour récupérer les informations du bébé
router.get('/', (req, res) => {
  const babyIsBorn = getbabyInfo();
  res.json(babyIsBorn);
});

// Route pour récupérer les scores d'un utilisateur
router.get('/scores', authenticateToken, async (req, res) => {
  const user_id = req.user.userId;

  if (!user_id) {
    return res.status(500).json({ error: "user_id est manquant ou invalide." });
  }

  try {
    // Requête pour récupérer les scores de l'utilisateur
    const query = `
      SELECT *
      FROM guesses_scores
      WHERE user_id = $1
    `;
    const result = await db.query(query, [user_id]);

    if (result.rows.length > 0) {
      res.status(200).json({ scores: result.rows[0] });
    } else {
      res.status(404).json({ message: "Aucun score trouvé pour cet utilisateur" });
    }
  } catch (err) {
    console.error("Erreur lors de la récupération des scores:", err);
    res.status(500).json({ error: "Erreur lors de la récupération des scores" });
  }
});

module.exports = router;
