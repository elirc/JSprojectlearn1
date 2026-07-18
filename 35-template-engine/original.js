// Fill user data into an HTML email template.

function render(template, data) {
  var result = template;
  for (var key in data) {
    result = result.replace("{{" + key + "}}", data[key]);
  }
  return result;
}

var template = "<p>Hi {{name}}! Your score: {{score}}. Bye {{name}}!</p>";

console.log(render(template, { name: "Ada", score: 97 }));
// <p>Hi Ada! Your score: 97. Bye {{name}}!</p>
//                                ^^^^^^^^ Bug 1: replace(string, ...)
// only replaces the FIRST occurrence. The second {{name}} survives.

// Bug 2: no nested access — {{user.name}} looks up the literal key
// "user.name", which doesn't exist:
console.log(render("<p>{{user.name}}</p>", { user: { name: "Ada" } }));
// <p>{{user.name}}</p>

// Bug 3, the one that gets you hacked. User-controlled data goes
// straight into HTML:
var comment = { name: '<img src=x onerror="alert(\'stolen cookies\')">' };
console.log(render("<p>Hi {{name}}!</p>", comment));
// <p>Hi <img src=x onerror="alert('stolen cookies')">!</p>
// That attribute EXECUTES when the browser renders it. This is XSS —
// cross-site scripting — the most common web vulnerability there is.

// Bug 4: $ has magic meaning in replace strings:
console.log(render("<p>{{amount}}</p>", { amount: "$& deal" }));
// "$&" expands to the matched text — prints "{{amount}} deal". What?
