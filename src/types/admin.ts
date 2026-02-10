export type AdminUser = {
  username: string;
  token: string;
  tokenExpiresAt?: string;
};

export type AdminOverall = {
  fundCount: number;
  indexCount: number;
  stockCount: number;
  fundNavCount: number;
  indexDailyCount: number;
  stockDailyCount: number;
};
