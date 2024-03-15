Vendor (that's you, the company using FrontEgg)
has Tenants (a group of users for a product, though you need only one Tenant if your company offers one service)
which has Users (people using your product)
and Accounts (a digital "person" with permissions that different humans (users) can use to interact with your service).

Entitlements - https://files.readme.io/0c6fed4-Screenshot_2023-07-05_at_15.55.19_1.png

Unfortunately while `GetUser` in FrontEgg will return a users' tenants and role, it won't return their features. There doesn't appear me to be an API method to get them.

Users - https://files.readme.io/10eb79c-Architecture_scheme_2.png

Create a test environment in frontegg.
In `Backoffice` - `Accounts` create an account called `a`.
In `Backoffice` - `Users` create two users called `a` and `b` assigned to account `a`. For their email address, you can use most web email addresses with an alias. For instance, if you use Gmail or ProtonMail and you email is `me@gmail.com`, you could give the two new users `me+a@gmail.com` and `me+b@gmail.com`.

In the hamburger menu on the right for each user, click `Edit user & Metadata`. Give them some JSON metadata, like `{"country": "france"}` and save.

When you receive the welcome emails for these users in your mail, verify them by clicking the link.

You're now down working on the FrontEgg web portal and have sample user data to test a migration.

