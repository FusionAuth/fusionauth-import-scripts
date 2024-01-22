import * as stytch from "stytch";

const client = new stytch.Client({
    project_id: "project-test-36510638-652a-4d3d-9a94-f0a7106582fc",
    secret: "secret-test-Ww5WZPWzBGJdW44BOCq3K6VypSyjC8iO4dE=",
});

let u = await client.users.get({ user_id: "user-test-c1be12e4-fc61-4e7a-8831-0fc14cb87b65" });
console.log(u);

u = await client.users.get({ user_id: "user-test-178d8ee5-c458-4f48-a482-8fefa30a1a87" });
console.log(u);

u = await client.users.get({ user_id: "user-test-799ea981-b2bb-417f-afe8-4ab6e79fcd2a" });
console.log(u);

