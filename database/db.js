const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
const rootPath = path.join(process.cwd(), 'firebase-service-account.json');
let db = null;

try {
  let serviceAccount = null;

  if (process.env.FIREBASE_CREDENTIALS) {
    serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    console.log('Using Firebase credentials from Environment Variable');
  } else if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = require(serviceAccountPath);
    console.log('Using Firebase credentials from __dirname');
  } else if (fs.existsSync(rootPath)) {
    serviceAccount = require(rootPath);
    console.log('Using Firebase credentials from process.cwd()');
  } else {
    console.error('❌ Firebase Service Account JSON not found at:', serviceAccountPath);
    console.error('❌ You MUST place firebase-service-account.json in the project root to start the bot!');
  }

  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully.');
    db = getFirestore();
  }
} catch (err) {
  console.error('❌ Error initializing Firebase:', err);
}

module.exports = db;
