import express from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth.js';
const router = express.Router();
const tripSchema = z.object({
    busId: z.string(),
    driverId: z.string(),
    studentId: z.string(),
    stopId: z.string(),
    tripType: z.enum(['PICKUP', 'DROPOFF']),
    scheduledTime: z.string(),
    notes: z.string().optional(),
});
const updateTripSchema = z.object({
    status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    actualTime: z.string().optional(),
    notes: z.string().optional(),
});
// Get all trips
router.get('/', async (req, res) => {
    try {
        const { page = '1', limit = '50', studentId, driverId, busId, status, tripType, startDate, endDate } = req.query;
        const where = {};
        if (studentId)
            where.studentId = studentId;
        if (driverId)
            where.driverId = driverId;
        if (busId)
            where.busId = busId;
        if (status)
            where.status = status;
        if (tripType)
            where.tripType = tripType;
        if (startDate || endDate) {
            where.scheduledTime = {};
            if (startDate) {
                where.scheduledTime.gte = new Date(startDate);
            }
            if (endDate) {
                where.scheduledTime.lte = new Date(endDate);
            }
        }
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const [trips, total] = await Promise.all([
            prisma.trip.findMany({
                where,
                include: {
                    bus: true,
                    student: {
                        include: {
                            parent: { include: { user: true } },
                        },
                    },
                    stop: true,
                    driver: { include: { user: true } },
                },
                orderBy: { scheduledTime: 'desc' },
                skip,
                take: limitNum,
            }),
            prisma.trip.count({ where }),
        ]);
        res.json({
            trips,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    }
    catch (error) {
        console.error('Error fetching trips:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get trip by ID
router.get('/:id', async (req, res) => {
    try {
        const trip = await prisma.trip.findUnique({
            where: { id: req.params.id },
            include: {
                bus: true,
                student: {
                    include: {
                        parent: { include: { user: true } },
                    },
                },
                stop: true,
                driver: { include: { user: true } },
            },
        });
        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }
        res.json(trip);
    }
    catch (error) {
        console.error('Error fetching trip:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create trip
router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const validatedData = tripSchema.parse(req.body);
        const trip = await prisma.trip.create({
            data: {
                busId: validatedData.busId,
                driverId: validatedData.driverId,
                studentId: validatedData.studentId,
                stopId: validatedData.stopId,
                tripType: validatedData.tripType,
                scheduledTime: new Date(validatedData.scheduledTime),
                notes: validatedData.notes,
            },
            include: {
                bus: true,
                student: {
                    include: {
                        parent: { include: { user: true } },
                    },
                },
                stop: true,
                driver: { include: { user: true } },
            },
        });
        res.status(201).json(trip);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid input',
                details: error.errors,
            });
        }
        console.error('Error creating trip:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update trip
router.patch('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const validatedData = updateTripSchema.parse(req.body);
        const updateData = {};
        if (validatedData.status)
            updateData.status = validatedData.status;
        if (validatedData.actualTime) {
            updateData.actualTime = new Date(validatedData.actualTime);
        }
        if (validatedData.notes !== undefined)
            updateData.notes = validatedData.notes;
        const trip = await prisma.trip.update({
            where: { id },
            data: updateData,
            include: {
                bus: true,
                student: {
                    include: {
                        parent: { include: { user: true } },
                    },
                },
                stop: true,
                driver: { include: { user: true } },
            },
        });
        res.json(trip);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid input',
                details: error.errors,
            });
        }
        console.error('Error updating trip:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete trip
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        await prisma.trip.delete({
            where: { id: req.params.id },
        });
        res.json({ message: 'Trip deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting trip:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
//# sourceMappingURL=trips.js.map