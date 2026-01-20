export type Permission = {
  id: string;
  label: string;
};

export type AuthProfile = {
  userId?: number | null;
  username: string;
  email?: string | null;
  userType?: number | null;
  userLevel?: number | null;
  credit?: number | null;
  registerTime?: number | null;
};

export type AuthUser = {
  username: string;
  email?: string | null;
  userId?: number | null;
  userType?: number | null;
  userLevel?: number | null;
  credit?: number | null;
  registerTime?: number | null;
  token: string;
  tokenExpiresAt?: string;
};
