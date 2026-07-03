const db = require('./database/db');
const msgs = db.prepare('SELECT role, content FROM messages ORDER BY id DESC LIMIT 5').all();
console.log(JSON.stringify(msgs, null, 2));
