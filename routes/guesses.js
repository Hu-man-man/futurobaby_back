
var express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../db");

var router = express.Router();
const JWT_SECRET = "la_suite_de_caractères_qui_va_servir_à_crypter";

// Middleware pour vérifier le token JWT et extraire l'ID utilisateur
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader) return res.status(401).json({ message: "Token manquant" });

    const token = authHeader.split(" ")[1]; // Récupérer le token en enlevant "Bearer "

    if (!token) return res.status(401).json({ message: "Token manquant après 'Bearer'" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Token invalide" });
        console.log("Utilisateur du token:", user);
        req.user = user; // Ajoute les informations de l'utilisateur au `req` pour les utiliser plus tard
        next();
    });
}

router.post("/", authenticateToken, (req, res) => {
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

    const existingGuessQuery = `
        SELECT g.guessed_id
        FROM guesses g
        JOIN users_guesses ug ON g.guessed_id = ug.guessed_id
        WHERE ug.user_id = ?
    `;

    db.execute(existingGuessQuery, [user_id], (err, results) => {
        if (err) {
            console.log("Erreur lors de la vérification des propositions existantes:", err);
            return res.status(500).json({ error: "Erreur lors de la vérification des propositions" });
        }

        if (results.length > 0) {
            const guessed_id = results[0].guessed_id;
            const updateQuery = `
                UPDATE guesses
                SET guessed_gender = ?, guessed_weight = ?, guessed_size = ?, guessed_names = ?, guessed_birthdate = ?
                WHERE guessed_id = ?
            `;

            db.execute(updateQuery, [guessed_gender, guessed_weight, guessed_size, guessed_names, guessed_birthdate, guessed_id], (err) => {
                if (err) {
                    console.log("Erreur lors de la mise à jour de la proposition:", err);
                    return res.status(500).json({ error: "Erreur lors de la mise à jour de la proposition" });
                }

                res.status(200).json({
                    message: "Guess mis à jour avec succès",
                    guessed_id
                });
            });
        } else {
            const insertQuery = `
                INSERT INTO guesses (guessed_gender, guessed_weight, guessed_size, guessed_names, guessed_birthdate)
                VALUES (?, ?, ?, ?, ?)
            `;

            db.execute(insertQuery, [guessed_gender, guessed_weight, guessed_size, guessed_names, guessed_birthdate], (err, result) => {
                if (err) {
                    console.log("Erreur lors de la création du guess:", err);
                    return res.status(500).json({ error: "Erreur lors de la création du guess" });
                }

                const guessed_id = result.insertId;

                const userGuessQuery = `
                    INSERT INTO users_guesses (user_id, guessed_id)
                    VALUES (?, ?)
                `;

                db.execute(userGuessQuery, [user_id, guessed_id], (err) => {
                    if (err) {
                        console.log("Erreur lors de la liaison du guess avec l'utilisateur:", err);
                        return res.status(500).json({ error: "Erreur lors de la liaison du guess avec l'utilisateur" });
                    }

                    res.status(201).json({
                        message: "Guess créé avec succès et lié à l'utilisateur",
                        guessed_id
                    });
                });
            });
        }
    });
});


// Route pour récupérer les propositions actuelles d'un utilisateur
router.get("/current", authenticateToken, (req, res) => {
    const user_id = req.user.userId;

    if (!user_id) {
        return res.status(500).json({ error: "user_id est manquant ou invalide." });
    }

    const query = `
        SELECT g.guessed_gender, g.guessed_weight, g.guessed_size, g.guessed_names, g.guessed_birthdate
        FROM guesses g
        JOIN users_guesses ug ON g.guessed_id = ug.guessed_id
        WHERE ug.user_id = ?
    `;

    db.execute(query, [user_id], (err, results) => {
        if (err) {
            console.log("Erreur lors de la récupération du guess:", err);
            return res.status(500).json({ error: "Erreur lors de la récupération du guess" });
        }

        if (results.length > 0) {
            const guess = results[0];
            res.status(200).json({ guess });
        } else {
            res.status(404).json({ message: "Aucun guess trouvé pour cet utilisateur" });
        }
    });
});

// Route de test
router.get("/", (req, res) => {
    res.send("Route guesses est accessible");
});

module.exports = router;
