// Usage: node 5_connectorService.mjs yourclientid yourapikey

// Documentation at https://fusionauth.io/docs/lifecycle/migrate-users/connectors/generic-connector

import express from 'express';
import * as egg from '@frontegg/client';
import * as fs from 'fs';
import parser from 'stream-json';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import Chain from 'stream-chain';

const app = express();
app.use(express.json());
app.post('/', async (request, response) => {
    console.log("Request received");
    const email = request.body.loginId;
    const password = request.body.password;
    const isValid = await isLoginValid(email, request.body.password);
    if (isValid) {
        const idAndActive = await getUserDetailsFromFile(email);
        if (idAndActive.length != 2)
            return response.status(404).end();
        return response.status(200).json({
            user: {
                'active': idAndActive[1],
                'id': idAndActive[0],
                'email': email,
                'password': password,
                'username': email
            }
        });
    }
    response.status(404).end();
});
app.listen(6252);



async function isLoginValid(id, password) {
    const authenticator = new egg.FronteggAuthenticator();
    await authenticator.init(process.argv[2], process.argv[3]);
    const httpClient = new egg.HttpClient(authenticator, { baseURL: 'https://api.frontegg.com' });
    try {
        const response = await httpClient.post('identity/resources/vendor-only/users/v1/passwords/verify', {
            email: id,
            password: password
        });
        return (response.status == 200 && response.data.valid);
    }
    catch (e) {
        return false;
    }
    finally {
        authenticator.shutdown();
    }
}

async function getUserDetailsFromFile(email) {
    const inputUsers = new Chain([fs.createReadStream('faUsers.json'), parser(), new StreamArray(),]);
    const result = [];
    for await (const { value: user } of inputUsers) {
        if (user.email == email) {
            result.push(user.id);
            result.push(user.active);
        }
    }
    return result;
}