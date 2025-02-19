const db = require("../db");
const { getbabyInfo } = require("./babyService");

// Fonction pour compter le nombre de lettres en commun entre deux prénoms
function countCommonLetters(name1, name2) {
	if (!name1 || !name2) return 0;
	const name1Letters = name1.toLowerCase().trim().split("");
	const name2Letters = name2.toLowerCase().trim().split("");
	let commonCount = 0;

	// Compter le nombre de lettres communes, en évitant de les compter plusieurs fois
	const name2LetterCounts = name2Letters.reduce((acc, letter) => {
		acc[letter] = (acc[letter] || 0) + 1;
		return acc;
	}, {});

	for (let letter of name1Letters) {
		if (name2LetterCounts[letter] > 0) {
			commonCount++;
			name2LetterCounts[letter]--;
		}
	}

	return commonCount;
}

// Fonction pour calculer les points selon les lettres en commun
function calculateNameScore(guessedName, actualName) {
	if (!guessedName || !actualName) return 0;

	guessedName = guessedName.toLowerCase().trim();
	actualName = actualName.toLowerCase().trim();
	const commonLetters = countCommonLetters(guessedName, actualName);

	if (guessedName === actualName) {
		return 7; // Prénom exact
	} else if (commonLetters >= 4) {
		return 2; // Au moins 4 lettres en commun
	} else if (commonLetters >= 3) {
		return 1; // Au moins 3 lettres en commun
	}
	return 0; // Moins de 3 lettres en commun
}

