var express = require("express");
const { authenticateToken } = require('../services/authService');
const db = require("../db"); // Assurez-vous que ce module exporte un Pool ou Client pg
const { calculateScoresForAllUsers } = require('../services/scoreService');


var router = express.Router();

// Route pour ajouter ou mettre à jour un guess
router.post("/", authenticateToken, async (req, res) => {
    console.log("Requête reçue avec données:", req.body);
    console.log("Utilisateur identifié:", req.user);

    const { guessed_gender, guessed_weight, guessed_size, guessed_names, guessed_birthdate } = req.body;
    const user_id = req.user.userId;

    if (!user_id) {
        console.error("Erreur : user_id est undefined !");
        return res.status(500).json({ error: "user_id est manquant ou invalide." });
    }

    if (!guessed_gender || !guessed_weight || !guessed_size || !guessed_names || !guessed_birthdate) {
        return res.status(400).json({ message: "Toutes les informations de guess sont requises" });
    }

    // Convertir guessed_names en une chaîne JSON
    const guessed_names_json = JSON.stringify(guessed_names);

    try {
        // Vérifier si un guess existe déjà pour cet utilisateur
        const existingGuessQuery = `
            SELECT g.guessed_id
            FROM guesses g
            JOIN users_guesses ug ON g.guessed_id = ug.guessed_id
            WHERE ug.user_id = $1
        `;
        const existingGuessResult = await db.query(existingGuessQuery, [user_id]);

        if (existingGuessResult.rows.length > 0) {
            const guessed_id = existingGuessResult.rows[0].guessed_id;

            // Mettre à jour le guess existant
            const updateQuery = `
                UPDATE guesses
                SET guessed_gender = $1, guessed_weight = $2, guessed_size = $3, guessed_names = $4, guessed_birthdate = $5
                WHERE guessed_id = $6
            `;
            await db.query(updateQuery, [guessed_gender, guessed_weight, guessed_size, guessed_names_json, guessed_birthdate, guessed_id]);

            res.status(200).json({
                message: "Guess mis à jour avec succès",
                guessed_id
            });
        } else {
            // Insérer un nouveau guess
            const insertQuery = `
                INSERT INTO guesses (guessed_gender, guessed_weight, guessed_size, guessed_names, guessed_birthdate)
                VALUES ($1, $2, $3, $4, $5) RETURNING guessed_id
            `;
            const insertResult = await db.query(insertQuery, [guessed_gender, guessed_weight, guessed_size, guessed_names_json, guessed_birthdate]);
            const guessed_id = insertResult.rows[0].guessed_id;

            // Lier le guess avec l'utilisateur
            const userGuessQuery = `
                INSERT INTO users_guesses (user_id, guessed_id)
                VALUES ($1, $2)
            `;
            await db.query(userGuessQuery, [user_id, guessed_id]);

            res.status(201).json({
                message: "Guess créé avec succès et lié à l'utilisateur",
                guessed_id
            });
        }
    } catch (err) {
        console.log("Erreur lors de la gestion des guesses:", err);
        res.status(500).json({ error: "Erreur lors de la gestion des guesses" });
    }
});


// Route pour récupérer les propositions actuelles d'un utilisateur
router.get("/current", authenticateToken, async (req, res) => {
    const user_id = req.user.userId;

    if (!user_id) {
        return res.status(500).json({ error: "user_id est manquant ou invalide." });
    }

    try {
        const query = `
            SELECT g.guessed_gender, g.guessed_weight, g.guessed_size, g.guessed_names, g.guessed_birthdate
            FROM guesses g
            JOIN users_guesses ug ON g.guessed_id = ug.guessed_id
            WHERE ug.user_id = $1
        `;
        const result = await db.query(query, [user_id]);

        if (result.rows.length > 0) {
            const guess = result.rows[0];
            res.status(200).json({ guess });
        } else {
            res.status(404).json({ message: "Aucun guess trouvé pour cet utilisateur" });
        }
    } catch (err) {
        console.log("Erreur lors de la récupération du guess:", err);
        res.status(500).json({ error: "Erreur lors de la récupération du guess" });
    }
});

router.post("/calculate-scores", async (req, res) => {
    console.log("Début du calcul des scores...");
    console.time("Temps de calcul des scores");

    try {
        await calculateScoresForAllUsers();
        console.timeEnd("Temps de calcul des scores");
        res.status(200).json({ message: "Les scores ont été calculés avec succès." });
    } catch (err) {
        console.error("Erreur lors du calcul des scores:", err);
        res.status(500).json({ error: "Erreur lors du calcul des scores" });
    }
});


// Route de test
router.get("/", (req, res) => {
    res.send("Route guesses est accessible");
});

module.exports = router;
