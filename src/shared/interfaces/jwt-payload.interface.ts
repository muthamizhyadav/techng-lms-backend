export interface StudentJwtPayload {
  sub: string;
  email: string;
  role: string;
  type: 'student';
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
