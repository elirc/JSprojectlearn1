// The payments API is flaky. "Just retry it a few times."

var attempt = 0;
function chargeCard(amount) {
  attempt++;
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      if (attempt < 3) reject(new Error("503 service unavailable"));
      else resolve({ charged: amount });
    }, 50);
  });
}

function notFound() {
  return Promise.reject(new Error("404 no such customer"));
}

// The copy-paste retry. Every criticism of it is a plot point below.
async function chargeWithRetry(amount) {
  try {
    return await chargeCard(amount);
  } catch (e1) {
    try {
      return await chargeCard(amount);       // retry immediately!
    } catch (e2) {
      try {
        return await chargeCard(amount);     // AGAIN, immediately!
      } catch (e3) {
        throw e3;
      }
    }
  }
}

async function main() {
  console.log(await chargeWithRetry(100)); // works on the 3rd try. Ship it!

  // Problem 1: ZERO delay between retries. A struggling server gets
  // hit 3 times in ~150ms — retries that make the outage WORSE.
  // Real clients back off: wait 100ms, then 200ms, then 400ms...

  // Problem 2: it retries EVERYTHING, including errors that can
  // never succeed. A 404 means the customer doesn't exist — asking
  // twice more is pure waste (and pure log spam):
  try {
    await (async function () {
      try { return await notFound(); }
      catch (e1) {
        try { return await notFound(); }     // pointless
        catch (e2) { return await notFound(); } // pointless
      }
    })();
  } catch (e) {
    console.log("gave up on:", e.message);
  }

  // Problem 3: no timeout. If the API HANGS (never resolves), await
  // waits forever. No retry logic even gets a chance to run.

  // Problem 4: want 5 attempts instead of 3? That's another nested
  // try/catch level. The NUMBER of attempts is encoded in the SHAPE
  // of the code.
}

main();
