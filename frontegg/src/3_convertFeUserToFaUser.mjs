import { promises as fsp } from 'fs';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import parser from 'stream-json';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import Chain from 'stream-chain';

const inputFilename = 'users.json';
const outputFilename = 'faUsers.json';
const applicationId = 'e9fdb985-9173-4e01-9d73-ac2d60d1dc8e';
const readonlyRoleName = 'ReadOnly';
const administratorRoleName = 'Administrator';

processUsers();

async function processUsers() {
  await fsp.writeFile(outputFilename, '[\n', 'utf8');
  const inputUsers = new Chain([fs.createReadStream(inputFilename), parser(), new StreamArray(),]);
  let isFirstLine = true;
  for await (const { value: user } of inputUsers) {
    if (!isFirstLine) await fsp.appendFile(outputFilename, ',\n', 'utf8');
    isFirstLine = false;
    await fsp.appendFile(outputFilename, JSON.stringify(getFaUserFromUser(user)), 'utf8');
  }
  await fsp.appendFile(outputFilename, '\n]', 'utf8');
}

// Fields are detailed here: https://fusionauth.io/docs/apis/users#request-6
function getFaUserFromUser(user) {
  const faUser = {};

  // SecureIdentity fields ------
  // faUser.breachedPasswordLastCheckedInstant = number;
  // faUser.breachedPasswordStatus = BreachedPasswordStatus;
  // faUser.connectorId = UUID;
  faUser.email = user.email;
  // faUser.encryptionScheme = string;
  //faUser.factor = int;
  faUser.id = user.id
  // faUser.lastLoginInstant = number;
  faUser.password = uuidv4(); // random plaintext password as user will change on login
  faUser.passwordChangeRequired = true;
  faUser.passwordChangeReason = "Administrative";
  // faUser.passwordLastUpdateInstant = number;
  // faUser.salt = bytes
  faUser.uniqueUsername = user.email;
  faUser.username = user.name;
  // faUser.usernameStatus = ContentStatus;
  faUser.verified = user.verified;
  // faUser.verifiedInstant = number;

  // User fields ------
  faUser.active = !user.isLocked;
  // faUser.birthDate = string;
  // faUser.cleanSpeakId = UUID;
  // faUser.expiry = number;
  // faUser.firstName = string;
  faUser.imageUrl = user.profilePictureUrl;
  // faUser.insertInstant = number;
  // faUser.lastName = string;
  // faUser.lastUpdateInstant = number;
  // faUser.memberships = Array<GroupMember>;
  // faUser.middleName = string;
  faUser.mobilePhone = user.phoneNumber;
  // faUser.parentEmail = string;
  // faUser.preferredLanguages = Array<string>;

  const isReadOnly = (user.tenants != null && user.tenants.length == 1 && user.tenants[0].roles != null && user.tenants[0].roles.find(r => r.key == "ReadOnly"));
  const isAdministrator = (user.tenants != null && user.tenants.length == 1 && user.tenants[0].roles != null && user.tenants[0].roles.find(r => r.key == "Admin"));
  const faRoles = [];
  if (isAdministrator) faRoles.push(administratorRoleName);
  if (isReadOnly) faRoles.push(readonlyRoleName);
  faUser.registrations = [{
    'applicationId': applicationId,
    'roles': faRoles
  }];
  faUser.tenantId = 'd7d09513-a3f5-401c-9685-34ab6c552453';  // TODO: user.TenantId and user.tenantIds
  // faUser.timezone = string;
  faUser.twoFactor = user.mfaEnrolled;

  faUser.data = {};
  faUser.data.fronteggMetadata = user.metadata;
  return faUser;
}