// Fonction principale pour calculer les scores de tous les utilisateurs
async function calculateScoresForAllUsers() {
	console.log("Début du calcul des scores pour tous les utilisateurs...");
	console.time("Temps total de calcul des scores");

	try {
		// Récupérer les vraies informations du bébé
		console.log("Récupération des informations réelles du bébé...");
		const {
			gender: actual_gender,
			weight: actual_weight,
			size: actual_size,
			name: actual_names,
			birthdate: actual_birthdate,
		} = getbabyInfo();
		console.log("Informations du bébé récupérées:", {
			actual_gender,
			actual_weight,
			actual_size,
			actual_names,
			actual_birthdate,
		});

		// Requêter toutes les suppositions
		console.log("Requête des guesses en base de données...");
		console.time("Temps de requête des guesses");
		const guessesQuery = `
            SELECT g.*, ug.user_id
            FROM guesses g
            JOIN users_guesses ug ON g.guessed_id = ug.guessed_id
        `;
		const guesses = await db.query(guessesQuery);
		console.timeEnd("Temps de requête des guesses");
		console.log("Nombre de guesses récupérés:", guesses.rows.length);

		for (const guess of guesses.rows) {
			console.log(
				`Calcul des scores pour user_id: ${guess.user_id}, guessed_id: ${guess.guessed_id}`
			);
			let score_gender = 0;
			let score_weight = 0;
			let score_size = 0;
			let score_names = 0;
			let score_date = 0;
			let score_time = 0;

			// Calcul du score pour le sexe
			if (guess.guessed_gender === actual_gender) {
				score_gender = 2;
			}
			console.log("Score pour le genre:", score_gender);

			// Calcul du score pour le poids
			const weightDiff = Math.abs(guess.guessed_weight - actual_weight);
			if (weightDiff === 0) {
				score_weight = 3;
			} else if (weightDiff <= 0.101) {
				score_weight = 1;
			}
			console.log("Différence de poids:", weightDiff, "Score:", score_weight);

			// Calcul du score pour la taille
			const sizeDiff = Math.abs(guess.guessed_size - actual_size);
			if (sizeDiff <= 1) {
				score_size = 3;
			} else if (sizeDiff <= 2.5) {
				score_size = 1;
			}
			console.log("Différence de taille:", sizeDiff, "Score:", score_size);

			// Comparaison des prénoms
			const guessedNames = guess.guessed_names;
			console.log("Guessed names:", guessedNames);

			// Calcul du score pour les prénoms
			let maxScore = 0;
			guessedNames.forEach((nameObj) => {
				const boyNameScore = calculateNameScore(
					nameObj.boyName || "",
					actual_names
				);
				const girlNameScore = calculateNameScore(
					nameObj.girlName || "",
					actual_names
				);
				maxScore = Math.max(maxScore, boyNameScore, girlNameScore);
			});

			score_names = maxScore;
			console.log("Score pour les prénoms:", score_names);

			// Calcul du score pour la date et l'heure
			const guessedBirthdate = new Date(guess.guessed_birthdate);
			const actualBirthdate = new Date(actual_birthdate);

			const guessedDate = guessedBirthdate.toISOString().split("T")[0];
			const actualDate = actualBirthdate.toISOString().split("T")[0];
			const dayDiff =
				Math.abs(new Date(guessedDate) - new Date(actualDate)) /
				(1000 * 60 * 60 * 24);

			if (dayDiff === 0) {
				score_date = 3;
			} else if (dayDiff === 1) {
				score_date = 1;
			}
			console.log(
				"Différence de jours:",
				dayDiff,
				"Score pour la date:",
				score_date
			);

			// // Comparaison de l'heure
			// const guessedHours = guessedBirthdate.getHours();
			// const guessedMinutes = guessedBirthdate.getMinutes();
			// const actualHours = actualBirthdate.getHours();
			// const actualMinutes = actualBirthdate.getMinutes();

			// const hourDiff = Math.abs(guessedHours - actualHours);
			// const minuteDiff = Math.abs(guessedMinutes - actualMinutes);

			// if (guessedHours === actualHours && minuteDiff <= 3) {
			//     score_time = 5; // Heure exacte et à moins de 3 minutes
			// } else if (guessedHours === actualHours && minuteDiff > 3) {
			//     score_time = 3; // Même heure mais plus de 3 minutes d'écart
			// } else if (hourDiff === 1) {
			//     score_time = 1; // À une heure près
			// }
			// console.log(
			// 	"guessedHours:",
			// 	guessedHours,
			// 	"actualHours:",
			// 	actualHours,
			// 	"Différence d'heures:",
			// 	hourDiff,
			// 	"Score pour l'heure:",
			// 	score_time
			// );

			// Comparaison de l'heure
			const guessedHours = guessedBirthdate.getHours();
			const guessedMinutes = guessedBirthdate.getMinutes();
			const actualHours = actualBirthdate.getHours();
			const actualMinutes = actualBirthdate.getMinutes();

			// Calculer la différence en minutes entre les heures et minutes devinées et réelles
			const timeDiffMinutes = Math.abs(
				guessedHours * 60 + guessedMinutes - (actualHours * 60 + actualMinutes)
			);

			if (timeDiffMinutes <= 2) {
				score_time = 5; // Devine entre 18h56 et 19h00
			} else if (timeDiffMinutes <= 60) {
				score_time = 3; // Devine entre 17h58 et 19h58
			} else if (timeDiffMinutes <= 120) {
				score_time = 1; // Devine entre 16h58 et 20h58
			} else {
				score_time = 0; // En dehors de ces plages
			}
			console.log(
				"Écart en minutes:",
				timeDiffMinutes,
				"Score pour l'heure:",
				score_time
			);

			// Insérer ou mettre à jour les scores dans la base de données
			console.log(
				"Mise à jour des scores en base pour guessed_id:",
				guess.guessed_id
			);
			const insertScoreQuery = `
                INSERT INTO guesses_scores (user_id, guessed_id, score_gender, score_weight, score_size, score_names, score_date, score_time)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (guessed_id) 
                DO UPDATE SET
                    score_gender = $3,
                    score_weight = $4,
                    score_size = $5,
                    score_names = $6,
                    score_date = $7,
                    score_time = $8
            `;
			await db.query(insertScoreQuery, [
				guess.user_id,
				guess.guessed_id,
				score_gender,
				score_weight,
				score_size,
				score_names,
				score_date,
				score_time,
			]);
			console.log(
				`Scores mis à jour pour user_id: ${guess.user_id}, guessed_id: ${guess.guessed_id}`
			);
		}

		console.timeEnd("Temps total de calcul des scores");
	} catch (err) {
		console.error("Erreur lors du calcul des scores:", err);
	}
}

module.exports = {
	calculateScoresForAllUsers,
};
