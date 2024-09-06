
var express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db"); // Assurez-vous que ce module exporte un Pool ou Client pg

var router = express.Router();
const JWT_SECRET = "la_suite_de_caractères_qui_va_servir_à_crypter";

// Obtenir tous les utilisateurs
router.get("/", async (req, res) => {
    const query = "SELECT * FROM users";
    try {
        const result = await db.query(query);
        res.json(result.rows); // Utilisez `result.rows` pour accéder aux données
    } catch (err) {
        res.status(500).json({ error: "Erreur lors de la récupération des utilisateurs", details: err.message });
    }
});

// Permet à un utilisateur de créer un compte
router.post("/logup", async (req, res) => {
    const { user_name, user_password, user_email } = req.body;

    if (!user_name || !user_password || !user_email) {
        return res.status(400).json({ message: "Nom d'utilisateur, mot de passe et email sont requis" });
    }

    try {
        const hashedPassword = await bcrypt.hash(user_password, 10);
        const query = "INSERT INTO users (user_name, user_password, user_email) VALUES ($1, $2, $3) RETURNING user_id";
        const values = [user_name, hashedPassword, user_email];

        const result = await db.query(query, values);
        const userId = result.rows[0].user_id; // Récupérez l'ID de l'utilisateur inséré

        // Création du token pour connexion immédiate
        const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({ message: "Utilisateur créé avec succès", token, userName: user_name });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur interne du serveur" });
    }
});

// Permet à un utilisateur de se connecter
router.post("/login", async (req, res) => {
    const { user_name, user_password } = req.body;

    if (!user_name || !user_password) {
        return res.status(400).json({ message: "Nom d'utilisateur et mot de passe sont requis" });
    }

    try {
        const query = "SELECT * FROM users WHERE user_name = $1";
        const values = [user_name];

        const result = await db.query(query, values);
        const user = result.rows[0]; // Récupérez le premier utilisateur trouvé

        if (!user) {
            return res.status(401).json({ message: "Nom d'utilisateur incorrect" });
        }

        const match = await bcrypt.compare(user_password, user.user_password);
        if (!match) {
            return res.status(401).json({ message: "Mot de passe incorrect" });
        }

        // Création du token
        const token = jwt.sign({ userId: user.user_id }, JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ token, message: "Connexion réussie", userName: user_name });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur interne du serveur" });
    }
});

module.exports = router;
