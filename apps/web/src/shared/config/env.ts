type EnvType = {
  API_BASE_URL: string;
  NODE_ENV: 'development' | 'docker' | 'production';
};
export const env: EnvType = {
  API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  NODE_ENV: (import.meta.env.VITE_NODE_ENV || import.meta.env.MODE || 'development') as EnvType['NODE_ENV'],
};
