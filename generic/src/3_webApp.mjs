import argon2 from 'argon2';
import express from 'express';
import session from 'express-session';

const app = express();
app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // no https
}));

app.get('/account', async (request, response) => {
    if (request.session.userEmail)
        response.send(`<html><body><h1>Account Details</h1><p>Hello ${request.session.userEmail}</p></body></html>`);
    else
    response.send(`<html><body><h1>Access Denied</h1></body></html>`);
});

app.get('/', async (request, response) => {
    request.session.userEmail = 'email'
    response.redirect('/account');
});

app.post('/', async (request, response) => { });


app.listen(7771);