const Setting = require('../models/Setting');

// Get setting by key
exports.getSetting = async (req, res) => {
  try {
    const { key } = req.params;
    let setting = await Setting.findOne({ key });
    
    // Default values if not found
    if (!setting && key === 'bank_details') {
        setting = {
            key: 'bank_details',
            value: {
                bankName: 'Emirates NBD',
                accountName: 'Rays International Express Services',
                accountNumber: '1234567890',
                iban: 'AE07 0331 2345 6789 0123 456'
            }
        };
    }

    res.json({
      success: true,
      data: setting
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update or create setting
exports.updateSetting = async (req, res) => {
  try {
    const { key, value } = req.body;
    
    let setting = await Setting.findOneAndUpdate(
      { key },
      { value, updatedBy: req.userId },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: setting
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
