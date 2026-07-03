const db = require('./database/db');

try {
  db.exec('ALTER TABLE users ADD COLUMN custom_prompt TEXT;');
  console.log('Column custom_prompt added to users table successfully.');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('Column custom_prompt already exists.');
  } else {
    console.error('Migration error:', err);
  }
}
