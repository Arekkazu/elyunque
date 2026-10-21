const router = require('express').Router();
const { asyncHandler } = require('../config/httpError');
const { login } = require('../services/authService');

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    res.json(await login(req.body.email, req.body.password));
  })
);

module.exports = router;
