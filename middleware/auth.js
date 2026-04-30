const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Agent = require('../models/Agent');
const Admin = require('../models/Admin');
const Driver = require('../models/Driver');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token, access denied'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    let user;
    if (decoded.role === 'user') {
      user = await User.findById(decoded.id);
    } else if (decoded.role === 'agent') {
      user = await Agent.findById(decoded.id);
    } else if (decoded.role === 'admin') {
      user = await Admin.findById(decoded.id);
    } else if (decoded.role === 'driver') {
      user = await Driver.findById(decoded.id);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Account is blocked'
      });
    }

    req.user = user;
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token is invalid or expired'
    });
  }
};

module.exports = auth;
