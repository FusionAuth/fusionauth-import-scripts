import express from 'express';
import session from 'express-session';
import {default as passport} from 'passport';
import {default as oauthStrategy} from 'passport-oauth2';
import {jwtDecode} from 'jwt-decode';

const app = express();
app.use(express.json());
app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // no https
}));
setupPassport(app);

app.get('/', passport.authenticate('oauth2'));

app.get('/callback', passport.authenticate('oauth2', { successRedirect: '/account', failureRedirect: '/' }));

app.get('/account', async (request, response) => {
    if (request.isAuthenticated())
        response.send(`<html><body><h1>Account Details</h1><p>Hello ${request.user}</p></body></html>`);
    else
        response.send(`<html><body><h1>Access Denied</h1></body></html>`);
});

app.listen(7771);

function setupPassport(app) {
    app.use(passport.session());
    const authOptions = {
        authorizationURL: "http://localhost:9011/oauth2/authorize",
        callbackURL: "http://localhost:7771/callback",
        clientID: "E9FDB985-9173-4E01-9D73-AC2D60D1DC8E",
        clientSecret: "super-secret-secret-that-should-be-regenerated-for-production",
        tokenURL: "http://host.docker.internal:9011/oauth2/token"
    };
    passport.use(
        'oauth2',
        new oauthStrategy.Strategy(authOptions, function (accessToken, refreshToken, profile, callback) {
            const token = jwtDecode(accessToken);
            callback(null, token.email);
        })
    );
    passport.serializeUser((user, callback) => {
        callback(null, user);
    });
    passport.deserializeUser((user, callback) => {
        callback(null, user);
    });
}