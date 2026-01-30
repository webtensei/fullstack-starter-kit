export interface Token {
  id: string;
  token: string;
  expires_at: string; // ISO string for frontend
  creation_date: string; // ISO string
  user_id: string;
  user_agent: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: Token;
}
