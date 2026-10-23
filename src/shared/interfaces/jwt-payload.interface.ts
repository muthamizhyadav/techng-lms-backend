export interface StudentJwtPayload {
  sub: string;
  email: string;
  role: string;
  type: 'student';
  /** Login session id — validated against the account's active device session. */
  sid?: string;
  iat?: number;
  exp?: number;
}

/**
 * Short-lived proof that the caller supplied valid student credentials while
 * another device still holds the single active session. It is returned with
 * the 409 conflict response and exchanged for a real session once the student
 * approves signing the other device out. It is bound to the requesting device
 * so it cannot be replayed from somewhere else.
 */
export interface DeviceApprovalPayload {
  sub: string;
  email: string;
  role: string;
  type: 'device-approval';
  /** Device id that requested the approval. */
  did?: string;
  iat?: number;
  exp?: number;
}

/**
 * Signed OAuth `state` value. It survives the Google redirect so the callback
 * can attribute the login to the browser that started it.
 */
export interface GoogleOAuthStatePayload {
  type: 'oauth-state';
  did?: string;
  dn?: string;
  pf?: string;
  /** Random value also stored in an HttpOnly cookie to block login CSRF. */
  nonce?: string;
  iat?: number;
  exp?: number;
}

export interface AdminJwtPayload {
  sub: string;
  email: string;
  role: string;
  type: 'admin';
  iat?: number;
  exp?: number;
}
