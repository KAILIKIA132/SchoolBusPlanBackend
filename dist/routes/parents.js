import express from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
const router = express.Router();
// Get current parent's information
router.get('/me', authenticate, requireRole('PARENT'), async (req, res) => {
    try {
        const parent = await prisma.parent.findUnique({
            where: { userId: req.user.id },
            include: {
                user: true,
                students: {
                    include: {
                        bus: {
                            include: {
                                route: {
                                    include: {
                                        stops: { orderBy: { order: 'asc' } },
                                    },
                                },
                                driver: { include: { user: true } },
                            },
                        },
                        school: true,
                    },
                },
            },
        });
        if (!parent) {
            return res.status(404).json({ error: 'Parent not found' });
        }
        res.json(parent);
    }
    catch (error) {
        console.error('Error fetching parent:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get parent's children
router.get('/me/children', authenticate, requireRole('PARENT'), async (req, res) => {
    try {
        const parent = await prisma.parent.findUnique({
            where: { userId: req.user.id },
        });
        if (!parent) {
            return res.status(404).json({ error: 'Parent not found' });
        }
        const students = await prisma.student.findMany({
            where: { parentId: parent.id },
            include: {
                bus: {
                    include: {
                        route: {
                            include: {
                                stops: { orderBy: { order: 'asc' } },
                            },
                        },
                        driver: { include: { user: true } },
                    },
                },
                school: true,
                trips: {
                    orderBy: { scheduledTime: 'desc' },
                    take: 10,
                },
            },
        });
        res.json(students);
    }
    catch (error) {
        console.error('Error fetching parent children:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get child's status and trips
router.get('/me/children/:childId/status', authenticate, requireRole('PARENT'), async (req, res) => {
    try {
        const parent = await prisma.parent.findUnique({
            where: { userId: req.user.id },
        });
        if (!parent) {
            return res.status(404).json({ error: 'Parent not found' });
        }
        const student = await prisma.student.findFirst({
            where: {
                id: req.params.childId,
                parentId: parent.id,
            },
            include: {
                bus: {
                    include: {
                        route: true,
                        driver: { include: { user: true } },
                    },
                },
                school: true,
                trips: {
                    orderBy: { scheduledTime: 'desc' },
                    take: 20,
                    include: {
                        stop: true,
                        driver: { include: { user: true } },
                    },
                },
            },
        });
        if (!student) {
            return res.status(404).json({ error: 'Child not found' });
        }
        res.json(student);
    }
    catch (error) {
        console.error('Error fetching child status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Mark child as present/absent
router.patch('/me/children/:childId/attendance', authenticate, requireRole('PARENT'), async (req, res) => {
    try {
        const { childId } = req.params;
        const { status } = req.body; // 'PRESENT' or 'ABSENT'
        if (!['PRESENT', 'ABSENT'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const parent = await prisma.parent.findUnique({
            where: { userId: req.user.id },
        });
        if (!parent) {
            return res.status(404).json({ error: 'Parent not found' });
        }
        const student = await prisma.student.findFirst({
            where: {
                id: childId,
                parentId: parent.id,
            },
        });
        if (!student) {
            return res.status(404).json({ error: 'Child not found' });
        }
        await prisma.student.update({
            where: { id: childId },
            data: { status },
        });
        res.json({ message: `Child marked as ${status.toLowerCase()}` });
    }
    catch (error) {
        console.error('Error updating attendance:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update child's pickup/dropoff location
router.patch('/me/children/:childId/location', authenticate, requireRole('PARENT'), async (req, res) => {
    try {
        const { childId } = req.params;
        const { type, latitude, longitude, address } = req.body; // type: 'pickup' or 'dropoff'
        const parent = await prisma.parent.findUnique({
            where: { userId: req.user.id },
        });
        if (!parent) {
            return res.status(404).json({ error: 'Parent not found' });
        }
        const student = await prisma.student.findFirst({
            where: {
                id: childId,
                parentId: parent.id,
            },
        });
        if (!student) {
            return res.status(404).json({ error: 'Child not found' });
        }
        const updateData = {};
        if (type === 'pickup') {
            updateData.pickupLatitude = latitude;
            updateData.pickupLongitude = longitude;
            updateData.pickupAddress = address;
        }
        else if (type === 'dropoff') {
            updateData.dropoffLatitude = latitude;
            updateData.dropoffLongitude = longitude;
            updateData.dropoffAddress = address;
        }
        const updatedStudent = await prisma.student.update({
            where: { id: childId },
            data: updateData,
        });
        res.json(updatedStudent);
    }
    catch (error) {
        console.error('Error updating location:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get all parents (Admin only)
router.get('/', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const parents = await prisma.parent.findMany({
            include: {
                user: true,
                students: {
                    include: {
                        bus: true,
                        school: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(parents);
    }
    catch (error) {
        console.error('Error fetching parents:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get parent by ID
router.get('/:id', authenticate, async (req, res) => {
    try {
        const parent = await prisma.parent.findUnique({
            where: { id: req.params.id },
            include: {
                user: true,
                students: {
                    include: {
                        bus: true,
                        school: true,
                    },
                },
            },
        });
        if (!parent) {
            return res.status(404).json({ error: 'Parent not found' });
        }
        // Only admin or the parent themselves can view
        if (req.user.role !== 'ADMIN' && parent.userId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        res.json(parent);
    }
    catch (error) {
        console.error('Error fetching parent:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create parent (Admin only) - creates user and parent profile
router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const { email, password, name, phone, address } = req.body;
        if (!email || !name) {
            return res.status(400).json({ error: 'Email and name are required' });
        }
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }
        // Create user
        const hashedPassword = password ? await bcrypt.hash(password, 10) : await bcrypt.hash('Parent123!', 10);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: 'PARENT',
                phone: phone || undefined,
            },
        });
        // Create parent profile
        const parent = await prisma.parent.create({
            data: {
                userId: user.id,
                address: address || undefined,
            },
            include: {
                user: true,
                students: true,
            },
        });
        res.status(201).json(parent);
    }
    catch (error) {
        console.error('Error creating parent:', error);
        // Handle Prisma unique constraint errors
        if (error.code === 'P2002') {
            if (error.meta?.target?.includes('userId')) {
                return res.status(400).json({ error: 'Parent profile already exists for this user' });
            }
        }
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
// Update parent (Admin only or parent themselves)
router.patch('/:id', authenticate, async (req, res) => {
    try {
        const parent = await prisma.parent.findUnique({
            where: { id: req.params.id },
        });
        if (!parent) {
            return res.status(404).json({ error: 'Parent not found' });
        }
        // Only admin or the parent themselves can update
        if (req.user.role !== 'ADMIN' && parent.userId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const { address } = req.body;
        const updateData = {};
        if (address !== undefined)
            updateData.address = address || null;
        // Also allow updating user info if admin
        if (req.user.role === 'ADMIN') {
            const { name, phone, email } = req.body;
            if (name || phone !== undefined || email) {
                const userUpdateData = {};
                if (name)
                    userUpdateData.name = name;
                if (phone !== undefined)
                    userUpdateData.phone = phone || null;
                if (email)
                    userUpdateData.email = email;
                await prisma.user.update({
                    where: { id: parent.userId },
                    data: userUpdateData,
                });
            }
        }
        const updatedParent = await prisma.parent.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                user: true,
                students: true,
            },
        });
        res.json(updatedParent);
    }
    catch (error) {
        console.error('Error updating parent:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete parent (Admin only)
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        await prisma.parent.delete({
            where: { id: req.params.id },
        });
        res.json({ message: 'Parent deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting parent:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
//# sourceMappingURL=parents.js.map