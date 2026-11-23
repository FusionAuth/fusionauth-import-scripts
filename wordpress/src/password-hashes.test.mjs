import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getFaUserFromUser} from './4_convertWpUserToFaUser.mjs';

const makeUser = hash => ({
  ID: 42, user_login: 'migration-test', user_pass: hash,
  user_email: 'migration-test@example.com', user_registered: '2026-10-08 10:00:00',
  meta: [
    {meta_key: 'wp_capabilities', meta_value: 'a:1:{s:10:"subscriber";b:1;}'},
    {meta_key: 'first_name', meta_value: 'Migration'},
    {meta_key: 'last_name', meta_value: 'Test'}
  ]
});

for (const hash of [
  '$P$BVrdsW/NUuXDi0Od0uUdk2SnJHHmQ01',
  '$wp$2y$10$mdqtu8vUL5RhTRUVHLHP9OKaeqblzeqTNn4wxgRxUd5vA0P4Q9o1e',
  '$wp$2y$10$MSY8oB0Ms4NYvFFbyrsBIOOrN9MBF2V77DPlH9vPlRonW7xaXfYm.',
  '$wp$2y$10$ASvUnSLCc5juw.uvmRgOYeV098wpyU/WUtIUpcC50NAwJf9Le/EnK'
]) {
  test(`preserves ${hash.startsWith('$P') ? 'phpass' : 'WordPress bcrypt'} hash and user mapping`, () => {
    const result = getFaUserFromUser(makeUser(hash));
    assert.equal(Buffer.from(result.password, 'base64').toString(), hash);
    assert.equal(result.salt, result.password);
    assert.equal(result.encryptionScheme, 'example-wordpress-phpass');
    assert.equal(result.factor, 8);
    assert.equal(result.active, true);
    assert.equal(result.fullName, 'Migration Test');
    assert.equal(result.email, 'migration-test@example.com');
    assert.deepEqual(result.registrations[0].roles, ['Subscriber']);
    assert.equal(result.data.WordPress_ID, 42);
  });
}

test('rejects unsupported, malformed and missing hashes', () => {
  for (const hash of [undefined, null, 42, '', 'md5-hash', '$2y$10$plain-bcrypt', '$wp$2y$10$short', '$wp$2x$10$' + 'a'.repeat(53), '$wp$2y$99$' + 'a'.repeat(53)]) {
    assert.throws(() => getFaUserFromUser(makeUser(hash)), /Unsupported WordPress password hash/);
  }
});
