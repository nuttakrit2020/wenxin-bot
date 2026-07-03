require('dotenv').config();
const { translateText } = require('./services/openrouter');
translateText('hello', 'translate to thai').then(console.log).catch(console.error);
