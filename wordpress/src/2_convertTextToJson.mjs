import { promises as fs } from 'fs';

const input = await fs.readFile('./users.txt', 'utf8');
const lines = input.split(/\r?\n/);
const commas = lines.map((line, index) => index < lines.length - 1 ? `${line},` : line);
const output = `[${commas.join('\n')}]`;
await fs.writeFile('./users.json', output, 'utf8');