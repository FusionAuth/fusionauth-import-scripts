import { promises as fs } from 'fs';
import * as fs from 'fs';
import util from 'util';
import {FusionAuthClient} from '@fusionauth/typescript-client';
import parser from 'stream-json';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import Chain from 'stream-chain';
import * as phpunserialize from 'phpunserialize';

const inputFilename = 'users.json';
const outputFilename = 'faUsers.json';

processUsers();

async function processUsers() {
  await fs.writeFile(outputFilename, '[\n', 'utf8');
  const inputUsers = new Chain([fs.createReadStream(inputFilename), parser(), new StreamArray(),]);
  let isFirstLine = true;
  for await (const { value: user } of inputUsers) {
    if (!isFirstLine)
        await fs.appendFile(outputFilename, ',\n', 'utf8');
    isFirstLine = false;
    const faUser = getFaUserFromUser(user);
    await fs.appendFile(outputFilename, JSON.stringify(faUser), 'utf8');
  }
  await fs.appendFile(outputFilename, '\n]', 'utf8');
}

function isSerializedPhp(value) {
  if (typeof value !== 'string')
    return false;
  const trimmedValue = value.trim();
  return (
    (trimmedValue.startsWith('a:') || trimmedValue.startsWith('O:')) &&
    trimmedValue.endsWith('}') &&
    trimmedValue.includes('{')
  );
}

function getFaUserFromUser(user) {
  const faUser = {};

  // SecureIdentity fields ------
  if (!user.user_pass.startsWith('$P'))
    throw new Error("Handle hash algorithms other than Phpass by searching for this error message and adding a new encryptionScheme.");
  faUser.password = user.user_pass;
  faUser.salt = user.user_pass;
  faUser.encryptionScheme = 'example-wordpress-phpass';

  TODO HERE

  // faUser.breachedPasswordLastCheckedInstant = number;
  // faUser.breachedPasswordStatus = BreachedPasswordStatus;
  // faUser.connectorId = UUID;

  faUser.factor = 8;
  faUser.id = getNullOrUUIDFromUserId(stytchUser.user_id);
  // faUser.lastLoginInstant = number;
  faUser.passwordChangeRequired = stytchUser.password?.requires_reset;
  if (faUser.passwordChangeRequired)
    faUser.passwordChangeReason = "Requested by Stytch on import";
  // faUser.passwordLastUpdateInstant = number;
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

function getNullOrUUIDFromUserId(id) {
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i; // "user_id": "user-test-178d8ee5-c458-4f48-a482-8fefa30a1a87",
  const match = id.match(uuidRegex);
  if (match)
    return match[0];
  return null;
}