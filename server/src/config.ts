export const config = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'grandmasters',
    user: process.env.DB_USER || 'grandmasters',
    password: process.env.DB_PASSWORD || 'change_me',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_in_production',
    accessExpiresInSeconds: 900, // 15 minutes
    refreshExpiresInDays: 30,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  },
  port: parseInt(process.env.PORT || '3000'),
};
