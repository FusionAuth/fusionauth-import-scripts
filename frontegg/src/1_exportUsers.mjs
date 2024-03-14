const { getUsers } = require('./frontegg');

const filePath = 'user_profiles.json';

async function downloadUsersJSON() {
    const users = await getUsers()
    const jsonData = JSON.stringify(users, null, 2)
    console.log(jsonData)
    fs.writeFile(filePath, jsonData, function (error) {
        if (error) {
            return console.log(error);
        }
        console.log(`Frontegg users saved to ${filePath}!`);
    });
}

downloadUsersJSON()