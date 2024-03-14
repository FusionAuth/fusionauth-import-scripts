const { FronteggAuthenticator, HttpClient } = require('@frontegg/client');
const { fronteggConfig } = require("./authConfig")


const authenticator = new FronteggAuthenticator();

const httpClient = new HttpClient(authenticator, { baseURL: 'https://api.frontegg.com' });

async function getUsers() {
    try {
        await authenticator.init(fronteggConfig.clientID, fronteggConfig.secret)

        console.log('Frontegg API called at: ' + new Date().toString());
        const response = await httpClient.get(
            'identity/resources/users/v3',
            {
                'frontegg-vendor-authorization': fronteggConfig.appID,
            },
        );
        return response.data
    }
    catch (error) {
        console.log(error);
        return error;
    }
    finally {
        authenticator.shutdown()
    }
}

async function getUser(id) {
    try {
        await authenticator.init(fronteggConfig.clientID, fronteggConfig.secret)

        console.log('Frontegg API called at: ' + new Date().toString());
        const response = await httpClient.get(
            `identity/resources/vendor-only/users/v1/${id}`,
            {
                'frontegg-vendor-authorization': fronteggConfig.appID,
            },
        );
        return response.data
    }
    catch (error) {
        console.log(error);
        return error;
    }
    finally {
        authenticator.shutdown()
    }
}

async function authUser(email, password) {
    try {
        await authenticator.init(fronteggConfig.clientID, fronteggConfig.secret)

        console.log('Frontegg API called at: ' + new Date().toString());
        const response = await httpClient.post(
            'identity/resources/auth/v1/user',
            {
                email: email,
                password: password,
            },
            {
                'frontegg-vendor-host': fronteggConfig.appID,
            },
        );
        return response.data
    }
    catch (error) {
        console.log(error);
        return error;
    }
    finally {
        authenticator.shutdown()
    }
}


module.exports = {
    getUsers: getUsers,
    getUser: getUser,
    authUser: authUser
}
