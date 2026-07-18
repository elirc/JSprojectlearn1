// The RULES of the game, as data and pure functions. No I/O in this file.

export const MOVES = ['rock', 'paper', 'scissors'];

// The whole rulebook in three lines: what each move beats.
// Want to extend to rock-paper-scissors-lizard-spock? Each move
// beats a *list* — change values to arrays and use .includes().
const BEATS = {
  rock: 'scissors',
  paper: 'rock',
  scissors: 'paper',
};

export function isValidMove(move) {
  return MOVES.includes(move);
}

/** Returns 'player' | 'computer' | 'draw'. Throws on invalid moves. */
export function decideWinner(playerMove, computerMove) {
  if (!isValidMove(playerMove) || !isValidMove(computerMove)) {
    throw new Error(`Moves must be one of: ${MOVES.join(', ')}`);
  }
  if (playerMove === computerMove) return 'draw';
  return BEATS[playerMove] === computerMove ? 'player' : 'computer';
}

/** rng is injectable so tests can force a specific move. */
export function randomMove(rng = Math.random) {
  return MOVES[Math.floor(rng() * MOVES.length)];
}
