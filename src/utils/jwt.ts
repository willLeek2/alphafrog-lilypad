type JwtPayload = {
  exp?: number;
  sub?: string;
};

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return atob(padded);
};

export const parseJwt = (token: string): JwtPayload | null => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  try {
    return JSON.parse(decodeBase64Url(parts[1]));
  } catch {
    return null;
  }
};

export const getTokenExpiryIso = (token: string) => {
  const payload = parseJwt(token);
  if (!payload?.exp) {
    return undefined;
  }
  return new Date(payload.exp * 1000).toISOString();
};

export const getTokenSubject = (token: string) => {
  const payload = parseJwt(token);
  return payload?.sub;
};
