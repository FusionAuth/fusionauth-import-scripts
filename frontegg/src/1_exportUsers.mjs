// USAGE:   node 1_exportUsers.mjs yourclientid yourapikey

import process from 'process';
import { promises as fs } from 'fs';
import * as egg from '@frontegg/client';

const authenticator = new egg.FronteggAuthenticator();
await authenticator.init(process.argv[2], process.argv[3]);
const httpClient = new egg.HttpClient(authenticator, { baseURL: 'https://api.frontegg.com' });
const usersResponse = await httpClient.get('identity/resources/users/v3');
const users = [];
for (let user of usersResponse.data.items) {
  const userResponse = await httpClient.get('identity/resources/vendor-only/users/v1/' + user.id);
  users.push(userResponse.data);
}
authenticator.shutdown();
await fs.writeFile('users.json', JSON.stringify(users, null, 4));