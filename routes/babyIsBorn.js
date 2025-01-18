const express = require("express");
const db = require("../db"); // Assurez-vous que ce module exporte un Pool ou Client pg
const { getbabyInfo } = require("../services/babyService");
const { authenticateToken } = require("../services/authService"); // Assurez-vous d'importer authenticateToken si nécessaire

const router = express.Router();



// Route pour récupérer les informations du bébé

router.get("/", (req, res) => {
	const babyIsBorn = getbabyInfo();
	res.json(babyIsBorn);
});



// Route pour récupérer les scores d'un utilisateur

router.get("/scores", authenticateToken, async (req, res) => {
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
			res
				.status(404)
				.json({ message: "Aucun score trouvé pour cet utilisateur" });
		}
	} catch (err) {
		console.error("Erreur lors de la récupération des scores:", err);
		res
			.status(500)
			.json({ error: "Erreur lors de la récupération des scores" });
	}
});



// Route pour récupérer le classement général basé sur le total_score et afficher les user_name

router.get("/rankings", async (req, res) => {
  try {
    const query = `
      SELECT u.user_id, u.user_name, gs.total_score,
      DENSE_RANK() OVER (ORDER BY gs.total_score DESC) AS rank
      FROM guesses_scores gs
      JOIN users u ON gs.user_id = u.user_id
      ORDER BY gs.total_score DESC
    `;
    const result = await db.query(query);

    res.status(200).json({ rankings: result.rows });
  } catch (err) {
    console.error("Erreur lors de la récupération du classement:", err);
    res.status(500).json({ error: "Erreur lors de la récupération du classement" });
  }
});


// Route pour récupérer le classement d'un utilisateur spécifique (via token)
router.get('/rankings/me', authenticateToken, async (req, res) => {
    const user_id = req.user.userId;
  
    if (!user_id) {
      return res.status(500).json({ error: "user_id est manquant ou invalide." });
    }
  
    try {
      const query = `
        SELECT user_id, total_score, rank FROM (
          SELECT user_id, total_score,
          DENSE_RANK() OVER (ORDER BY total_score DESC) AS rank
          FROM guesses_scores
        ) AS ranked_scores
        WHERE user_id = $1
      `;
      const result = await db.query(query, [user_id]);
  
      if (result.rows.length > 0) {
        res.status(200).json({ rank: result.rows[0] });
      } else {
        res.status(404).json({ message: "Classement non trouvé pour cet utilisateur" });
      }
    } catch (err) {
      console.error("Erreur lors de la récupération du classement:", err);
      res.status(500).json({ error: "Erreur lors de la récupération du classement" });
    }
  });
  

module.exports = router;
