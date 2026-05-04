const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};

const checkPermission = (permission) => {
  return (req, res, next) => {
    // Admins have all permissions
    if (req.userRole === 'admin') return next();
    
    // Check if user has the specific permission
    if (req.userPermissions && req.userPermissions.includes(permission)) {
        return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. You need '${permission}' permission to perform this action.`
    });
  };
};

module.exports = { authorize, checkPermission };
