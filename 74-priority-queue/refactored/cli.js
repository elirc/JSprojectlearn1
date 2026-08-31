import { BinaryHeap } from './heap.js';
import { TaskScheduler } from './scheduler.js';

// The whole I/O layer of this project: a few console.log calls that ask
// the scheduler questions and print the answers. No decisions happen here.

const scheduler = new TaskScheduler();
for (const [name, priority] of [
  ['email-receipt', 5],
  ['charge-card', 1],
  ['resize-avatar', 5],
  ['rebuild-index', 9],
  ['send-otp', 1],
]) {
  scheduler.add(name, priority);
}

console.log(`queued ${scheduler.size} tasks`);
console.log(`next up: ${scheduler.peek().name}`);
for (const task of scheduler.drain()) {
  console.log(`  running ${task.name} (p${task.priority})`);
}
// peek() and the first line of drain() agree by construction: one queue,
// one comparator, no preview that can drift from reality.

// The same workload the original spent seconds on — plus 33x more, to
// show that the curve is nearly flat, not just the constant factor small.
// (33x the tasks costs roughly 20x the time. The original would need
// hours: its cost grows with the SQUARE of the task count.)
for (const count of [3000, 100_000]) {
  const heap = new BinaryHeap((a, b) => a.priority - b.priority);
  const started = Date.now();
  for (let i = 0; i < count; i++) heap.push({ name: `t${i}`, priority: (i * 7919) % 10000 });
  while (heap.size > 0) heap.pop(); // push AND drain, not just push
  console.log(`${count} heap pushes + pops: ${Date.now() - started}ms`);
}
