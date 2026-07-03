const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
let db = null;

try {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully.');
    db = getFirestore();
  } else {
    console.error('❌ Firebase Service Account JSON not found at:', serviceAccountPath);
    console.error('❌ You MUST place firebase-service-account.json in the project root to start the bot!');
  }
} catch (err) {
  console.error('❌ Error initializing Firebase:', err);
}

module.exports = db;
