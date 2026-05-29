const fs = require('fs');

const controllerPath = 'controllers/adminController.js';
const routesPath = 'routes/adminRoutes.js';

let ctrl = fs.readFileSync(controllerPath, 'utf8');
const updateFn = `
exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, phone, role, permissions } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (permissions) user.permissions = permissions;
    
    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUserPermissions`;

if (!ctrl.includes('exports.updateUser = async')) {
  ctrl = ctrl.replace('exports.updateUserPermissions', updateFn);
  fs.writeFileSync(controllerPath, ctrl);
  console.log('Patched adminController.js');
}

let routes = fs.readFileSync(routesPath, 'utf8');
if (!routes.includes('router.put(\'/users/:id\',')) {
  const replacement = `router.post('/users', checkPermission('users'), adminController.createUser);
router.put('/users/:id', checkPermission('users'), adminController.updateUser);`;
  routes = routes.replace("router.post('/users', checkPermission('users'), adminController.createUser);", replacement);
  fs.writeFileSync(routesPath, routes);
  console.log('Patched adminRoutes.js');
}
