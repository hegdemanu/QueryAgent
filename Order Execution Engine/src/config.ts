import dotenv from 'dotenv';

dotenv.config();

interface Config {
  DATABASE_URL: string;
  REDIS_URL: string;
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
}

function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config: Config = {
  DATABASE_URL: getEnvVar('DATABASE_URL'),
  REDIS_URL: getEnvVar('REDIS_URL'),
  PORT: parseInt(process.env['PORT'] ?? '3000', 10),
  NODE_ENV: (process.env['NODE_ENV'] as Config['NODE_ENV']) ?? 'development',
};
