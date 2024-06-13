import {FusionAuthClient} from '@fusionauth/typescript-client';

const applicationId = 'e9fdb985-9173-4e01-9d73-ac2d60d1dc8e';
const subscriberRoleId = '635ef5c8-54c5-4605-ba0f-add6ad1578ce';
const administratorRoleId = 'a1a9748d-b2cf-4af6-9773-f89c0ab58436';
const apiKey = '33052c8a-c283-4e96-9d2a-eb1215c69f8f-not-for-prod';
const fusionauthUrl = 'http://localhost:9011';
const fa = new FusionAuthClient(apiKey, fusionauthUrl);

await fa.createApplicationRole(applicationId, subscriberRoleId, { role: {
    id: subscriberRoleId,
    isDefault: false,
    isSuperRole: false,
    name: 'ReadOnly',
    description: 'ReadOnly from FrontEgg'
} });
await fa.createApplicationRole(applicationId, administratorRoleId, { role: {
    id: administratorRoleId,
    isDefault: false,
    isSuperRole: true,
    name: 'Administrator',
    description: 'Administrator from FrontEgg'
} });