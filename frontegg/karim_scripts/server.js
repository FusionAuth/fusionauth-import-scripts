const express = require('express');
const bodyParser = require('body-parser')

const { getUser, authUser } = require('./frontegg')


const app = express();
const port = 3000;
const jsonParser = bodyParser.json()

async function printResult() {
    console.log("print")
}


app.post('/', jsonParser, async (req, res) => {
    const response = await authUser(req.body.loginId, req.body.password);
    if (response.accessToken) {
        const fronteggUser = await getUser(response.userId)
        const fusionUser = transformToFusionUserObject(fronteggUser)
        res.send(JSON.stringify(fusionUser, null, 2));
    }

});

app.listen(port, function () {
    console.log(`App listening on port ${port}!`);
});

function transformToFusionUserObject(fronteggUser) {
    let epochTime = new Date(fronteggUser.createdDateTime);
    epochTime = epochTime.getTime() / 1000;
    let fusionUser = {
        id: fronteggUser.id,
        active: true,
        fullName: fronteggUser.name,
        email: fronteggUser.email,
        verified: fronteggUser.verified,
        insertInstant: epochTime,
        data: {
            frontegg: {
                tenants: fronteggUser.tenants
            }
        }
    }
    return fusionUser;
}



