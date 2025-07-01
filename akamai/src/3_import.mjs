import parser from 'stream-json';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import Chain from 'stream-chain';
import * as fs from "fs";

const apiKey = '33052c8a-c283-4e96-9d2a-eb1215c69f8f-not-for-prod';
const fusionauthUrl = 'http://fa:9011';
const filename = 'faUsers.json';

processUsers();

async function processUsers() {
  const users = new Chain([fs.createReadStream(filename), parser(), new StreamArray(),]);
  for await (const { value: user } of users)
    await importUser(user);
}

async function importUser(user) {
  try {
    const response = await fetch(`${fusionauthUrl}/api/user/import`, {
      method: 'POST',
      headers: { 'Authorization': apiKey, 'Content-Type': 'application/json'},
      body: JSON.stringify({ users: [user], validateDbConstraints: true })
    });
    if (response.ok) console.log(`User ${user.email} imported successfully`);
    else {
      const errorData = await response.json();
      console.error(`Error importing user ${user.email}`, errorData);
    }
  }
  catch (error) { console.error('Error:', error); }
}
