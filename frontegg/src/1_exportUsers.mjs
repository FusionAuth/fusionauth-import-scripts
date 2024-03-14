// USAGE:   node 1_exportUsers.mjs 8923a75e7-2261-4344-bc93-5fea324dd615

import process from 'process';
import { promises as fs } from 'fs';
import * as frontegg from '@frontegg/client';

const outputFile = 'users.txt';
frontegg.FronteggContext.init({
    FRONTEGG_CLIENT_ID: '0d0c5e4b-6c5c-4a85-96fc-7c17b31ee36a',
    FRONTEGG_API_KEY: process.argv[2]
});
// const context = frontegg.FronteggContext.getInstance();


// console.dir(frontegg);

// const frontEggSDK = require('api')('@frontegg/v2.0.2#hrbemlrdglfk4');

// frontEggSDK.usersControllerV3_getUsers({_includeSubTenants: 'true'})
//   .then(({ data }) => console.log(data))
//   .catch(err => console.error(err));


// const users = await getUsers();
// const jsonData = JSON.stringify(users, null, 2);
// console.log(jsonData);
// await fs.writeFile(filePath, jsonData);
// console.log(`Frontegg users saved to ${filePath}`);

// Karim's working code

const authenticator = new frontegg.FronteggAuthenticator();
await authenticator.init('0d0c5e4b-6c5c-4a85-96fc-7c17b31ee36a', process.argv[2])
// const httpClient = new frontegg.HttpClient(authenticator, { baseURL: 'https://api.frontegg.com' });
// const result = await httpClient.get(
//     'identity/resources/users/v3',
//     {
//         // it will replace(<...>) https://<api>.frontegg.com with your app id
//         'frontegg-vendor-host': 'app-bapkxlp1dgn',
//     },
// );
// console.dir(result);

// [Module: null prototype] {
//     AMR_METHOD_VALUE: [ 'otp', 'sms', 'hwk', 'sso' ],
//     AMR_MFA_VALUE: 'mfa',
//     AuditsClient: [class AuditsClient],
//     EntitlementsClient: [class EntitlementsClient extends EventEmitter],
//     EventsClient: [class EventsClient],
//     FronteggAuthenticator: [class FronteggAuthenticator],
//     FronteggContext: [class FronteggContext] {
//       instance: FronteggContext { context: [Object], options: {} }
//     },
//     HostedLoginClient: [class HostedLoginClient],
//     HttpClient: [class HttpClient],
//     IdentityClient: [class IdentityClient],
//     STEP_UP_ACR_VALUE: 'http://schemas.openid.net/pape/policies/2007/06/multi-factor',
//     StepupValidator: [class StepupValidator],
//     __esModule: true,
//     default: {
//       AuditsClient: [Getter],
//       FronteggContext: [Getter],
//       FronteggAuthenticator: [Getter],
//       withAuthentication: [Getter],
//       HttpClient: [Getter],
//       IdentityClient: [Getter],
//       EntitlementsClient: [Getter],
//       EventsClient: [Getter],
//       HostedLoginClient: [Getter],
//       STEP_UP_ACR_VALUE: [Getter],
//       AMR_MFA_VALUE: [Getter],
//       AMR_METHOD_VALUE: [Getter],
//       StepupValidator: [Getter]
//     },
//     withAuthentication: [Function: withAuthentication]
//   }
