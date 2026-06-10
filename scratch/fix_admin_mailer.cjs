const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../controllers/adminController.js');

let content = fs.readFileSync(targetPath, 'utf8');

// Replace await mailer.sendAgentInvitation
content = content.replace(
    /await mailer\.sendAgentInvitation\(/g,
    `mailer.sendAgentInvitation(`
);

// Replace await mailer.sendMail
content = content.replace(
    /await mailer\.sendMail\(/g,
    `mailer.sendMail(`
);

fs.writeFileSync(targetPath, content, 'utf8');
console.log("Fixed adminController.js mailer calls successfully.");
