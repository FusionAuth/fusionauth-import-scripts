import {FusionAuthClient} from '@fusionauth/typescript-client';
import parser from 'stream-json';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import Chain from 'stream-chain';
import * as fs from "fs";
import util from 'util'

const apiKey = 'this_really_should_be_a_long_random_alphanumeric_value_but_this_still_works';
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