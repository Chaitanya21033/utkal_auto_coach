// Role hierarchy and permissions
const ROLE_PERMISSIONS = {
  admin: ['*'],
  line_manager: ['shifts', 'maintenance', 'quality', 'store', 'scrap', 'tasks', 'incidents'],
  production: ['shifts', 'quality', 'tasks', 'incidents'],
  quality: ['shifts', 'quality', 'tasks', 'incidents'],
  maintenance: ['shifts', 'maintenance', 'tasks', 'incidents'],
  store: ['shifts', 'store', 'scrap', 'tasks'],
  safety_hr: ['shifts', 'incidents', 'tasks'],
};

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (req.user.role === 'admin') return next();
    if (allowedRoles.includes(req.user.role)) return next();
    return res.status(403).json({ error: 'Insufficient permissions', required: allowedRoles });
  };
}

function requireModule(module) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (req.user.role === 'admin') return next();
    const perms = ROLE_PERMISSIONS[req.user.role] || [];
    if (perms.includes(module)) return next();
    return res.status(403).json({ error: `Access denied for module: ${module}` });
  };
}

module.exports = { requireRole, requireModule, ROLE_PERMISSIONS };
