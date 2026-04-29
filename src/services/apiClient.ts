import { auth } from '../firebase';

/**
 * Fetch wrapper that always attaches the current user's Firebase ID token.
 * Server endpoints under /api/* require this header (see requireAuth in server.ts).
 *
 * If the user is signed-out the request is rejected before going out — call sites
 * should not invoke /api/* endpoints when signed-out anyway.
 */
export async function authedFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error('not signed in');
  const token = await user.getIdToken();
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
