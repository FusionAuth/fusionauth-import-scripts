import argon2 from 'argon2';
import express from 'express';
import session from 'express-session';
import pg from "pg"

const db = new pg.Pool({
    user: 'p',
    host: 'db', //service name, not localhost
    database: 'p',
    password: 'p',
    port: 5432, //internal container port
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

app.post('/', async (request, response) => {
    const { email, password } = request.body;
    if (!email || !password)
        return response.status(400).send('Enter email and password');
    try {
        const { rows } = await db.query('SELECT * FROM "user" WHERE email = $1;', [email]);
        const emailExists = rows.length > 0;
        if (emailExists) {
            const user = rows[0];
            if (await argon2.verify(user.passwordhash, password)) {
                request.session.userEmail = email;
                return response.redirect('/account');
            }
            else {
                await request.session.destroy();
                return response.status(400).send('Incorrect password');
            }
        }
        else if (!emailExists) {
            const hash = await argon2.hash(password);
            await db.query('INSERT INTO "user" (email, passwordhash) VALUES ($1, $2) RETURNING *;', [email, hash]);
            request.session.userEmail = email;
            response.redirect('/account');
        }
    }
    catch (error) {
        console.log(error);
        response.status(500).send('Error authenticating');
    }
});


app.get('/account', async (request, response) => {
    if (request.session.userEmail)
        response.send(`<html><body><h1>Account Details</h1><p>Hello ${request.session.userEmail}</p></body></html>`);
    else
        response.send(`<html><body><h1>Access Denied</h1></body></html>`);
});

app.listen(7771);