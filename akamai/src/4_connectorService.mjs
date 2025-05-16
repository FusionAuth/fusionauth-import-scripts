// Documentation at https://fusionauth.io/docs/lifecycle/migrate-users/connectors/generic-connector

import express from 'express';

const applicationId = 'e9fdb985-9173-4e01-9d73-ac2d60d1dc8e';

const app = express();
app.use(express.json());
app.post('/', async (request, response) => {
    console.log(`Request received for ${request.body.loginId}`);
    const email = request.body.loginId;
    const password = request.body.password;
    const { isValid, user } = await isLoginValid(email, request.body.password);
    if (!isValid)
      return response.status(404).end();
    console.log('User login verified. Returning details below to FusionAuth');
    console.dir({ 'user': { ...user, 'password': password } });
  return response.status(200).json({ 'user': { ...user, 'password': password } });
});
app.listen(80, '0.0.0.0');
console.log('Service running');

async function isLoginValid(email, password) {
    try {
      const response = await fetch('https://test-env.us-dev.janraincapture.com/oauth/auth_native_traditional', {
        method: 'POST',
        headers: { 'accept': 'application/json', 'content-type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({
          client_id: '9a55jnetfgjf8mzdmjbugdmyr55tc2j9',
          flow_version: '20250502165159394037',
          flow: 'standard',
          locale: 'en-US',
          form: 'signInForm',
          redirect_uri: 'http://localhost',
          currentPassword: password,
          signInEmailAddress: email
        }).toString()
      });
      const data = await response.json();
      console.log('Data received from Akamai:');
      console.dir(data);
      if (response.status == 200 && data.stat == 'ok')
        return { 'isValid': true, 'user': getFaUserFromUser(data.capture_user)};
            else
        return { 'isValid': false, 'user': null };
    }
    catch (e) { return false; }
}

// Fields are detailed here: https://fusionauth.io/docs/apis/users#request-6
function getFaUserFromUser(user) {
  try {
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
    // faUser.factor = user.password?.value.split('$')[2];
    faUser.password = user.password?.value.split('$')[3].substring(22);
    faUser.passwordChangeRequired = false;
    //faUser.passwordChangeReason = "Administrative";
    // faUser.passwordLastUpdateInstant = number;
    // faUser.salt = user.password?.value.split('$')[3].substring(0, 22);;
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
      for (let item of user.consents) {
        faUser.data.consents.push({
          'clientId': item.marketing.clientId,
          'context': item.marketing.context,
          'granted': item.marketing.granted,
          'oidcClientId': item.marketing.oidcClientId,
          'type': item.marketing.type,
        });
      }
    }

    if (user.legalAcceptances?.length > 0) {
      faUser.data.legalAcceptances = [];
      for (let item of user.legalAcceptances) {
        faUser.data.legalAcceptances.push({
          'id': item.id,
          'clientId': item.clientId,
          'dateAccepted': item.dateAccepted,
          'legalAcceptanceID': item.legalAcceptanceId
        });
      }
    }

    //photos not imported

    if (user.primaryAddress?.length > 0) {
      faUser.data.addresses = [];
      for (let item of user.primaryAddress) {
        faUser.data.addresses.push({
          'address1': item.address1,
          'address2': item.address2,
          'city': item.city,
          'company': item.company,
          'country': item.country,
          'phone': item.phone,
          'stateAbbreviation': item.stateAbbreviation,
          'zip': item.zip,
          'zipPlus4': item.zipPlus4
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
  catch (e) {
    console.log('Error converting Akamai user to FA user:');
    console.dir(e);
  }
}
