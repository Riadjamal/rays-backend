const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;
const PASSPORT_REGEX = /^[A-Z0-9]{6,20}$/;

const normalizePassportNumber = (value = '') => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

const isVisaDocumentRequired = (productType = '') => {
  const normalized = String(productType || '').toLowerCase();
  return ['oman', 'uae', 'saudi', 'visa', 'b2b', 'extension'].some((token) => normalized.includes(token));
};

const isValidDate = (value) => value && !Number.isNaN(new Date(value).getTime());

const validateBookingPayload = (payload, options = {}) => {
  const errors = [];
  const requireDocuments = options.requireDocuments !== false;
  const normalizedPassport = normalizePassportNumber(payload.passportNumber || payload.passportDetails?.number || '');
  const email = payload.emailId || payload.customerEmail || payload.contactDetails?.emailId || '';
  const mobileNumber = payload.mobileNumber || payload.customerPhone || payload.contactDetails?.mobileNumber || '';
  const whatsAppNumber = payload.whatsAppNumber || payload.whatsappNumber || payload.contactDetails?.whatsAppNumber || '';
  const productType = payload.productType || '';
  const passportFile = payload.passportFile || payload.documents?.passport;
  const photoFile = payload.photoFile || payload.documents?.photo;
  const currentVisaFile = payload.uaeVisaFile || payload.documents?.currentVisa || payload.documents?.uaeVisa;

  if (!payload.firstName?.trim()) errors.push('First name is required');
  if (!payload.lastName?.trim()) errors.push('Last name is required');

  if (!isValidDate(payload.travelDate)) {
    errors.push('A valid travel date is required');
  } else {
    const travelDate = new Date(payload.travelDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    travelDate.setHours(0, 0, 0, 0);
    if (travelDate < today) errors.push('Travel date cannot be in the past');
  }

  if (!['SHJ', 'DXB'].includes(payload.location)) {
    errors.push('Location must be SHJ or DXB');
  }

  if (!payload.dateOfBirth || !isValidDate(payload.dateOfBirth)) {
    errors.push('A valid date of birth is required');
  } else if (new Date(payload.dateOfBirth) >= new Date()) {
    errors.push('Date of birth must be in the past');
  }

  if (!EMAIL_REGEX.test(String(email).trim())) errors.push('A valid email address is required');
  if (!PHONE_REGEX.test(String(mobileNumber).trim())) errors.push('A valid mobile number is required');
  if (String(whatsAppNumber).trim() && !PHONE_REGEX.test(String(whatsAppNumber).trim())) {
    errors.push('WhatsApp number format is invalid');
  }

  if (!PASSPORT_REGEX.test(normalizedPassport)) {
    errors.push('Passport number must be 6-20 letters or digits');
  }

  if (!payload.nationality && !payload.passportDetails?.nationality) {
    errors.push('Nationality is required');
  }

  if (!isValidDate(payload.passportExpiry)) {
    errors.push('A valid passport expiry date is required');
  } else if (isValidDate(payload.travelDate)) {
    const travelDate = new Date(payload.travelDate);
    const passportExpiry = new Date(payload.passportExpiry);
    if (passportExpiry <= travelDate) {
      errors.push('Passport expiry must be after travel date');
    }
  }

  const passengerCount = Number(payload.passengerCount || 1);
  if (!Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 6) {
    errors.push('Passenger count must be between 1 and 6');
  }

  if (payload.isReturn || payload.isReturnTrip) {
    if (!isValidDate(payload.returnDate)) {
      errors.push('A valid return date is required for return trips');
    } else if (isValidDate(payload.travelDate) && new Date(payload.returnDate) < new Date(payload.travelDate)) {
      errors.push('Return date must be on or after travel date');
    }
  }

  if (requireDocuments) {
    if (!passportFile) errors.push('Passport copy is required');
    if (!photoFile) errors.push('Personal photo is required');
    if (isVisaDocumentRequired(productType) && !currentVisaFile) {
      errors.push('Current UAE visa document is required');
    }
  }

  if (payload.paymentMethod === 'bank_transfer' && !payload.bankSlip) {
    errors.push('Bank transfer slip is required for bank transfer payments');
  }

  return {
    errors,
    normalized: {
      passportNumber: normalizedPassport
    }
  };
};

const validateBookingUpdatePayload = (payload) => {
  const errors = [];

  if (payload.travelDate && !isValidDate(payload.travelDate)) {
    errors.push('Travel date is invalid');
  }

  if (payload.location && !['SHJ', 'DXB'].includes(payload.location)) {
    errors.push('Location must be SHJ or DXB');
  }

  if (payload.passportNumber && !PASSPORT_REGEX.test(normalizePassportNumber(payload.passportNumber))) {
    errors.push('Passport number must be 6-20 letters or digits');
  }

  if (payload.firstName !== undefined && !String(payload.firstName).trim()) {
    errors.push('First name cannot be empty');
  }

  if (payload.lastName !== undefined && !String(payload.lastName).trim()) {
    errors.push('Last name cannot be empty');
  }

  return {
    errors,
    normalized: {
      passportNumber: normalizePassportNumber(payload.passportNumber || '')
    }
  };
};

module.exports = {
  validateBookingPayload,
  validateBookingUpdatePayload,
  normalizePassportNumber,
  isVisaDocumentRequired
};
