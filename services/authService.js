
const jwt = require("jsonwebtoken");
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

module.exports = { authenticateToken };
