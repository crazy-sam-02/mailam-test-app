/*
  Diagnostic script: prints tests and key fields to help debug "tests not displayed" issues.
  Usage:
    Set MONGO_URI environment variable or ensure .env is configured.
    From backend folder:
      node scripts/inspect-tests.js
*/

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const Test = require('../src/models/Test');

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/scholar-shield';
  console.log('Connecting to', uri);
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

  const tests = await Test.find().lean().limit(200);
  if (!tests || tests.length === 0) {
    console.log('No tests found in the database.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${tests.length} tests. Showing key fields:`);
  for (const t of tests) {
    console.log('---');
    console.log('id:', t._id?.toString());
    console.log('title:', t.title);
    console.log('createdBy:', t.createdBy, 'createdByModel:', t.createdByModel);
    console.log('assignedTo.departments:', Array.isArray(t.assignedTo?.departments) ? JSON.stringify(t.assignedTo.departments) : String(t.assignedTo?.departments));
    console.log('assignedTo.semester:', t.assignedTo?.semester);
    console.log('startAt:', t.startAt);
    console.log('endAt:', t.endAt);
    console.log('questions count:', Array.isArray(t.questions) ? t.questions.length : 0);
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
