// Documentation at https://fusionauth.io/docs/lifecycle/migrate-users/connectors/generic-connector

import express from 'express';
import * as fs from 'fs';
import parser from 'stream-json';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import Chain from 'stream-chain';

const app = express();
app.use(express.json());
app.post('/', async (request, response) => {
    console.log(`Request received for ${request.body.loginId}`);
    const email = request.body.loginId;
    const password = request.body.password;
    const isValid = await isLoginValid(email, request.body.password);
    if (!isValid)
      return response.status(404).end();
    const userDetails = await getUserDetailsFromFile(email);
    if (Object.keys(userDetails).length === 0)
        return response.status(404).end();
    console.log('User login verified. Returning details to FusionAuth');
    return response.status(200).json({user: { ...userDetails, 'password': password }});
});
app.listen(80, '0.0.0.0');
console.log('Service running');

async function isLoginValid(email, password) {
    try {
      const response = await fetch('https://test-env.us-dev.janraincapture.com/oauth/auth_native_traditional', {
        method: 'POST',
        headers: { 'accept': 'application/json', 'content-type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({
          client_id: '9a55jnetfgjf8mzdmjbugdmyr55tc2j9',
          flow_version: '20250502165159394037',
          flow: 'standard',
          locale: 'en-US',
          form: 'signInForm',
          redirect_uri: 'http://localhost',
          currentPassword: password,
          signInEmailAddress: email
        }).toString()
      });
      const data = await response.json();
      console.dir(data);
      return (response.status == 200 && data.stat == 'ok');
    }
    catch (e) { return false; }
}

async function getUserDetailsFromFile(email) {
  const inputUsers = new Chain([fs.createReadStream('faUsers.json'), parser(), new StreamArray(),]);
  for await (const { value: user } of inputUsers)
      if (user.email == email)
        return user;
  console.log(email + ' not found in faUsers.json');
  return {};
}
