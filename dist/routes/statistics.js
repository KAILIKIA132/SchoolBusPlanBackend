import express from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
const router = express.Router();
// Get dashboard statistics
router.get('/dashboard', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const [studentCount, parentCount, driverCount, busCount, routeCount, schoolCount, todayTrips, activeTrips,] = await Promise.all([
            prisma.student.count(),
            prisma.parent.count(),
            prisma.driver.count(),
            prisma.bus.count(),
            prisma.route.count(),
            prisma.school.count(),
            prisma.trip.count({
                where: {
                    scheduledTime: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        lt: new Date(new Date().setHours(23, 59, 59, 999)),
                    },
                },
            }),
            prisma.trip.count({
                where: {
                    status: 'IN_PROGRESS',
                },
            }),
        ]);
        res.json({
            students: studentCount,
            parents: parentCount,
            drivers: driverCount,
            buses: busCount,
            routes: routeCount,
            schools: schoolCount,
            todayTrips,
            activeTrips,
        });
    }
    catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get school-specific statistics
router.get('/school/:schoolId', authenticate, async (req, res) => {
    try {
        const { schoolId } = req.params;
        const [studentCount, busCount, routeCount, todayTrips, activeTrips,] = await Promise.all([
            prisma.student.count({ where: { schoolId } }),
            prisma.bus.count({ where: { schoolId } }),
            prisma.route.count({ where: { schoolId } }),
            prisma.trip.count({
                where: {
                    bus: { schoolId },
                    scheduledTime: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        lt: new Date(new Date().setHours(23, 59, 59, 999)),
                    },
                },
            }),
            prisma.trip.count({
                where: {
                    bus: { schoolId },
                    status: 'IN_PROGRESS',
                },
            }),
        ]);
        res.json({
            students: studentCount,
            buses: busCount,
            routes: routeCount,
            todayTrips,
            activeTrips,
        });
    }
    catch (error) {
        console.error('Error fetching school statistics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get trips chart data (last 7 days)
router.get('/trips/chart', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const days = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            const [picked, dropped] = await Promise.all([
                prisma.trip.count({
                    where: {
                        tripType: 'PICKUP',
                        status: 'COMPLETED',
                        actualTime: {
                            gte: date,
                            lt: nextDate,
                        },
                    },
                }),
                prisma.trip.count({
                    where: {
                        tripType: 'DROPOFF',
                        status: 'COMPLETED',
                        actualTime: {
                            gte: date,
                            lt: nextDate,
                        },
                    },
                }),
            ]);
            days.push({
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                picked,
                dropped,
            });
        }
        res.json(days);
    }
    catch (error) {
        console.error('Error fetching chart data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
//# sourceMappingURL=statistics.js.map