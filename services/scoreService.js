const db = require("../db");
const { getBabyInfo } = require("./babyService");

async function calculateScoresForAllUsers() {
	// const { actual_gender, actual_weight, actual_size, actual_names, actual_birthdate } = getBabyInfo(); // Récupère les vraies infos du bébé
	const {
		gender: actual_gender,
		weight: actual_weight,
		size: actual_size,
		name: actual_names,
		birthdate: actual_birthdate,
	} = getBabyInfo();

	const guessesQuery = `
        SELECT g.*, ug.user_id
        FROM guesses g
        JOIN users_guesses ug ON g.guessed_id = ug.guessed_id
    `;
	const guesses = await db.query(guessesQuery);

	for (const guess of guesses.rows) {
		let score_gender = 0;
		let score_weight = 0;
		let score_size = 0;
		let score_names = 0;
		let score_birthdate = 0;

		if (guess.guessed_gender === actual_gender) score_gender = 2;

		const weightDiff = Math.abs(guess.guessed_weight - actual_weight);
		if (weightDiff === 0) {
			score_weight = 2;
		} else if (weightDiff <= 0.1) {
			score_weight = 1;
		}

		const sizeDiff = Math.abs(guess.guessed_size - actual_size);
		if (sizeDiff === 0) {
			score_size = 2;
		} else if (sizeDiff <= 2) {
			score_size = 1;
		}

		const guessedNames = guess.guessed_names;
		if (
			actual_names.includes(guessedNames.girlName) ||
			actual_names.includes(guessedNames.boyName)
		) {
			score_names = 2;
		}

		const guessedBirthdate = new Date(guess.guessed_birthdate);
		const actualBirthdate = new Date(actual_birthdate);
		const dateDiff = Math.abs(guessedBirthdate - actualBirthdate) / 36e5;

		if (dateDiff === 0) {
			score_birthdate = 2;
		} else if (dateDiff <= 6) {
			score_birthdate = 1;
		}

		const insertScoreQuery = `
            INSERT INTO guesses_scores (user_id, guessed_id, score_gender, score_weight, score_size, score_names, score_birthdate)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (guessed_id) 
            DO UPDATE SET
                score_gender = $3,
                score_weight = $4,
                score_size = $5,
                score_names = $6,
                score_birthdate = $7
        `;
		await db.query(insertScoreQuery, [
			guess.user_id,
			guess.guessed_id,
			score_gender,
			score_weight,
			score_size,
			score_names,
			score_birthdate,
		]);
	}
}

module.exports = {
	calculateScoresForAllUsers,
};
