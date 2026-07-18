// A typed API client! Interfaces for every response! ...and a cast
// where the network meets the types, which makes the interfaces
// decorative. (ts#13's lesson at its most common crime scene.)

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Post {
  id: number;
  title: string;
  authorId: number;
}

// The fake network: version 2 of the API renamed a field. The
// client's types describe version 1. Nobody told the types.
function fakeNetwork(path: string): unknown {
  if (path === '/user/7') {
    return { id: 7, name: 'Ada', mail: 'ada@engine.dev' };
    //                           ^ v2 renamed email -> mail
  }
  if (path === '/posts') {
    return [{ id: 1, title: 'On Engines', author_id: 7 }];
    //                                     ^ and authorId -> author_id
  }
  return null;
}

export async function getUser(id: number): Promise<User> {
  const data = fakeNetwork(`/user/${id}`);
  return data as User; // "the API returns a User" — it DID, in March
}

export async function getPosts(): Promise<Post[]> {
  return fakeNetwork('/posts') as Post[];
}

// Downstream, everything typechecks and everything is wrong:
export async function userSummary(): Promise<string> {
  const user = await getUser(7);
  return `${user.name} <${user.email.toLowerCase()}>`;
  //                       ^ email is undefined (it's `mail` now):
  //                         crash — .toLowerCase of undefined — in
  //                         code four layers from the cast that
  //                         promised it existed.
}
