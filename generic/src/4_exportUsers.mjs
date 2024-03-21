import pg from 'pg';
import { promises as fs } from 'fs';

const db = new pg.Pool({
  user: 'p',
  host: 'db', //container service name, not localhost
  database: 'p',
  password: 'p',
  port: 5432, //internal container port
});

const { rows } = await db.query('SELECT * FROM "user"');
await fs.writeFile('users.json', JSON.stringify(rows, null, 4));