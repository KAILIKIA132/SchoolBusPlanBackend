import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { z } from 'zod';
const router = express.Router();
// In-memory settings storage (in production, store in database)
const systemSettings = {
    companyName: 'School Transport System',
    companyEmail: 'admin@school.com',
    companyPhone: '+254700000000',
    companyAddress: 'Nairobi, Kenya',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpFrom: 'noreply@school.com',
    smsProvider: 'twilio',
    smsApiKey: '',
    notificationEnabled: true,
    locationUpdateInterval: 30, // seconds
    reminderEnabled: true,
    defaultLanguage: 'en',
};
const settingsSchema = z.object({
    companyName: z.string().optional(),
    companyEmail: z.string().email().optional(),
    companyPhone: z.string().optional(),
    companyAddress: z.string().optional(),
    smtpHost: z.string().optional(),
    smtpPort: z.number().optional(),
    smtpUser: z.string().optional(),
    smtpPassword: z.string().optional(),
    smtpFrom: z.string().email().optional(),
    smsProvider: z.string().optional(),
    smsApiKey: z.string().optional(),
    notificationEnabled: z.boolean().optional(),
    locationUpdateInterval: z.number().optional(),
    reminderEnabled: z.boolean().optional(),
    defaultLanguage: z.string().optional(),
});
// Get system settings
router.get('/', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        res.json(systemSettings);
    }
    catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update system settings
router.patch('/', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const validatedData = settingsSchema.parse(req.body);
        // Update settings
        Object.assign(systemSettings, validatedData);
        res.json({
            message: 'Settings updated successfully',
            settings: systemSettings,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid input',
                details: error.errors,
            });
        }
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
//# sourceMappingURL=settings.js.map