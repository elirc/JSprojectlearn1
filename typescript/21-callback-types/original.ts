// A data-fetching helper with callbacks — typed so loosely that the
// callback CONTRACT (when called? with what? how many times?) lives
// only in the comments, which are already wrong.

export interface User { id: number; name: string }

// "calls onSuccess with the user, or onError with the message"
export function fetchUser(
  id: number,
  onSuccess: (user: any) => any,   // any-in, any-out
  onError?: Function,              // ts#15's mush, optional this time
): void {
  if (id <= 0) {
    // the comment SAYS onError gets a message string. The code:
    if (onError) onError({ code: 400 }); // ...passes an object
    return;
  }
  setTimeout(() => {
    onSuccess({ id, name: `user${id}` });
    onSuccess({ id, name: `user${id}` });
    // ^ called TWICE (a paste bug). The types have no opinion on
    //   how many times a callback fires — but neither does anything
    //   else here, and `any` made the double-fire invisible to
    //   review: no signature promised anything to violate.
  }, 10);
}

fetchUser(
  7,
  (user) => console.log(user.nmae.toUpperCase()),
  //                          ^ typo: user is any, compiles,
  //                            crashes at runtime — TWICE, thanks
  //                            to the double-fire
  (message: string) => console.log(`error: ${message.toUpperCase()}`),
  //         ^ believes the comment: expects string, receives
  //           {code: 400}, crashes on .toUpperCase when id <= 0
);

// Optional callbacks + Function + any = every caller reverse-
// engineers the contract from the implementation, and each gets a
// different answer.
