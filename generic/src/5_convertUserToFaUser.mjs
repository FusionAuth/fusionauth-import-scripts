import { promises as fsp } from 'fs';
import * as fs from 'fs';
import parser from 'stream-json';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import Chain from 'stream-chain';

const inputFilename = 'users.json';
const outputFilename = 'faUsers.json';
const applicationId = 'e9fdb985-9173-4e01-9d73-ac2d60d1dc8e';

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
  faUser.encryptionScheme = 'salted-sha256';
  faUser.factor = 20000;
  //faUser.id = uuid
  // faUser.lastLoginInstant = number;
  faUser.password = user.hash;
  faUser.passwordChangeRequired = false;
  // faUser.passwordChangeReason = "Administrative";
  // faUser.passwordLastUpdateInstant = number;
  faUser.salt = btoa(user.salt);
  faUser.uniqueUsername = user.email;
  faUser.username = user.email;
  // faUser.usernameStatus = ContentStatus;
  // faUser.verified = user.verified;
  // faUser.verifiedInstant = number;

  // User fields ------
  faUser.active = true;
  // faUser.birthDate = string;
  // faUser.cleanSpeakId = UUID;
  // faUser.expiry = number;
  // faUser.firstName = string;
  // faUser.imageUrl = user.profilePictureUrl;
  // faUser.insertInstant = number;
  // faUser.lastName = string;
  // faUser.lastUpdateInstant = number;
  // faUser.memberships = Array<GroupMember>;
  // faUser.middleName = string;
  // faUser.mobilePhone = user.phoneNumber;
  // faUser.parentEmail = user.email;
  // faUser.preferredLanguages = Array<string>;

  faUser.registrations = [{
    'applicationId': applicationId,
    'roles': []
  }];
  faUser.tenantId = 'd7d09513-a3f5-401c-9685-34ab6c552453';
  // faUser.timezone = string;

  faUser.data = { "ImportedFromExpressJs": true };
  return faUser;
}