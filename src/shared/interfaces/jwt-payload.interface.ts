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

export interface AdminJwtPayload {
  sub: string;
  email: string;
  role: string;
  type: 'admin';
  iat?: number;
  exp?: number;
}
