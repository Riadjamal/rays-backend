const fs = require('fs');
let content = fs.readFileSync('controllers/bookingController.js', 'utf8');

const target = `    await booking.populate('seat')
      .populate('additionalSeats');
    await booking.populate('additionalSeats');
    await booking.populate({
      path: 'bus',
      populate: { path: 'driver', select: 'name phone' }
    });`;

const targetWin = `    await booking.populate('seat')\r
      .populate('additionalSeats');\r
    await booking.populate('additionalSeats');\r
    await booking.populate({\r
      path: 'bus',\r
      populate: { path: 'driver', select: 'name phone' }\r
    });`;

const replacement = `    await booking.populate([\n      { path: 'seat' },\n      { path: 'additionalSeats' },\n      { path: 'bus', populate: { path: 'driver', select: 'name phone' } }\n    ]);`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('controllers/bookingController.js', content);
  console.log('Fixed using LF target');
} else if (content.includes(targetWin)) {
  content = content.replace(targetWin, replacement);
  fs.writeFileSync('controllers/bookingController.js', content);
  console.log('Fixed using CRLF target');
} else {
  console.log('Target not found. Looking manually...');
  // Manual string split
  let lines = content.split('\n');
  let idx = lines.findIndex(l => l.includes("await booking.populate('seat')"));
  if (idx !== -1) {
    lines.splice(idx, 7, replacement);
    fs.writeFileSync('controllers/bookingController.js', lines.join('\n'));
    console.log('Fixed manually via line splice');
  } else {
    console.log('Could not find populate block');
  }
}
