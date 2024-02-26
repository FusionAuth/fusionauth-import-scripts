import {FusionAuthClient} from '@fusionauth/typescript-client';
import parser from 'stream-json';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import Chain from 'stream-chain';
import * as fs from "fs";
import util from 'util'

const apiKey = '33052c8a-c283-4e96-9d2a-eb1215c69f8f-not-for-prod';
const fusionauthUrl = 'http://localhost:9011';
const filename = 'users.json';
const fa = new FusionAuthClient(apiKey, fusionauthUrl);

processUsers();

async function processUsers() {
  const stytchUsers = new Chain([fs.createReadStream(filename), parser(), new StreamArray(),]);
  for await (const { value: stytchUser } of stytchUsers) {
    const faUser = getFaUserFromStytchUser(stytchUser);
    await importUser(faUser, stytchUser);
  }
}

async function importUser(faUser, user) {
  const importRequest = { users: [faUser], validateDbConstraints: true };
  try {
    const result = await fa.importUsers(importRequest);
    if (result.wasSuccessful())
      console.log(`User ${user.user_id} imported successfully`);
    else
      console.error(`Error importing user ${user.user_id}`);
  }
  catch (e) {
    console.error(`Error importing user ${user.user_id}`);
    console.error(util.inspect(e, { showHidden: false, depth: null, colors: true }));
  }
}