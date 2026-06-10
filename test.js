const { getUaeNow, isTodayDate, hasTripDeparted, normalizeDateOnly } = require('./utils/tripTiming');

console.log("Current UAE Time:", getUaeNow());
console.log("Is Today (2026-06-10):", isTodayDate("2026-06-10"));

const bus = { departureTime: "14:00" };
const item = { travelDate: "2026-06-10", bus };

console.log("Has Departed (14:00):", hasTripDeparted(item));
