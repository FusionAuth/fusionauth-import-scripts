import {FusionAuthClient} from '@fusionauth/typescript-client';
import parser from 'stream-json';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import Chain from 'stream-chain';
import * as fs from "fs";
import util from 'util'

const apiKey = '33052c8a-c283-4e96-9d2a-eb1215c69f8f-not-for-prod';
const fusionauthUrl = 'http://localhost:9011';
const tenantId = 'd7d09513-a3f5-401c-9685-34ab6c552453';
const filename = 'faUsers.json';
const batchSize = 100; // Import in batches
const fa = new FusionAuthClient(apiKey, fusionauthUrl, tenantId);

console.log('Starting bulk import with streaming...');

processUsersBulk();

async function processUsersBulk() {
  const users = new Chain([fs.createReadStream(filename), parser(), new StreamArray(),]);
  let batch = [];
  let totalProcessed = 0;
  let totalImported = 0;
  let totalErrors = 0;

  for await (const { value: user } of users) {
    batch.push(user);
    totalProcessed++;

    // Process batch when it reaches the batch size
    if (batch.length >= batchSize) {
      const result = await importUserBatch(batch, Math.ceil(totalProcessed / batchSize));
      if (result.success) {
        totalImported += batch.length;
      } else {
        totalErrors += batch.length;
      }
      batch = []; // Reset batch
    }
  }

  // Process remaining users in the last batch
  if (batch.length > 0) {
    const result = await importUserBatch(batch, Math.ceil(totalProcessed / batchSize));
    if (result.success) {
      totalImported += batch.length;
    } else {
      totalErrors += batch.length;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Bulk Import Summary:');
  console.log(`Total users processed: ${totalProcessed}`);
  console.log(`Successfully imported: ${totalImported}`);
  console.log(`Failed: ${totalErrors}`);
  console.log('='.repeat(50));
}

async function importUserBatch(users, batchNumber) {
  try {
    console.log(`Importing batch ${batchNumber} (${users.length} users)...`);
    
    const importRequest = { users: users, validateDbConstraints: true };
    const result = await fa.importUsers(importRequest);
    
    if (result.wasSuccessful()) {
      console.log(`✓ Batch ${batchNumber} imported successfully`);
      return { success: true };
    } else {
      console.error(`✗ Batch ${batchNumber} import failed`);
      console.error(util.inspect(result.errorResponse, { showHidden: false, depth: null, colors: true }));
      return { success: false, error: result.errorResponse };
    }
  } catch (e) {
    console.error(`✗ Batch ${batchNumber} import error`);
    console.error(util.inspect(e, { showHidden: false, depth: null, colors: true }));
    return { success: false, error: e.message };
  }
} 