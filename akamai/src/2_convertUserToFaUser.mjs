import { promises as fsp } from 'fs';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import parser from 'stream-json';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import Chain from 'stream-chain';
import Pick from 'stream-json/filters/Pick.js';

const inputFilename = 'users.json';
const outputFilename = 'faUsers.json';
const applicationId = 'e9fdb985-9173-4e01-9d73-ac2d60d1dc8e';
const apiKey = '33052c8a-c283-4e96-9d2a-eb1215c69f8f-not-for-prod';
const fusionauthUrl = 'http://fa:9011';

await processUsers();

async function processUsers() {
  try {
    await fsp.writeFile(outputFilename, '[\n', 'utf8');
    const inputUsers = new Chain([fs.createReadStream(inputFilename ), Pick.withParser({filter: 'results'}), new StreamArray()]);
    let isFirstLine = true;
    for await (const { value: user } of inputUsers) {
      if (!isFirstLine) await fsp.appendFile(outputFilename, ',\n', 'utf8');
      isFirstLine = false;
      await fsp.appendFile(outputFilename, JSON.stringify(getFaUserFromUser(user)), 'utf8');
    }
    await fsp.appendFile(outputFilename, '\n]', 'utf8');
  } catch (e) {
    console.dir(e);
  }
}

// Fields are detailed here: https://fusionauth.io/docs/apis/users#request-6
function getFaUserFromUser(user) {
  const faUser = {};

  // SecureIdentity fields ------
  // faUser.breachedPasswordLastCheckedInstant = number;
  // faUser.breachedPasswordStatus = BreachedPasswordStatus;
  // faUser.connectorId = UUID;
  faUser.email = user.email;
  faUser.encryptionScheme = 'bcrypt';
  faUser.id = user.uuid
  if (user.lastLogin)
    faUser.lastLoginInstant = new Date(user.lastLogin).getTime();
  faUser.factor = user.password?.value.split('$')[2];
  faUser.password = user.password?.value.split('$')[3].substring(22);
  faUser.passwordChangeRequired = false;
  //faUser.passwordChangeReason = "Administrative";
  // faUser.passwordLastUpdateInstant = number;
  faUser.salt = user.password?.value.split('$')[3].substring(0, 22);;
  faUser.uniqueUsername = user.email;
  faUser.username = user.displayName;
  // faUser.usernameStatus = ContentStatus;
  faUser.verified = (user.emailVerified != null);
  // faUser.verifiedInstant = number;

  // User fields ------
  faUser.active = !user.deactivateAccount;
  faUser.birthDate = user.birthday;
  // faUser.cleanSpeakId = UUID;
  // faUser.expiry = number;
  faUser.firstName = user.givenName;
  faUser.imageUrl = user.profilePictureUrl;
  // faUser.insertInstant = number;
  faUser.lastName = user.familyName;
  // faUser.lastUpdateInstant = number;
  // faUser.memberships = Array<GroupMember>;
  faUser.middleName = user.middleName;
  faUser.mobilePhone = user.mobileNumber;
  // faUser.parentEmail = string;
  // faUser.preferredLanguages = Array<string>;
  if (user.roles?.length > 0) {
    faUser.registrations = [{
      'applicationId': applicationId,
      'roles': []
    }];
    for (let role of user.roles)
      faUser.registrations[0].roles.push(role.value);
  }
  faUser.tenantId = 'd7d09513-a3f5-401c-9685-34ab6c552453';
  // faUser.timezone = string;
  // faUser.twoFactor = UserTwoFactorConfiguration;

  faUser.data = {};
  faUser.data.akamaiId = user.id;
  faUser.data.createdAt = user.created;
  faUser.data.lastUpdatedAt = user.lastUpdated;
  faUser.data.accountDataRequestTime = user.accountDataRequestTime;
  faUser.data.accountDeleteRequestTime = user.accountDeleteRequestTime;
  faUser.data.birthday = user.birthday;
  faUser.data.accountDeactivatedAt = user.deactivateAccount;
  faUser.data.display = user.display;
  faUser.data.emailVerifiedAt = user.emailVerified;
  faUser.data.externalId = user.externalId;
  faUser.data.fullName = user.fullName;
  faUser.data.gender = user.gender;
  faUser.data.mobileNumberVerified = user.mobileNumberVerified;

  if (user.consents?.length > 0) {
    faUser.data.consents = [];
    for (let item of user.consents){
      faUser.data.consents.push({
        'clientId': item.marketing.clientId,
        'context' : item.marketing.context,
        'granted' : item.marketing.granted,
        'oidcClientId' : item.marketing.oidcClientId,
        'type' : item.marketing.type,
      });
    }
  }

  if (user.legalAcceptances?.length > 0) {
    faUser.data.legalAcceptances = [];
    for (let item of user.legalAcceptances){
      faUser.data.legalAcceptances.push({
        'id': item.id,
        'clientId' : item.clientId,
        'dateAccepted' : item.dateAccepted,
        'legalAcceptanceID' : item.legalAcceptanceId
      });
    }
  }

  //photos not imported

  if (user.primaryAddress?.length > 0) {
    faUser.data.addresses = [];
    for (let item of user.primaryAddress){
      faUser.data.addresses.push({
        'address1': item.address1,
        'address2' : item.address2,
        'city' : item.city,
        'company' : item.company,
        'country' : item.country,
        'phone' : item.phone,
        'stateAbbreviation' : item.stateAbbreviation,
        'zip' : item.zip,
        'zipPlus4' : item.zipPlus4
      });
    }
  }

  if (user.profiles?.length > 0) {
    faUser.data.profiles = [];
    for (let item of user.profiles) {
      faUser.data.profiles.push({
        'id': item.id,
        'domain': item.domain,
        'identifier': item.identifier,
        'photo': item.photo,
        'providerSpecifier': item.providerSpecifier
      });
    }
  }

  return faUser;
}
