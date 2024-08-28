// const mysql = require('mysql2');
// require('dotenv').config();  // Charger les variables d'environnement depuis le fichier .env

// const connection = mysql.createConnection({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME
// });

// connection.connect((err) => {
//   if (err) {
//     console.error('Error connecting to the database:', err.stack);
//     return;
//   }
//   console.log('Connected to the database as id', connection.threadId);
// });

// module.exports = connection;

const { Pool } = require('pg');
require('dotenv').config();  // Charger les variables d'environnement depuis le fichier .env

// Créez une instance Pool pour gérer les connexions à la base de données
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,  // Le port par défaut pour PostgreSQL est 5432
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Vous pouvez ajouter d'autres options si nécessaire
});

// Fonction pour tester la connexion
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Connected to the database');
    client.release();  // Libérer le client après utilisation
  } catch (err) {
    console.error('Error connecting to the database:', err.stack);
  }
};

testConnection();

module.exports = pool;
