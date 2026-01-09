import express from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
const router = express.Router();
// Get trip logs (activity logs)
router.get('/', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const { page = '1', limit = '50', studentId, driverId, busId, status, tripType, startDate, endDate, } = req.query;
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
                    driver: { include: { user: true } },
                    student: {
                        include: {
                            parent: { include: { user: true } },
                        },
                    },
                    stop: true,
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum,
            }),
            prisma.trip.count({ where }),
        ]);
        // Transform to log format
        const logs = trips.map((trip) => ({
            id: trip.id,
            location: 'BUS',
            busStatus: trip.status === 'COMPLETED' ? 'PICKED' : trip.status,
            locationText: `Bus ${trip.status === 'COMPLETED' ? 'picked' : trip.status.toLowerCase()} ${trip.student.name} from ${trip.stop.name}`,
            studentId: trip.student.id,
            studentName: trip.student.name,
            driverId: trip.driver.id,
            driverName: trip.driver.user.name,
            busId: trip.bus.id,
            busNumber: trip.bus.busNumber,
            tripType: trip.tripType,
            status: trip.status,
            createdAt: trip.createdAt.toISOString().replace('T', ' ').substring(0, 19),
        }));
        res.json({
            logs,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    }
    catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
//# sourceMappingURL=logs.js.map