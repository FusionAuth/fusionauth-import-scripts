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

// Identity Provider mappings for social accounts
// IDs from https://github.com/FusionAuth/fusionauth-java-client/blob/master/src/main/java/io/fusionauth/domain/provider/IdentityProviderType.java
const IDP_MAPPINGS = {
  "google_oauth2": "82339786-3dff-42a6-aac6-1f1ceecb6c46", // Google
};

linkSocialAccounts();

async function linkSocialAccounts() {
  const users = new Chain([fs.createReadStream(filename), parser(), new StreamArray(),]);
  let totalUsers = 0;
  let socialUsers = [];
  let userIdMapping = {};

  // First pass: collect social users and build user ID mapping
  for await (const { value: user } of users) {
    totalUsers++;
    
    // Build user ID mapping (email -> user ID)
    userIdMapping[user.email] = user.id || user.email;
    
    // Collect social/OAuth users
    if (user.data && user.data.provider && user.data.provider !== 'local') {
      socialUsers.push(user);
    }
  }

  console.log(`Found ${socialUsers.length} social accounts to link`);

  if (socialUsers.length === 0) {
    console.log('No social accounts found to link.');
    return;
  }

  // Link social accounts
  let linkedCount = 0;
  let errorCount = 0;

  for (const user of socialUsers) {
    const result = await createIdentityLink(user, userIdMapping);
    if (result.success) {
      linkedCount++;
    } else {
      errorCount++;
    }
  }

  console.log(`Successfully linked ${linkedCount}/${socialUsers.length} social accounts`);
}

async function createIdentityLink(user, userIdMapping) {
  try {
    const provider = user.data.provider;
    const oauthUid = user.data.google_id;
    const email = user.email;
    
    // Skip if provider doesn't need linking
    if (provider === 'local') {
      return { success: true };
    }
    
    const identityProviderId = IDP_MAPPINGS[provider];
    if (!identityProviderId) {
      console.log(`Warning: No identity provider mapping for ${provider}. Skipping ${email}.`);
      return { success: false, error: `No mapping for provider: ${provider}` };
    }
    
    // Get the user ID from our mapping
    const fusionAuthUserId = userIdMapping[email];
    if (!fusionAuthUserId) {
      console.log(`Warning: User ID not found for ${email}. Skipping link.`);
      return { success: false, error: 'User ID not found' };
    }
    
    // Create the identity provider link
    const linkRequest = {
      identityProviderId: identityProviderId,
      identityProviderUserId: oauthUid,
      userId: fusionAuthUserId,
      displayName: email
    };
    
    const response = await fa.createUserLink(linkRequest);
    
    if (response.wasSuccessful()) {
      return { success: true };
    } else {
      console.log(`Failed to link ${email}: ${response.status}`);
      console.log(response);
      if (response.response) {
        console.log(`  ${JSON.stringify(response.response)}`);
      }
      return { 
        success: false, 
        error: response.errorResponse || 'Unknown link error' 
      };
    }
  } catch (error) {
    console.error(`Error linking ${user.email}: ${JSON.stringify(error)}`);
    return { 
      success: false, 
      error: error.message || error 
    };
  }
} 