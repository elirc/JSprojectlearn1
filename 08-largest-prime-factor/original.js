// Find the largest prime factor of a number.
// Idea: check every number from n down; first one that's prime AND
// divides n is the answer. Correct... and brutally slow.

function isPrime(x) {
  if (x < 2) return false;
  for (var i = 2; i < x; i++) {   // checks EVERY number below x
    if (x % i == 0) {
      return false;
    }
  }
  return true;
}

function largestPrimeFactor(n) {
  for (var i = n; i >= 2; i--) {  // ...and starts from the TOP
    if (n % i == 0 && isPrime(i)) {
      return i;
    }
  }
  return null;
}

console.log(largestPrimeFactor(13195));   // 29 — instant, looks fine!
console.log(largestPrimeFactor(600851)); // still okay...
// console.log(largestPrimeFactor(600851475143)); // <- uncomment and
// go make coffee. This is the actual Project Euler input, and this
// algorithm would take somewhere between hours and forever.
