const Booking = require('../models/Booking');

const ACTIVE_BOOKING_STATUSES = ['pending', 'processing', 'confirmed'];

const getUaeNow = () => {
  const now = new Date();
  const uaeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Dubai' });
  return new Date(uaeStr);
};

const normalizeDateOnly = (value) => {
  if (!value) return null;
  let d;
  if (typeof value === 'string' && value.includes('T')) {
    const uaeStr = new Date(value).toLocaleString('en-US', { timeZone: 'Asia/Dubai' });
    d = new Date(uaeStr);
  } else {
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      d = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    } else {
      d = new Date(value);
    }
  }

  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

const parseTimeParts = (timeValue = '') => {
  const raw = `${timeValue || ''}`.trim();
  if (!raw) return null;

  const match = raw.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3] ? match[3].toUpperCase() : null;

  if (meridiem) {
    if (hours === 12) {
      hours = meridiem === 'AM' ? 0 : 12;
    } else if (meridiem === 'PM') {
      hours += 12;
    }
  }

  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
};

const getTripStartDateTime = (item) => {
  const tripDate = normalizeDateOnly(item?.travelDate);
  if (!tripDate) return null;

  const chosenTime =
    item?.travelTime ||
    item?.bus?.departureTime ||
    item?.bus?.startTime ||
    item?.departureTime ||
    item?.startTime ||
    '';

  const parts = parseTimeParts(chosenTime);
  if (!parts) return tripDate;

  tripDate.setHours(parts.hours, parts.minutes, 0, 0);
  return tripDate;
};

const hasTripDeparted = (item, now = getUaeNow()) => {
  const tripStart = getTripStartDateTime(item);
  if (!tripStart) return false;
  return tripStart.getTime() <= now.getTime();
};

const isPastCalendarDate = (value, now = getUaeNow()) => {
  const requestedDate = normalizeDateOnly(value);
  const today = normalizeDateOnly(now);
  if (!requestedDate || !today) return false;
  return requestedDate.getTime() < today.getTime();
};

const isTodayDate = (value, now = getUaeNow()) => {
  const requestedDate = normalizeDateOnly(value);
  const today = normalizeDateOnly(now);
  if (!requestedDate || !today) return false;
  return requestedDate.getTime() === today.getTime();
};

const syncCompletedBookings = async (bookings = [], now = getUaeNow()) => {
  const staleBookings = bookings.filter(
    (booking) => ACTIVE_BOOKING_STATUSES.includes(booking.status) && hasTripDeparted(booking, now)
  );

  if (staleBookings.length) {
    const staleIds = staleBookings.map((booking) => booking._id);
    await Booking.updateMany(
      { _id: { $in: staleIds } },
      { $set: { status: 'completed', updatedAt: new Date() } }
    );

    staleBookings.forEach((booking) => {
      booking.status = 'completed';
    });
  }

  return bookings;
};

module.exports = {
  ACTIVE_BOOKING_STATUSES,
  getUaeNow,
  getTripStartDateTime,
  hasTripDeparted,
  isPastCalendarDate,
  isTodayDate,
  normalizeDateOnly,
  syncCompletedBookings
};
