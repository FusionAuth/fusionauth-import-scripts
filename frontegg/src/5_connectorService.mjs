// Usage: node 5_connectorService.mjs yourclientid yourapikey

// Documentation at https://fusionauth.io/docs/lifecycle/migrate-users/connectors/generic-connector

import express from 'express';
import * as egg from '@frontegg/client';

const app = express();
app.use(express.json());
app.post('/', async (request, response) => {
    const isValid = await isLoginValid(request.body.loginId, password);
    if (isValid)
        return response.status(200).json({});
    response.status(404);
});
app.listen(6252);

isLoginValid("myemailaddress+frontegguserc@simplelogin.com", "passwords");

async function isLoginValid(id, password) {
    const authenticator = new egg.FronteggAuthenticator();
    await authenticator.init(process.argv[2], process.argv[3]);
    const httpClient = new egg.HttpClient(authenticator, { baseURL: 'https://api.frontegg.com' });
    const response = await httpClient.post('identity/resources/vendor-only/users/v1/passwords/verify', {
        email: id,
        password: password
    });
    authenticator.shutdown();
    return (response.status == 200 && response.data.valid) ;
}