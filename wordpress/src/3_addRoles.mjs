import {FusionAuthClient} from '@fusionauth/typescript-client';

const applicationId = 'e9fdb985-9173-4e01-9d73-ac2d60d1dc8e';
const subscriberRoleId = '635ef5c8-54c5-4605-ba0f-add6ad1578ce';
const administratorRoleId = 'a1a9748d-b2cf-4af6-9773-f89c0ab58436';
const apiKey = 'this_really_should_be_a_long_random_alphanumeric_value_but_this_still_works';
const fusionauthUrl = 'http://localhost:9011';
const fa = new FusionAuthClient(apiKey, fusionauthUrl);

await fa.createApplicationRole(applicationId, subscriberRoleId, { role: {
    id: subscriberRoleId,
    isDefault: false,
    isSuperRole: false,
    name: 'Subscriber',
    description: 'Subscriber'
} });
await fa.createApplicationRole(applicationId, administratorRoleId, { role: {
    id: administratorRoleId,
    isDefault: false,
    isSuperRole: true,
    name: 'Administrator',
    description: 'Administrator'
} });

