export const configuration = () => ({
  database: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT!),
    user: process.env.DB_USER!,
    password: process.env.DB_PASS!,
    dbName: process.env.DB_DB!,

    debug: process.env.NODE_ENV === 'production' ? false : true,
  },
});
