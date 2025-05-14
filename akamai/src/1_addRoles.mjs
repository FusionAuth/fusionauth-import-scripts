import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const inputFilename = 'users.json';
const applicationId = 'e9fdb985-9173-4e01-9d73-ac2d60d1dc8e';
const apiKey = '33052c8a-c283-4e96-9d2a-eb1215c69f8f-not-for-prod';
const fusionauthUrl = 'http://fa:9011';

await createRoles();

async function createRoles() {
  const json = JSON.parse(fs.readFileSync(inputFilename, 'utf8'));
  for (const user of json.results) {
    if (user.roles && user.roles.length > 0) {
      for (const role of user.roles) {
        const roleId = uuidv4();
        try {
          const response = await fetch(
            `${fusionauthUrl}/api/application/${applicationId}/role/${roleId}`,
            {
              method: 'POST',
              headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                "role": {
                  "description": role.display,
                  "name": role.value,
                  "isDefault": false,
                  "isSuperRole": false
                }
              })
            }
          );
          if (response.ok) console.log(`Role with ID ${roleId} for ${role.value} created successfully.`);
          else console.error(`Failed to create role with ID ${roleId}. Status: ${response.status}`);
        }
        catch (error) { console.error(`Error creating role with ID ${roleId}:`, error); }
      }
    }
  }
}
