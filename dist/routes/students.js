import express from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
const router = express.Router();
const studentSchema = z.object({
    parentId: z.string(),
    name: z.string().min(1),
    grade: z.string().min(1),
    pickupAddress: z.string().min(1),
    dropoffAddress: z.string().min(1),
    busId: z.string().optional(),
    schoolId: z.string().optional(),
    pickupLatitude: z.number().optional(),
    pickupLongitude: z.number().optional(),
    dropoffLatitude: z.number().optional(),
    dropoffLongitude: z.number().optional(),
});
// Get all students
router.get('/', async (req, res) => {
    try {
        const students = await prisma.student.findMany({
            include: {
                parent: { include: { user: true } },
                bus: {
                    include: {
                        route: true,
                        driver: { include: { user: true } },
                    },
                },
                school: true,
            },
            orderBy: { name: 'asc' },
        });
        res.json(students);
    }
    catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get student by ID
router.get('/:id', async (req, res) => {
    try {
        const student = await prisma.student.findUnique({
            where: { id: req.params.id },
            include: {
                parent: { include: { user: true } },
                bus: {
                    include: {
                        route: true,
                        driver: { include: { user: true } },
                    },
                },
                school: true,
                trips: {
                    orderBy: { scheduledTime: 'desc' },
                    take: 10,
                },
                reminders: true,
            },
        });
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }
        res.json(student);
    }
    catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create student
router.post('/', authenticate, async (req, res) => {
    try {
        const validatedData = studentSchema.parse(req.body);
        // Parents can only create students for themselves
        if (req.user.role === 'PARENT') {
            const parent = await prisma.parent.findUnique({
                where: { userId: req.user.id },
            });
            if (!parent || parent.id !== validatedData.parentId) {
                return res.status(403).json({ error: 'Not authorized to create students for this parent' });
            }
        }
        const student = await prisma.student.create({
            data: validatedData,
            include: {
                parent: { include: { user: true } },
                bus: true,
                school: true,
            },
        });
        res.status(201).json(student);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid input',
                details: error.errors,
            });
        }
        console.error('Error creating student:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update student
router.patch('/:id', authenticate, async (req, res) => {
    try {
        const validatedData = studentSchema.partial().parse(req.body);
        // Check authorization
        if (req.user.role === 'PARENT') {
            const student = await prisma.student.findUnique({
                where: { id: req.params.id },
                include: { parent: true },
            });
            if (!student || student.parent.userId !== req.user.id) {
                return res.status(403).json({ error: 'Not authorized to update this student' });
            }
        }
        const student = await prisma.student.update({
            where: { id: req.params.id },
            data: validatedData,
            include: {
                parent: { include: { user: true } },
                bus: true,
                school: true,
            },
        });
        res.json(student);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid input',
                details: error.errors,
            });
        }
        console.error('Error updating student:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete student
router.delete('/:id', authenticate, async (req, res) => {
    try {
        // Check authorization
        if (req.user.role === 'PARENT') {
            const student = await prisma.student.findUnique({
                where: { id: req.params.id },
                include: { parent: true },
            });
            if (!student || student.parent.userId !== req.user.id) {
                return res.status(403).json({ error: 'Not authorized to delete this student' });
            }
        }
        await prisma.student.delete({
            where: { id: req.params.id },
        });
        res.json({ message: 'Student deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update student status (Driver only)
router.patch('/:id/status', authenticate, requireRole('DRIVER'), async (req, res) => {
    try {
        const { status } = req.body;
        if (!['PENDING', 'ON_BUS', 'DROPPED_OFF', 'ABSENT', 'PRESENT'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const student = await prisma.student.update({
            where: { id: req.params.id },
            data: { status },
            include: {
                parent: { include: { user: true } },
                bus: true,
            },
        });
        res.json(student);
    }
    catch (error) {
        console.error('Error updating student status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
//# sourceMappingURL=students.js.map