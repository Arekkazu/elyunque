const router = require('express').Router();
const { asyncHandler } = require('../config/httpError');
const { login } = require('../services/authService');
const { rules } = require('../middlewares/validate');
const { loginLimiter } = require('../middlewares/rateLimit');

router.post(
  '/login',
  loginLimiter,
  rules.login,
  asyncHandler(async (req, res) => {
    res.json(await login(req.body.email, req.body.password));
  })
);

module.exports = router;
