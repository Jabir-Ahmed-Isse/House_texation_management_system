const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { createAuditLog } = require('./auditController');
const SystemSettings = require('../models/SystemSettings');
const { sendEmail } = require('../services/emailService');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.register = async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        // Get system settings for password validation
        const settings = await SystemSettings.getSettings();

        // Validate password length against system settings
        if (password.length < settings.minimumPasswordLength) {
            return res.status(400).json({
                success: false,
                message: `Password must be at least ${settings.minimumPasswordLength} characters long`
            });
        }

        if (password.length > 16) {
            return res.status(400).json({
                success: false,
                message: 'Password must not exceed 16 characters'
            });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role
        });

        res.status(201).json({
            success: true,
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        // Get system settings
        const settings = await SystemSettings.getSettings();

        const user = await User.findOne({ email });

        if (!user) {
            // Log failed login attempt
            await createAuditLog({
                userName: email,
                action: 'LOGIN_FAIL',
                targetType: 'System',
                details: `Failed login attempt for email: ${email} (User not found)`,
                ipAddress: req.ip,
                severity: 'Medium'
            });
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check if password matches
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            // Log failed login attempt
            await createAuditLog({
                userId: user._id,
                userName: user.name,
                userRole: user.role,
                action: 'LOGIN_FAIL',
                targetType: 'System',
                details: `Failed login attempt for ${user.name} (Invalid password)`,
                ipAddress: req.ip,
                severity: 'High'
            });
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check user status
        if (user.status === 'Suspended') {
            return res.status(403).json({
                message: 'Your account has been suspended. Please contact the administrator.'
            });
        }

        if (user.status === 'Inactive') {
            return res.status(403).json({
                message: 'Your account is inactive. Please contact the administrator.'
            });
        }

        // Log successful login
        await createAuditLog({
            userId: user._id,
            userName: user.name,
            userRole: user.role,
            action: 'LOGIN_SUCCESS',
            targetType: 'System',
            details: `User ${user.name} logged in successfully`,
            ipAddress: req.ip,
            severity: 'Low'
        });

        // User is valid and active, generate token
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            jurisdiction: user.jurisdiction,
            permissions: user.permissions,
            token: generateToken(user._id),
            twoFactorRequired: settings.twoFactorEnabled, // Inform frontend if 2FA is required
            message: settings.twoFactorEnabled ? 'Two-Factor Authentication is enabled for this system' : undefined
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Build the verification-code email HTML
const resetEmailHtml = (name, code) => `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1e293b;">
        <h2 style="color: #4f46e5; margin-bottom: 4px;">HomeTax Password Reset</h2>
        <p>Hello ${name || 'there'},</p>
        <p>We received a request to reset your password for the Revenue Management Console.
        Use the verification code below to continue. It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size: 34px; font-weight: 700; letter-spacing: 8px; text-align: center;
                    background: #eef2ff; color: #4338ca; padding: 18px; border-radius: 12px; margin: 24px 0;">
            ${code}
        </div>
        <p style="color: #64748b; font-size: 13px;">If you did not request this, you can safely ignore this email — your password will not change.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">House Taxation Management System · Automated message, please do not reply.</p>
    </div>
`;

// @route  POST /api/auth/forgot-password
// Generates a 6-digit code, stores its hash, and emails it to the user.
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    // Generic response so we never reveal whether an email is registered
    const genericResponse = {
        success: true,
        message: 'If an account exists for that email, a verification code has been sent.'
    };

    try {
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.json(genericResponse);
        }

        // 6-digit numeric code
        const code = ('' + Math.floor(100000 + Math.random() * 900000));
        const codeHash = crypto.createHash('sha256').update(code).digest('hex');

        user.resetPasswordCode = codeHash;
        user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await user.save();

        try {
            await sendEmail(
                user.email,
                'Your HomeTax password reset code',
                resetEmailHtml(user.name, code)
            );
        } catch (mailErr) {
            console.error('[forgotPassword] Failed to send email:', mailErr.message);
            // Roll back the code so a stuck email doesn't leave a dangling reset
            user.resetPasswordCode = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            return res.status(500).json({
                success: false,
                message: 'Could not send the verification email. Please try again later.'
            });
        }

        await createAuditLog({
            userId: user._id,
            userName: user.name,
            userRole: user.role,
            action: 'PASSWORD_RESET_REQUEST',
            targetType: 'System',
            details: `Password reset code sent to ${user.email}`,
            ipAddress: req.ip,
            severity: 'Medium'
        });

        return res.json(genericResponse);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @route  POST /api/auth/reset-password
// Verifies the emailed code and sets a new password.
exports.resetPassword = async (req, res) => {
    const { email, code, newPassword } = req.body;

    try {
        if (!email || !code || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Email, verification code, and new password are all required'
            });
        }

        const settings = await SystemSettings.getSettings();
        if (newPassword.length < settings.minimumPasswordLength) {
            return res.status(400).json({
                success: false,
                message: `Password must be at least ${settings.minimumPasswordLength} characters long`
            });
        }
        if (newPassword.length > 16) {
            return res.status(400).json({
                success: false,
                message: 'Password must not exceed 16 characters'
            });
        }

        // resetPasswordCode/Expires are select:false, so pull them explicitly
        const user = await User.findOne({ email }).select('+resetPasswordCode +resetPasswordExpires');
        if (!user || !user.resetPasswordCode || !user.resetPasswordExpires) {
            return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
        }

        if (user.resetPasswordExpires.getTime() < Date.now()) {
            user.resetPasswordCode = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
        }

        const codeHash = crypto.createHash('sha256').update('' + code).digest('hex');
        if (codeHash !== user.resetPasswordCode) {
            return res.status(400).json({ success: false, message: 'Invalid verification code' });
        }

        // All good — set the new password and clear the reset fields
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetPasswordCode = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        await createAuditLog({
            userId: user._id,
            userName: user.name,
            userRole: user.role,
            action: 'PASSWORD_RESET_SUCCESS',
            targetType: 'System',
            details: `Password reset completed for ${user.email}`,
            ipAddress: req.ip,
            severity: 'High'
        });

        return res.json({ success: true, message: 'Password has been reset. You can now log in with your new password.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};


