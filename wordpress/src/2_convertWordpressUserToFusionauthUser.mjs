function isSerializedPhp(value) {
    if (typeof value !== 'string') {
        return false;
    }
    const trimmedValue = value.trim();
    return (
        (trimmedValue.startsWith('a:') || trimmedValue.startsWith('O:')) &&
        trimmedValue.endsWith('}') &&
        trimmedValue.includes('{')
    );
}


// npm install bcryptjs stytch;

import * as stytch from "stytch";
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const client = new stytch.Client({
    project_id: "project-test-36510638-652a-4d3d-9a94-f0a7106582fc",
    secret: "secret-test-m89L26ZKZgDm_Ox_IukmvE-pAID9_zPBROI=",
});

await createUser({ email: "user1@example.com", phone_number: '+272223334444',  first_name: 'A', last_name: 'Example', password: "averylongandunguessablepasswordwithlotsofrandominfooofisjoafasnr;,n1", algorithm: 'bcrypt'});
await createUser({ email: "user2@example.com", phone_number: '+272223334445',  first_name: 'B', last_name: 'Example', password: "averylongandunguessablepasswordwithlotsofrandominfooofisjoafasnr;,n2", algorithm: 'md_5'});
await createUser({ email: "user3@example.com", phone_number: '+272223334446',  first_name: 'C', last_name: 'Example', password: "averylongandunguessablepasswordwithlotsofrandominfooofisjoafasnr;,n3", algorithm: 'sha_1'});

// await client.users.delete({user_id: 'user-test-REPLACE'});
// await client.users.delete({user_id: 'user-test-REPLACE'});
// await client.users.delete({user_id: 'user-test-REPLACE'});
// process.exit();

async function createUser(p) {
    console.log(`Creating user: ${p.email}`);
    await client.users.create({ email: p.email, phone_number: p.phone_number,  name:{first_name: p.first_name, last_name: p.last_name}});
    console.log(`Setting password using: ${p.algorithm}`);
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
    console.log(`Verifying email and password`);
    const a = await client.passwords.authenticate({ email: p.email, password: p.password });
    console.log('Done');
    console.log('');
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