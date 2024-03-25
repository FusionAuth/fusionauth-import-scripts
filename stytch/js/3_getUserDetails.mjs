// npm install csv-parser stytch

import * as stytch from "stytch";
import * as fs from "fs";
import csv from "csv-parser";

processCSV({
  inputFilename: 'hash.csv',
  outputFilename: 'users.json',
  project_id: 'project-test-36510638-652a-4d3d-9a94-f0a7106582fc',
  secret: 'secret-test-Ww5WZPWzBGJdW44BOCq3K6VypSyjC8iO4dE='
});

async function processCSV(p) {
  const client = new stytch.Client({project_id: p.project_id, secret: p.secret});
  const table = fs.createReadStream(p.inputFilename).pipe(csv({ headers: false }));
  const users = [];
  for await (const row of table) {
    try {
      const user = await client.users.get({ user_id: row[0] });
      user.hash = row[1];
      user.salt = row[2];
      user.hashAlgorithm = row[3];
      users.push(user);
    }
    catch (error) {
      console.error(`Error fetching user details for ID ${row[0]}: ${error.message}`);
    }
  }
  fs.writeFileSync(p.outputFilename, JSON.stringify(users, null, 2));
}
