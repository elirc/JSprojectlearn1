// A download manager that tells other parts of the app what happened.
// "Telling others" = fields you assign callbacks to. What could go wrong.

var downloader = {
  onComplete: null,
  onComplete2: null, // a second listener was needed... so, this.
  onError: null,

  finish: function (file) {
    if (this.onComplete) this.onComplete(file);
    if (this.onComplete2) this.onComplete2(file);
    if (this.onError) { /* nothing failed, skip */ }
  },
};

// Wire it up around the app:
downloader.onComplete = function (file) {
  console.log("notify: " + file + " done!");
};

// Another module also wants to know... and overwrites the first:
downloader.onComplete = function (file) {
  console.log("log: " + file);
  throw new Error("logger exploded");
};
// The notification module's listener is GONE. No error, it just
// never fires again. (That's why onComplete2 exists — someone hit
// this and "fixed" it by adding a slot. onComplete3 is only a
// matter of time.)

downloader.onComplete2 = function (file) {
  console.log("stats: counted " + file);
};

try {
  downloader.finish("report.pdf");
} catch (e) {
  console.log("crash: " + e.message);
}
// Output: "log: report.pdf" then the crash. Notice what's missing —
// "stats" never ran: one throwing listener killed all the ones after
// it. And there's no way to UNSUBSCRIBE anything, ever.
