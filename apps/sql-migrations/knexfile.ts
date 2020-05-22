module.exports = {
  ext: "ts",
  client: "pg",
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_DB,
  },
  migrations: {
    stub: "migration.stub.ts",
    directory: "./migration-files",
    tableName: "migrations",
  },
};
