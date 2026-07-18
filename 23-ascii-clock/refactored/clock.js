// The only impure file: it owns the timer, the console, and "now".
// Run: node clock.js
import { formatTime, renderText } from './render.js';

function tick() {
  console.clear();
  console.log(renderText(formatTime(new Date())));
}

tick();
setInterval(tick, 1000);
