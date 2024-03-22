//import argon2 from 'argon2';
import {default as crypto} from 'crypto-js';
import express from 'express';
import session from 'express-session';
import pg from 'pg';
import {v4 as uuid} from 'uuid';

const db = new pg.Pool({
    user: 'p',
    host: 'db', //container service name, not localhost
    database: 'p',
    password: 'p',
    port: 7770, //internal container port
});

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // no https
}));

app.get('/', async (request, response) => {
    response.send(`
        <html>
            <body>
                <form action="/" method="post">
                    <label for="email">Email:</label>
                    <input type="email" id="email" name="email" required> <br /><br />
                    <label for="password">Password:</label>
                    <input type="password" id="password" name="password" required> <br /><br />
                    <button type="submit">Sign In / Register</button>
                </form>
            </body>
        </html>
    `);
});

app.get('/account', async (request, response) => {
    if (request.session.userEmail)
        response.send(`<html><body><h1>Account Details</h1><p>Hello ${request.session.userEmail}</p></body></html>`);
    else
        response.send(`<html><body><h1>Access Denied</h1></body></html>`);
});

app.post('/', async (request, response) => {
    const { email, password } = request.body;
    if (!email || !password)
        return response.status(400).send('Enter email and password');
    try {
        const { rows } = await db.query('SELECT * FROM "user" WHERE email = $1;', [email]);
        const emailExists = rows.length > 0;
        if (emailExists) {
            const user = rows[0];
            //if (await argon2.verify(user.passwordhash, password)) {
            if (getHash(password, rows[0].salt) == rows[0].hash) {
                request.session.userEmail = email;
                return response.redirect('/account');
            }
            else {
                await request.session.destroy();
                return response.status(400).send('Incorrect password');
            }
        }
        else if (!emailExists) {
            // const hash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 1024*64, parallelism: 1, timeCost: 2});
            const salt = uuid();
            const hash = getHash(password, salt);
            await db.query('INSERT INTO "user" (email, hash, salt) VALUES ($1, $2, $3) RETURNING *;', [email, hash, salt]);
            request.session.userEmail = email;
            response.redirect('/account');
        }
    }
    catch (error) {
        console.log(error);
        response.status(500).send('Error authenticating');
    }
});

app.listen(7771);

function getHash(password, salt) {
    let hash = crypto.enc.Utf8.parse(password).concat(crypto.enc.Base64.parse(salt));
    for (let count = 0; count < 20000; count++)
        hash = crypto.SHA256(hash);
    return hash.toString(crypto.enc.Hex);
}