import { solveHanoi, describeMove } from './hanoi.js';

const discs = Number(process.argv[2] ?? 3);
const moves = solveHanoi(discs);

for (const move of moves) {
  console.log(describeMove(move));
}
console.log(`Total moves: ${moves.length}`);
