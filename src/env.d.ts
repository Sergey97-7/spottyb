declare namespace NodeJS {
  interface ProcessEnv {
    POSTGRESQL_URL: string;
    REDIS_URL: string;
    PORT: string;
    SESSION_SECRET: string;
    CORS_ORIGIN: string;
  }
}
