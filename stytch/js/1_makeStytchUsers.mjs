// npm install bcryptjs stytch;

import * as stytch from "stytch";
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const client = new stytch.Client({
    project_id: "project-test-36510638-652a-4d3d-9a94-f0a7106582fc",
    secret: "secret-test-m89L26ZKZgDm_Ox_IukmvE-pAID9_zPBROI=",
});

await validatePasswordsFromScrypt();
setTimeout(() => {
    console.log('This should not print if scrypt callbacks worked as expected.');
}, 10000);

// await client.users.delete({user_id: 'user-test-5368c4bc-22fd-437f-bb52-37524bbc3960'});
// await client.users.delete({user_id: 'user-test-c4a17eaa-49d8-4d52-91cb-2846a6e4c39b'});
// await client.users.delete({user_id: 'user-test-2143531a-c551-4628-92b8-9ba9d591b12c'});
// process.exit();

await createUser({ email: "user1@example.com", phone_number: '+272223334444',  first_name: 'A', last_name: 'Example', password: "averylongandunguessablepasswordwithlotsofrandominfooofisjoafasnr;,n1", algorithm: 'bcrypt'});
await createUser({ email: "user2@example.com", phone_number: '+272223334445',  first_name: 'B', last_name: 'Example', password: "averylongandunguessablepasswordwithlotsofrandominfooofisjoafasnr;,n2", algorithm: 'md_5'});
await createUser({ email: "user3@example.com", phone_number: '+272223334446',  first_name: 'C', last_name: 'Example', password: "averylongandunguessablepasswordwithlotsofrandominfooofisjoafasnr;,n3", algorithm: 'sha_1'});

async function createUser(p) {
    await client.users.create({ email: p.email, phone_number: p.phone_number,  name:{first_name: p.first_name, last_name: p.last_name}});

    if (p.algorithm == 'bcrypt') {
        const hash = await bcrypt.default.hash(p.password, 0);
        await client.passwords.migrate({
            email: p.email,
            hash: hash,
            hash_type: "bcrypt"
        });
        console.log(`Hash: ${hash}`);
    }
    if (p.algorithm == 'sha_1') {
        const { salt, hash } = hashPasswordSHA1(p.password);
        await client.passwords.migrate({
            email: p.email,
            "hash": hash,
            hash_type: "sha_1",
            sha_1_config: {prepend_salt: salt}
        });
        console.log(`Salt: ${salt}`);
        console.log(`Hash: ${hash}`);
    }
    if (p.algorithm == 'md_5') {
        const { salt, hash } = hashPasswordMd5(p.password);
        await client.passwords.migrate({
            email: p.email,
            "hash": hash,
            hash_type: "md_5",
            md_5_config: {prepend_salt: salt}
        });
        console.log(`Salt: ${salt}`);
        console.log(`Hash: ${hash}`);
    }
    console.log(`Email: ${p.email}`);
    const a = await client.passwords.authenticate({ email: p.email, password: p.password });
    // console.log(a);
    // const user = await client.users.get({user_id:'user-test-6a8fce8e-468f-43fa-989b-4e47ad8642cd'});
}

function hashPasswordMd5(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('md5').update(salt + password).digest('hex');
    return { salt, hash };
}

function hashPasswordSHA1(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha1').update(salt + password).digest('hex');
    return { salt, hash };
}

function validatePasswordsFromScrypt() {


    crypto.scrypt('GfG', 'ffdgsg', 32, (err, derivedKey) => {
        if (err) throw err;
        console.log("The derived key1 is :", derivedKey);
    });
    crypto.scrypt('GeeksforGeeks', 'tfytdx', 128,
        { N: 512 }, (err, derivedKey) => {
            if (err) throw err;
            console.log("The derived key2 is :", derivedKey);
            console.log();
        });
    return;


    const password = 'averylongandunguessablepasswordwithlotsofrandominfooofisjoafasnr;,n1';
    //const salt = Buffer.from('zKia-0BdIFKCzWbzXbj3qrhBnbiWNg==', 'base64');
    const salt = 'zKia-0BdIFKCzWbzXbj3qrhBnbiWNg==';
    const hash = '8dg6AaIWPfcLTQU7lb4H-CI49dHeqaBXfFE1ogb2qRQ=';

    const cost = 1 << 15; // scryptCostParameter
    const blockSize = 8; // scryptRParameter
    const parallelization = 1; // scryptPParameter
    const keyLength = 32; // scryptKeyLengthParamenter

    console.log('go');
    crypto.scrypt(password, salt, keyLength,  (err, derivedKey) => {
    // crypto.scrypt(password, salt, keyLength, { N: cost, r: blockSize, p: parallelization }, (err, derivedKey) => {
        console.log('start');
        if (err) console.log(err);
        if (err) throw err;
        const keyBase64 = derivedKey.toString('base64');
        console.log('Computed hash:', keyBase64);
        console.log('Matches provided hash:', keyBase64 === hash);
    });
}

// Hash: $2a$10$HWAQozc2WLIIVzaR930mLOMjhyA/Dcyg5Qs75v15ZIs4pRGhoRCQu
// Email: user1@example.com

// Salt: 85d5db9129d342deed702f303cb8dbb9
// Hash: 61c826f97988f58c591c2dcddb6e7ff7
// Email: user2@example.com

// Salt: c5dbbbf3134133fa7d226ed5c3c41a7f
// Hash: 96b65533c005370f9f221fb2d961078e44c569fa
// Email: user3@example.com

// from chatgpt:
// openssl genpkey -algorithm RSA -out private_key.pem && openssl rsa -pubout -in private_key.pem -out public_key.pem

// from stytch:
// openssl pkeyutl -decrypt -inkey private_key.pem -in key.bin.enc -out key.bin;
// openssl enc -d -aes-256-cbc -in stytch-project-test-36510638-652a-4d3d-9a94-f0a7106582fc-hashes-2021-01-11.enc -out stytch_password_hashes.csv -pass file:./key.bin