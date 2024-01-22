import * as crypto from 'crypto';

const cost = 1 << 15; // scryptCostParameter
const blockSize = 8; // scryptRParameter
const parallelization = 1; // scryptPParameter
const keyLength = 32; // scryptKeyLengthParamenter

const password2 = 'averylongandunguessablepasswordwithlotsofrandominfooofisjoafasnr;,n1';
const salt2 = 'BbV-sGQqUIX1NwE6uqtSITv4fa1iMw==';
const hash2 = 'uiOC_BwbKta9R9QL6Ss6KTDpCcULh9_zhObl5j4398M=';

crypto.scrypt(password2, salt2, keyLength, { N: cost, r: blockSize, p: parallelization, maxmem: 1024 * 1024 * 1024*50 }, (err, derivedKey) => {
    if (err) throw err;
    const keyBase64 = derivedKey.toString('base64').replace(/\+/g, '-').replace(/\//g, '_') // uiOC_BwbKta9R9QL6Ss6KTDpCcULh9_zhObl5j4398M=
    console.log('Computed hash:', keyBase64);
    console.log('Matches provided hash:', keyBase64 === hash2);
});

const password = 'averylongandunguessablepasswordwithlotsofrandominfooofisjoafasnr;,n2';
const salt = 'zKia-0BdIFKCzWbzXbj3qrhBnbiWNg==';
const hash = '8dg6AaIWPfcLTQU7lb4H-CI49dHeqaBXfFE1ogb2qRQ=';

crypto.scrypt(password, salt, keyLength, { N: cost, r: blockSize, p: parallelization, maxmem: 1024 * 1024 * 1024*50 }, (err, derivedKey) => {
    if (err) throw err;
    // const keyBase64 = derivedKey.toString('base64'); // 8dg6AaIWPfcLTQU7lb4H+CI49dHeqaBXfFE1ogb2qRQ=
    const keyBase64 = derivedKey.toString('base64').replace(/\+/g, '-').replace(/\//g, '_') // 8dg6AaIWPfcLTQU7lb4H-CI49dHeqaBXfFE1ogb2qRQ=
    console.log('Computed hash:', keyBase64);
    console.log('Matches provided hash:', keyBase64 === hash);
});

const password3 = 'averylongandunguessablepasswordwithlotsofrandominfooofisjoafasnr;,n3';
const salt3 = 'XPapDAm6xdV5UhMpyPrSpy8FbfCDtA==';
const hash3 = 'A6VzdsTsTHPqafORIb0GkGD6qFxdncqwA15YXRsVgvs=';

crypto.scrypt(password3, salt3, keyLength, { N: cost, r: blockSize, p: parallelization, maxmem: 1024 * 1024 * 1024*50 }, (err, derivedKey) => {
    if (err) throw err;
    const keyBase64 = derivedKey.toString('base64').replace(/\+/g, '-').replace(/\//g, '_') //
    console.log('Computed hash:', keyBase64);
    console.log('Matches provided hash:', keyBase64 === hash3);
});