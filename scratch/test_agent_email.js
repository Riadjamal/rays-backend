require('dotenv').config({ path: '../.env' });
const mailer = require('../utils/mailer');

async function testAgentEmail() {
    try {
        console.log("Sending agent invitation test...");
        await mailer.sendAgentInvitation('areebmughal198@gmail.com', {
            companyName: 'Test Company',
            contactPerson: 'Areeb Mughal',
            token: 'testtoken123'
        });
        console.log("Agent invitation sent successfully!");
    } catch (err) {
        console.error("Agent invitation failed: ", err);
    }
}

testAgentEmail();
