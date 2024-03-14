## Drip and bulk migration from Frontegg to FusionAuth
To use this project: 
1- From your Frontegg environment settings, grab your credentials and app id and insert them in authConfig.js
2- To run the Connector function, run the server.js ExpressJS app.
3- To download a copy of all users, run `node node downloadUsersJSON.js`, which will generate a `user_profiles.json` file in the same directory.