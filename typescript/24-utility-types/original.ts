// One User interface... and four hand-copied variations of it, each
// a snapshot that stopped tracking the original the day it was
// written. (ts#03 warned about duplicating a type across functions;
// this is duplicating it across VARIATIONS.)

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'member';
  createdAt: Date;
}

// "User, but everything optional" — for PATCH updates. Hand-copied:
export interface UserUpdate {
  id?: number;
  username?: string;
  email?: string;
  role?: 'admin' | 'member';
  // createdAt forgotten — added to User later, never propagated here
}

// "just the public fields" — for the API response. Hand-copied:
export interface PublicUser {
  id: number;
  username: string;
  rol: 'admin' | 'member'; // typo'd during the copy. A THIRD spelling
}                          // of this field now exists in the codebase.

// "User without the id" — for creation. Hand-copied:
export interface NewUser {
  username: string;
  email: string;
  role: 'admin' | 'member';
  // createdAt also missing here — is that intended? Who knows;
  // hand-copies don't record INTENT, only a moment in time.
}

// "usernames by id" — an object shape, hand-written:
export interface UserIndex {
  [id: number]: string;
}

// Four shadows of User, each maintained (or not) by hand. Every
// change to User is now a FIVE-file scavenger hunt, and two of the
// shadows are already stale.
