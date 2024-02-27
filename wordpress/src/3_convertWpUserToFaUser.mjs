import { promises as fsp } from 'fs';
import * as fs from 'fs';
import parser from 'stream-json';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import Chain from 'stream-chain';
import phpunserialize from 'phpunserialize';

const inputFilename = 'users.json';
const outputFilename = 'faUsers.json';
const dataToIgnore = ['first_name', 'last_name', 'rich_editing', 'syntax_highlighting', 'comment_shortcuts', 'admin_color', 'use_ssl', 'show_admin_bar_front', 'wp_user_level', 'show_welcome_panel', 'session_tokens', 'wp_dashboard_quick_press_last_post_id', 'community-events-location'];

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
  faUser.active = false;
  if (metaKeyExists('wp_capabilities', user.meta)) {
    const roles = phpunserialize(getMetaValue('wp_capabilities', user.meta));
    const hasRole = (roles != null && Object.keys(roles).length > 0 && Object.values(roles).some(value => value === true));
    faUser.active = hasRole;
  }
  // faUser.birthDate = string;
  // faUser.cleanSpeakId = UUID;
  // faUser.expiry = number;
  if (metaKeyExists('first_name', user.meta)) faUser.firstName = getMetaValue('first_name', user.meta);
  // faUser.imageUrl = string;
  // faUser.insertInstant = number;
  if (metaKeyExists('last_name', user.meta)) faUser.lastName = getMetaValue('last_name', user.meta);
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
  // faUser.registrations = Array<UserRegistration>;
  // faUser.tenantId = UUID;
  // faUser.timezone = string;
  // faUser.twoFactor = UserTwoFactorConfiguration;

  faUser.data = {}
  faUser.data.WordPress_ID = user.ID;
  faUser.data.WordPress_user_nicename = user.user_nicename;
  faUser.data.WordPress_user_url = user.user_url;
  faUser.data.WordPress_user_registered = user.user_registered;
  faUser.data.WordPress_display_name = user.display_name;
  user.meta.map(pair => addMetaData(pair, faUser.data));
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

function addMetaData(pair, data) {
  if (dataToIgnore.includes(pair.meta_key)) return;
  data['WordPress_' + pair.meta_key] = pair.meta_value;
  if (isSerializedPhp(pair.meta_value))
    data['WordPress_' + pair.meta_key] = JSON.stringify(phpunserialize(pair.meta_value));
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
