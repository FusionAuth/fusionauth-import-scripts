// npm install @fusionauth/typescript-client stream-json

import {FusionAuthClient} from '@fusionauth/typescript-client';
import parser from 'stream-json';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import Chain from 'stream-chain';
import * as fs from "fs";
import util from 'util'

const apiKey = '33052c8a-c283-4e96-9d2a-eb1215c69f8f-not-for-prod';
const fusionauthUrl = 'http://localhost:9011';
const fa = new FusionAuthClient(apiKey, fusionauthUrl);

processUsers();

async function processUsers() {
  const stytchUsers = new Chain([fs.createReadStream('export.json'), parser(), new StreamArray(),]);
  for await (const { value: stytchUser } of stytchUsers) {
    const faUser = getFaUserFromStytchUser(stytchUser);
    await importUser(faUser, stytchUser);
  }
}

function getFaUserFromStytchUser(stytchUser) {
  const faUser = {};

  // SecureIdentity fields ------
  // faUser.breachedPasswordLastCheckedInstant = number;
  // faUser.breachedPasswordStatus = BreachedPasswordStatus;
  // faUser.connectorId = UUID;
  if (stytchUser.hashAlgorithm == "scrypt")
    faUser.encryptionScheme = 'example-salted-stytch-scrypt';
  else
    throw new Error("Handle hash algorithms other than Scrypt by searching for this error message and adding a new encryptionScheme.");
  faUser.factor = 1; // unused by scrypt, but required by FusionAuth
  faUser.id = getNullOrUUIDFromUserId(stytchUser.user_id);
  // faUser.lastLoginInstant = number;
  faUser.password = Buffer.from(stytchUser.hash, 'base64').toString('base64'); // fusionAuth doesn't like - and _ in Base64, only / and +
  faUser.passwordChangeRequired = stytchUser.password?.requires_reset;
  if (faUser.passwordChangeRequired)
    faUser.passwordChangeReason = "Requested by Stytch on import";
  // faUser.passwordLastUpdateInstant = number;
  faUser.salt = Buffer.from(stytchUser.salt, 'base64').toString('base64'); // fusionAuth doesn't like - and _ in Base64, only / and +
  faUser.uniqueUsername = stytchUser.user_id;
  faUser.username = stytchUser.user_id;
  // faUser.usernameStatus = ContentStatus;
  faUser.verified = false;
  if (stytchUser.emails && stytchUser.emails.some(e => e.verified === true)) {
    faUser.verified = true;
    faUser.email = stytchUser.emails.find(e => e.verified).email;
  }
  else if (stytchUser.emails && stytchUser.emails.length > 0)
    faUser.email = stytchUser.emails[0].email;
  // faUser.verifiedInstant = number;

  // User fields ------
  faUser.active = (stytchUser.status == "active");
  // faUser.birthDate = string;
  // faUser.cleanSpeakId = UUID;
  // faUser.expiry = number;
  if (stytchUser.name?.first_name)
    faUser.firstName = stytchUser.name?.first_name;
  faUser.fullName = [stytchUser.name?.first_name, stytchUser.name?.middle_name, stytchUser.name?.last_name]
    .filter(name => name !== null && name !== undefined && name !== '')
    .join(' ');
  // faUser.imageUrl = string;
  // faUser.insertInstant = number;
  if (stytchUser.name?.last_name)
    faUser.lastName = stytchUser.name?.last_name;
  // faUser.lastUpdateInstant = number;
  // faUser.memberships = Array<GroupMember>;
  if (stytchUser.name?.middle_name)
    faUser.middleName = stytchUser.name?.middle_name;
  // faUser.mobilePhone = string;
  if (stytchUser.phone_numbers?.length > 0)
    faUser.mobilePhone = stytchUser.phone_numbers[0].phone_number;
  // faUser.parentEmail = string;
  // faUser.preferredLanguages = Array<string>;
  // faUser.registrations = Array<UserRegistration>;
  // faUser.tenantId = UUID;
  // faUser.timezone = string;
  // faUser.twoFactor = UserTwoFactorConfiguration;
  faUser.data = {}
  if (stytchUser.biometric_registrations?.length > 0)
    faUser.data.stytch_biometric_registrations = stytchUser.biometric_registrations;
  faUser.data.stytch_created_at = stytchUser.created_at;
  if (stytchUser.crypto_wallets?.length > 0)
    faUser.data.stytch_crypto_wallets = stytchUser.crypto_wallets;
  if (stytchUser.emails?.length > 1)
    faUser.data.stytch_emails = stytchUser.emails.filter(e => e.email != faUser.email);
  if (stytchUser.phone_numbers?.length > 1)
    faUser.data.stytch_phone_numbers = stytchUser.phone_numbers.filter(e => e.phone_number != faUser.mobilePhone);
  if (stytchUser.providers?.length > 0)
    faUser.data.stytch_providers = stytchUser.providers;
  if (stytchUser.trusted_metadata && Object.keys(stytchUser.trusted_metadata).length > 0)
    faUser.data.stytch_trusted_metadata = stytchUser.trusted_metadata;
    if (stytchUser.untrusted_metadata && Object.keys(stytchUser.untrusted_metadata).length > 0)
    faUser.data.stytch_untrusted_metadata = stytchUser.untrusted_metadata;
  faUser.data.stytch_user_id = stytchUser.user_id;
  if (stytchUser.webauthn_registrations?.length > 0)
    faUser.data.stytch_webauthn_registrations = stytchUser.webauthn_registrations;
  faUser.data.stytch_export_request_id = stytchUser.request_id;

  return faUser;
}

async function importUser(faUser, stytchUser) {
  const importRequest = { users: [faUser], validateDbConstraints: true };
  try {
    const result = await fa.importUsers(importRequest);
    if (result.wasSuccessful())
      console.log(`User ${stytchUser.user_id} imported successfully`);
    else
      console.error(`Error importing user ${stytchUser.user_id}`);
  }
  catch (e) {
    console.error(`Error importing user ${stytchUser.user_id}`);
    console.error(util.inspect(e, { showHidden: false, depth: null, colors: true }));
  }
}

function getNullOrUUIDFromUserId(id) {
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i; // "user_id": "user-test-178d8ee5-c458-4f48-a482-8fefa30a1a87",
  const match = id.match(uuidRegex);
  if (match)
    return match[0];
  return null;
}