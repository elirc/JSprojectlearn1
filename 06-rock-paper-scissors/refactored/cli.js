// The I/O shell. Reads input, calls the rules, prints the result.
import { MOVES, isValidMove, decideWinner, randomMove } from './game.js';

const playerMove = (process.argv[2] ?? '').toLowerCase();

if (!isValidMove(playerMove)) {
  console.log(`Usage: node cli.js <${MOVES.join('|')}>`);
  process.exit(1);
}

const computerMove = randomMove();
const winner = decideWinner(playerMove, computerMove);

console.log(`You played ${playerMove}, computer played ${computerMove}.`);
console.log(
  { player: 'You win!', computer: 'Computer wins!', draw: 'Draw!' }[winner],
);
