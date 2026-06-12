const axios = require('axios');

async function test() {
    try {
        const res = await axios.get('http://localhost:5000/api/buses?route=DXB&date=2026-06-11&isActive=true');
        console.log("Success:", res.data);
    } catch (e) {
        console.error("Error:", e.response ? e.response.data : e.message);
    }
}

test();
