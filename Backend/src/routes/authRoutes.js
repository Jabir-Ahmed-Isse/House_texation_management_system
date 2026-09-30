const express = require('express');
const router = express.Router();
const { login, forgotPassword, resetPassword } = require('../controllers/authController');

// Public login endpoint
router.post('/login', login);

// Public password-reset endpoints (verification code sent via email)
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// NOTE: Public registration is DISABLED for security
// Only Super Admin can create users through POST /api/users endpoint
// This ensures only authorized users in the database can access the system

module.exports = router;

