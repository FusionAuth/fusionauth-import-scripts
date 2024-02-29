import {FusionAuthClient} from '@fusionauth/typescript-client';
import parser from 'stream-json';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import Chain from 'stream-chain';
import * as fs from "fs";
import util from 'util'

const apiKey = '33052c8a-c283-4e96-9d2a-eb1215c69f8f-not-for-prod';
const fusionauthUrl = 'http://localhost:9011';
const filename = 'faUsers.json';
const fa = new FusionAuthClient(apiKey, fusionauthUrl);

processUsers();

async function processUsers() {
  const users = new Chain([fs.createReadStream(filename), parser(), new StreamArray(),]);
  for await (const { value: user } of users) {
    await importUser(user);
  }
}

async function importUser(user) {
  const importRequest = { users: [user], validateDbConstraints: true };
  try {
    const result = await fa.importUsers(importRequest);
    if (result.wasSuccessful())
      console.log(`User ${user.email} imported successfully`);
    else
      console.error(`Error importing user ${user.email}`);
  }
  catch (e) {
    console.error(`Error importing user ${user.email}`);
    console.error(util.inspect(e, { showHidden: false, depth: null, colors: true }));
  }
}