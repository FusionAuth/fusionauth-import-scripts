import pg from 'pg';

const db = new pg.Pool({
    user: 'p',
    host: 'db', //container service name, not localhost
    database: 'p',
    password: 'p',
    port: 7770
});

await db.query(`CREATE TABLE "user" (
    "email" VARCHAR(255) NOT NULL,
    "passwordhash" VARCHAR(255) NOT NULL,
    PRIMARY KEY ("email")
);`);