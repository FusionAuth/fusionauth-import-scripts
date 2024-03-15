Vendor (that's you, the company using FrontEgg)
has Tenants (a group of users for a product, though you need only one Tenant if your company offers one service)
which has Users (people using your product)
and Accounts (a digital "person" with permissions that different humans (users) can use to interact with your service).

Create a test environment in frontegg.
In `Backoffice` - `Accounts` create an account called `a`.
In `Backoffice` - `Users` create two users called `a` and `b` assigned to account `a`. For their email address, you can use most web email addresses with an alias. For instance, if you use Gmail or ProtonMail and you email is `me@gmail.com`, you could give the two new users `me+a@gmail.com` and `me+b@gmail.com`.

In the hamburger menu on the right for each user, click `Edit user & Metadata`. Give them some JSON metadata, like `{"country": "france"}` and save.

When you receive the welcome emails for these users in your mail, verify them by clicking the link.

You're now down working on the FrontEgg web portal and have sample user data to test a migration.


Questions:

Tenants are called "Tenants" everywhere in the documentation but called "Accounts" in the web portal.

- How do I manage users in Node.js? Your documentation is contradictory and confusing.

https://www.npmjs.com/package/@frontegg/client says:

```js
const { FronteggContext } = require('@frontegg/client');

FronteggContext.init({
  FRONTEGG_CLIENT_ID: '<YOUR_CLIENT_ID>',
  FRONTEGG_API_KEY: '<YOUR_API_KEY>',
});
```

But doesn't say which object in the library I need to access users. I can see in the package `export { AuditsClient, FronteggContext, FronteggAuthenticator, withAuthentication, HttpClient, IdentityClient, EntitlementsClient, EventsClient, };` but none of them have any functions related to user management (creating, getting, updating).

Your Node.js sample project - https://github.com/frontegg-samples/nodejs-sample - has code that doesn't even exist:

```js
ContextHolder.setContext({
    FRONTEGG_CLIENT_ID: '<YOUR_CLIENT_ID>',
    FRONTEGG_API_KEY: '<YOUR_API_KEY>',
});
```

Your API documentation doesn't mention API keys and clients at all. It says you need to do vendor authentication to get a bearer token with