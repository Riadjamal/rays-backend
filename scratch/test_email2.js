require('dotenv').config({ path: '.env' });
const mailer = require('./utils/mailer');

async function testAgentEmail() {
    try {
        console.log("Sending agent invitation test to areebmughal198@gmail.com...");
        await mailer.sendAgentInvitation('areebmughal198@gmail.com', {
            companyName: 'Test Company',
            contactPerson: 'Areeb Mughal',
            token: 'testtoken123'
        });
        console.log("Finished sending.");
    } catch (err) {
        console.error("Test script failed: ", err);
    }
}

testAgentEmail();
