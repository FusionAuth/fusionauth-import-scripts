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
  // faUser.breachedPasswordLastCheckedInstant = number;
  // faUser.breachedPasswordStatus = BreachedPasswordStatus;
  // faUser.connectorId = UUID;
  faUser.email = user.user_email;
  faUser.encryptionScheme = 'example-wordpress-phpass';
  faUser.factor = 8;
  //faUser.id =  UUID; wordpress uses an int
  // faUser.lastLoginInstant = number;
  faUser.password = user.user_pass;
  // faUser.passwordChangeRequired = boolean;
  // faUser.passwordChangeReason = "Requested by WordPress on import";
  // faUser.passwordLastUpdateInstant = number;
  faUser.salt = user.user_pass;
  faUser.uniqueUsername = user.user_login;
  faUser.username = user.user_login;
  // faUser.usernameStatus = ContentStatus;
  faUser.verified = false;
  // faUser.verifiedInstant = number;

  // User fields ------
  const roles = phpunserialize(user.wp_capabilities);
  const hasRole = (roles != null && Object.keys(roles).length > 0 && Object.values(roles).some(value => value === true));
  faUser.active = hasRole;
  // faUser.birthDate = string;
  // faUser.cleanSpeakId = UUID;
  // faUser.expiry = number;
  if (metaKeyExists('first_name', user.meta)) faUser.firstName = getMetaValue('first_name', meta);
  // faUser.imageUrl = string;
  // faUser.insertInstant = number;
  if (metaKeyExists('last_name', user.meta)) faUser.lastName = getMetaValue('last_name', meta);
  faUser.fullName = [faUser.firstName, faUser.lastName]
    .filter(name => name !== null && name !== undefined && name !== '')
    .join(' ');
  // faUser.lastUpdateInstant = number;
  // faUser.memberships = Array<GroupMember>;
  // faUser.middleName = string;
  // faUser.mobilePhone = string;
  if (user.phone_numbers?.length > 0)
    faUser.mobilePhone = user.phone_numbers[0].phone_number;
  // faUser.parentEmail = string;
  // faUser.preferredLanguages = Array<string>;
  // faUser.registrations = Array<UserRegistration>;
  // faUser.tenantId = UUID;
  // faUser.timezone = string;
  // faUser.twoFactor = UserTwoFactorConfiguration;
  faUser.data = {}
  if (user.biometric_registrations?.length > 0)
    faUser.data.stytch_biometric_registrations = user.biometric_registrations;
  faUser.data.stytch_created_at = user.created_at;
  if (user.crypto_wallets?.length > 0)
    faUser.data.stytch_crypto_wallets = user.crypto_wallets;
  if (user.emails?.length > 1)
    faUser.data.stytch_emails = user.emails.filter(e => e.email != faUser.email);
  if (user.phone_numbers?.length > 1)
    faUser.data.stytch_phone_numbers = user.phone_numbers.filter(e => e.phone_number != faUser.mobilePhone);
  if (user.providers?.length > 0)
    faUser.data.stytch_providers = user.providers;
  if (user.trusted_metadata && Object.keys(user.trusted_metadata).length > 0)
    faUser.data.stytch_trusted_metadata = user.trusted_metadata;
    if (user.untrusted_metadata && Object.keys(user.untrusted_metadata).length > 0)
    faUser.data.stytch_untrusted_metadata = user.untrusted_metadata;
  faUser.data.stytch_user_id = user.user_id;
  if (user.webauthn_registrations?.length > 0)
    faUser.data.stytch_webauthn_registrations = user.webauthn_registrations;
  faUser.data.stytch_export_request_id = user.request_id;

  return faUser;
}

function metaKeyExists(key, meta) {
  if (!meta) return false;
  if (!meta.find(pair => pair.meta_key === key)) return false;
  return true;
}

function getMetaValue(key, meta) {
  return meta.find(pair => pair.meta_key === key).meta_value;
}