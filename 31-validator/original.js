// Validate a signup form. One giant function, one error at a time.

function validateSignup(form) {
  if (form.username == undefined || form.username == "") {
    return "username is required";
  }
  if (form.username.length < 3) {
    return "username must be at least 3 characters";
  }
  if (form.email == undefined || form.email == "") {
    return "email is required";
  }
  if (form.email.indexOf("@") == -1) {
    return "email must contain @";
  }
  if (form.password == undefined || form.password == "") {
    return "password is required";
  }
  if (form.password.length < 8) {
    return "password must be at least 8 characters";
  }
  if (form.age != undefined) {
    if (isNaN(Number(form.age))) {
      return "age must be a number";
    }
    if (Number(form.age) < 13) {
      return "age must be at least 13";
    }
  }
  return null; // null means OK... the opposite of project 30's advice,
               // but worse is coming:
}

// The user fills the whole form wrong, submits, and learns about ONE
// mistake. Fixes it, submits again, learns about the NEXT one. Five
// round trips to see five errors:
console.log(validateSignup({ username: "x", email: "nope", password: "123" }));
// -> only "username must be at least 3 characters"

// Also: "required" is written out 3 times, "at least N" twice, and
// the next form (login? settings?) copies THIS WHOLE FUNCTION and
// edits it. Validation logic scales as forms x fields x rules.
