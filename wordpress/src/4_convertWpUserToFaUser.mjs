import { promises as fsp } from 'fs';
import * as fs from 'fs';
import parser from 'stream-json';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import Chain from 'stream-chain';
import phpunserialize from 'phpunserialize';

const inputFilename = 'users.json';
const outputFilename = 'faUsers.json';
const dataToIgnore = ['first_name', 'last_name', 'rich_editing', 'syntax_highlighting', 'comment_shortcuts', 'admin_color', 'use_ssl', 'show_admin_bar_front', 'wp_user_level', 'show_welcome_panel', 'session_tokens', 'wp_dashboard_quick_press_last_post_id', 'community-events-location'];
const applicationId = 'e9fdb985-9173-4e01-9d73-ac2d60d1dc8e';
const subscriberRoleId = '635ef5c8-54c5-4605-ba0f-add6ad1578ce';
const administratorRoleId = 'a1a9748d-b2cf-4af6-9773-f89c0ab58436';

processUsers();

async function processUsers() {
  await fsp.writeFile(outputFilename, '[\n', 'utf8');
  const inputUsers = new Chain([fs.createReadStream(inputFilename), parser(), new StreamArray(),]);
  let isFirstLine = true;
  for await (const { value: user } of inputUsers) {
    if (!isFirstLine)
        await fsp.appendFile(outputFilename, ',\n', 'utf8');
    isFirstLine = false;
    const faUser = getFaUserFromUser(user);
    await fsp.appendFile(outputFilename, JSON.stringify(faUser), 'utf8');
  }
  await fsp.appendFile(outputFilename, '\n]', 'utf8');
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
  faUser.password = btoa(user.user_pass); // fa requires password hash stored in base64
  // faUser.passwordChangeRequired = boolean;
  // faUser.passwordChangeReason = "Requested by WordPress on import";
  // faUser.passwordLastUpdateInstant = number;
  faUser.salt = btoa(user.user_pass); // fa requires salt stored in base64
  faUser.uniqueUsername = user.user_login;
  faUser.username = user.user_login;
  // faUser.usernameStatus = ContentStatus;
  faUser.verified = false;
  // faUser.verifiedInstant = number;

  // User fields ------
  faUser.active = false;
  let roles = {};
  if (doesMetaKeyExistInUserMeta('wp_capabilities', user.meta)) {
    roles = phpunserialize(getMetaValueFromUserMeta('wp_capabilities', user.meta));
    const hasRole = (roles != null && Object.keys(roles).length > 0 && Object.values(roles).some(value => value === true));
    faUser.active = hasRole;
  }
  // faUser.birthDate = string;
  // faUser.cleanSpeakId = UUID;
  // faUser.expiry = number;
  if (doesMetaKeyExistInUserMeta('first_name', user.meta)) faUser.firstName = getMetaValueFromUserMeta('first_name', user.meta);
  // faUser.imageUrl = string;
  // faUser.insertInstant = number;
  if (doesMetaKeyExistInUserMeta('last_name', user.meta)) faUser.lastName = getMetaValueFromUserMeta('last_name', user.meta);
  if (faUser.firstName || faUser.lastName)
    faUser.fullName = [faUser.firstName, faUser.lastName]
      .filter(name => name !== null && name !== undefined && name !== '')
      .join(' ');
  // faUser.lastUpdateInstant = number;
  // faUser.memberships = Array<GroupMember>;
  // faUser.middleName = string;
  // faUser.mobilePhone = string;
  // faUser.mobilePhone = string;
  // faUser.parentEmail = string;
  // faUser.preferredLanguages = Array<string>;

  const isSubscriber = (roles != null && Object.keys(roles).length > 0 && roles['subscriber'] == true);
  const isAdministrator = (roles != null && Object.keys(roles).length > 0 && roles['administrator'] == true);
  const faRoles = [];
  if (isAdministrator) faRoles.push(administratorRoleId);
  if (isSubscriber) faRoles.push(subscriberRoleId);
  faUser.registrations = [{
    'applicationId': applicationId,
    'roles': faRoles
  }];
  // faUser.tenantId = UUID;
  // faUser.timezone = string;
  // faUser.twoFactor = UserTwoFactorConfiguration;

  faUser.data = {}
  faUser.data.WordPress_ID = user.ID;
  if (user.user_nicename) faUser.data.WordPress_user_nicename = user.user_nicename;
  if (user.user_url) faUser.data.WordPress_user_url = user.user_url;
  faUser.data.WordPress_user_registered = user.user_registered;
  if (user.display_name) faUser.data.WordPress_display_name = user.display_name;
  user.meta.map(pair => addMetaDataToFaUserData(pair, faUser.data));
  return faUser;
}

function doesMetaKeyExistInUserMeta(key, meta) {
  if (!meta) return false;
  if (!meta.find(pair => pair.meta_key === key)) return false;
  return true;
}

function getMetaValueFromUserMeta(key, meta) {
  return meta.find(pair => pair.meta_key === key).meta_value;
}

function addMetaDataToFaUserData(pair, data) {
  if (dataToIgnore.includes(pair.meta_key)) return;
  data['WordPress_' + pair.meta_key] = pair.meta_value;
  if (isSerializedPhp(pair.meta_value))
    data['WordPress_' + pair.meta_key] = phpunserialize(pair.meta_value);
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
