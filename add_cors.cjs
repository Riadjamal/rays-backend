const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');
c = c.replace("'http://localhost:3002',", "'http://localhost:3002',\n  'http://localhost:5173',");
fs.writeFileSync('server.js', c);
console.log('Added 5173 to CORS!');
