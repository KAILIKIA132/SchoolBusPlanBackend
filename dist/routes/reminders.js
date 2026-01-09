import express from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { z } from 'zod';
const router = express.Router();
const reminderSchema = z.object({
    studentId: z.string().optional(),
    type: z.enum(['PICKUP', 'DROPOFF']),
    title: z.string().min(1),
    description: z.string().min(1),
    time: z.string(),
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('DAILY'),
    daysOfWeek: z.string().optional(), // JSON string array
});
// Get reminders for current user
router.get('/', authenticate, async (req, res) => {
    try {
        const reminders = await prisma.reminder.findMany({
            where: { userId: req.user.id },
            include: {
                student: true,
            },
            orderBy: { time: 'asc' },
        });
        res.json(reminders);
    }
    catch (error) {
        console.error('Error fetching reminders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get reminder by ID
router.get('/:id', authenticate, async (req, res) => {
    try {
        const reminder = await prisma.reminder.findUnique({
            where: { id: req.params.id },
            include: {
                student: true,
            },
        });
        if (!reminder) {
            return res.status(404).json({ error: 'Reminder not found' });
        }
        if (reminder.userId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        res.json(reminder);
    }
    catch (error) {
        console.error('Error fetching reminder:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create reminder
router.post('/', authenticate, async (req, res) => {
    try {
        const validatedData = reminderSchema.parse(req.body);
        // Verify student belongs to user (if studentId provided)
        if (validatedData.studentId) {
            if (req.user.role === 'PARENT') {
                const parent = await prisma.parent.findUnique({
                    where: { userId: req.user.id },
                });
                if (!parent) {
                    return res.status(404).json({ error: 'Parent not found' });
                }
                const student = await prisma.student.findUnique({
                    where: { id: validatedData.studentId },
                });
                if (!student || student.parentId !== parent.id) {
                    return res.status(403).json({ error: 'Student not found or not authorized' });
                }
            }
        }
        const reminder = await prisma.reminder.create({
            data: {
                userId: req.user.id,
                ...validatedData,
                time: new Date(validatedData.time),
            },
            include: {
                student: true,
            },
        });
        res.status(201).json(reminder);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid input',
                details: error.errors,
            });
        }
        console.error('Error creating reminder:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update reminder
router.patch('/:id', authenticate, async (req, res) => {
    try {
        const reminder = await prisma.reminder.findUnique({
            where: { id: req.params.id },
        });
        if (!reminder) {
            return res.status(404).json({ error: 'Reminder not found' });
        }
        if (reminder.userId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const validatedData = reminderSchema.partial().parse(req.body);
        const updateData = { ...validatedData };
        if (updateData.time) {
            updateData.time = new Date(updateData.time);
        }
        // Verify student belongs to user (if studentId provided)
        if (updateData.studentId) {
            if (req.user.role === 'PARENT') {
                const parent = await prisma.parent.findUnique({
                    where: { userId: req.user.id },
                });
                if (!parent) {
                    return res.status(404).json({ error: 'Parent not found' });
                }
                const student = await prisma.student.findUnique({
                    where: { id: updateData.studentId },
                });
                if (!student || student.parentId !== parent.id) {
                    return res.status(403).json({ error: 'Student not found or not authorized' });
                }
            }
        }
        const updatedReminder = await prisma.reminder.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                student: true,
            },
        });
        res.json(updatedReminder);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid input',
                details: error.errors,
            });
        }
        console.error('Error updating reminder:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete reminder
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const reminder = await prisma.reminder.findUnique({
            where: { id: req.params.id },
        });
        if (!reminder) {
            return res.status(404).json({ error: 'Reminder not found' });
        }
        if (reminder.userId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        await prisma.reminder.delete({
            where: { id: req.params.id },
        });
        res.json({ message: 'Reminder deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting reminder:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
//# sourceMappingURL=reminders.js.map