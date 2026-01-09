import express from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
const router = express.Router();
// Get current driver's information
router.get('/me', authenticate, requireRole('DRIVER'), async (req, res) => {
    try {
        const driver = await prisma.driver.findUnique({
            where: { userId: req.user.id },
            include: {
                user: true,
                bus: {
                    include: {
                        route: {
                            include: {
                                stops: { orderBy: { order: 'asc' } },
                            },
                        },
                        students: {
                            include: {
                                parent: { include: { user: true } },
                            },
                        },
                    },
                },
            },
        });
        if (!driver) {
            return res.status(404).json({ error: 'Driver not found' });
        }
        // If route has no stops, generate stops from students' pickup/dropoff locations
        const response = { ...driver };
        if (driver.bus?.route && driver.bus.route.stops.length === 0 && driver.bus.students.length > 0) {
            // Group students by pickup location to create stops
            const locationMap = new Map();
            for (const student of driver.bus.students) {
                const key = `${student.pickupAddress}|${student.pickupLatitude}|${student.pickupLongitude}`;
                if (!locationMap.has(key)) {
                    locationMap.set(key, {
                        address: student.pickupAddress,
                        latitude: student.pickupLatitude,
                        longitude: student.pickupLongitude,
                        students: [],
                    });
                }
                locationMap.get(key).students.push(student);
            }
            // Convert to stops format
            const generatedStops = Array.from(locationMap.entries()).map(([key, data], index) => ({
                id: `generated-${index}`,
                name: data.address || `Stop ${index + 1}`,
                address: data.address,
                latitude: data.latitude,
                longitude: data.longitude,
                order: index + 1,
                routeId: driver.bus.route.id,
                studentCount: data.students.length,
            }));
            // Add generated stops to the route in response
            if (response.bus?.route) {
                response.bus.route.stops = generatedStops;
            }
        }
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching driver:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get driver's assigned students
router.get('/me/students', authenticate, requireRole('DRIVER'), async (req, res) => {
    try {
        const driver = await prisma.driver.findUnique({
            where: { userId: req.user.id },
            include: { bus: true },
        });
        if (!driver || !driver.busId) {
            return res.status(404).json({ error: 'Driver or bus not found' });
        }
        const students = await prisma.student.findMany({
            where: { busId: driver.busId },
            include: {
                parent: { include: { user: true } },
                trips: {
                    where: {
                        driverId: driver.id,
                        scheduledTime: {
                            gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        },
                    },
                    orderBy: { scheduledTime: 'asc' },
                },
            },
        });
        res.json(students);
    }
    catch (error) {
        console.error('Error fetching driver students:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get driver's trips for today
router.get('/me/trips', authenticate, requireRole('DRIVER'), async (req, res) => {
    try {
        const driver = await prisma.driver.findUnique({
            where: { userId: req.user.id },
        });
        if (!driver) {
            return res.status(404).json({ error: 'Driver not found' });
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const trips = await prisma.trip.findMany({
            where: {
                driverId: driver.id,
                scheduledTime: {
                    gte: today,
                    lt: tomorrow,
                },
            },
            include: {
                bus: true,
                student: {
                    include: {
                        parent: { include: { user: true } },
                    },
                },
                stop: true,
            },
            orderBy: { scheduledTime: 'asc' },
        });
        res.json(trips);
    }
    catch (error) {
        console.error('Error fetching driver trips:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update student pickup status (Driver)
router.post('/pickup/:studentId', authenticate, requireRole('DRIVER'), async (req, res) => {
    try {
        const { studentId } = req.params;
        // Verify driver owns this student
        const driver = await prisma.driver.findUnique({
            where: { userId: req.user.id },
            include: { bus: true },
        });
        if (!driver || !driver.busId) {
            return res.status(403).json({ error: 'No assigned bus' });
        }
        const student = await prisma.student.findUnique({
            where: { id: studentId },
        });
        if (!student || student.busId !== driver.busId) {
            return res.status(403).json({ error: 'Student not assigned to your bus' });
        }
        // Update student status
        await prisma.student.update({
            where: { id: studentId },
            data: { status: 'ON_BUS' },
        });
        // Update trip status
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await prisma.trip.updateMany({
            where: {
                studentId,
                driverId: driver.id,
                tripType: 'PICKUP',
                scheduledTime: {
                    gte: today,
                },
            },
            data: {
                status: 'COMPLETED',
                actualTime: new Date(),
            },
        });
        // Create notification for parent
        const parent = await prisma.parent.findUnique({
            where: { id: student.parentId },
        });
        if (parent) {
            await prisma.notification.create({
                data: {
                    userId: parent.userId,
                    title: 'Student Picked Up',
                    message: `${student.name} has been picked up from the bus stop.`,
                },
            });
        }
        res.json({ message: 'Student pickup recorded successfully' });
    }
    catch (error) {
        console.error('Error recording pickup:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update student dropoff status (Driver)
router.post('/dropoff/:studentId', authenticate, requireRole('DRIVER'), async (req, res) => {
    try {
        const { studentId } = req.params;
        // Verify driver owns this student
        const driver = await prisma.driver.findUnique({
            where: { userId: req.user.id },
            include: { bus: true },
        });
        if (!driver || !driver.busId) {
            return res.status(403).json({ error: 'No assigned bus' });
        }
        const student = await prisma.student.findUnique({
            where: { id: studentId },
        });
        if (!student || student.busId !== driver.busId) {
            return res.status(403).json({ error: 'Student not assigned to your bus' });
        }
        // Update student status
        await prisma.student.update({
            where: { id: studentId },
            data: { status: 'DROPPED_OFF' },
        });
        // Update trip status
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await prisma.trip.updateMany({
            where: {
                studentId,
                driverId: driver.id,
                tripType: 'DROPOFF',
                scheduledTime: {
                    gte: today,
                },
            },
            data: {
                status: 'COMPLETED',
                actualTime: new Date(),
            },
        });
        // Create notification for parent
        const parent = await prisma.parent.findUnique({
            where: { id: student.parentId },
        });
        if (parent) {
            await prisma.notification.create({
                data: {
                    userId: parent.userId,
                    title: 'Student Dropped Off',
                    message: `${student.name} has been dropped off at the destination.`,
                },
            });
        }
        res.json({ message: 'Student dropoff recorded successfully' });
    }
    catch (error) {
        console.error('Error recording dropoff:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get all drivers (Admin only)
router.get('/', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const drivers = await prisma.driver.findMany({
            include: {
                user: true,
                bus: {
                    include: {
                        route: true,
                        school: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(drivers);
    }
    catch (error) {
        console.error('Error fetching drivers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get driver by ID
router.get('/:id', authenticate, async (req, res) => {
    try {
        const driver = await prisma.driver.findUnique({
            where: { id: req.params.id },
            include: {
                user: true,
                bus: {
                    include: {
                        route: true,
                        school: true,
                    },
                },
            },
        });
        if (!driver) {
            return res.status(404).json({ error: 'Driver not found' });
        }
        // Only admin or the driver themselves can view
        if (req.user.role !== 'ADMIN' && driver.userId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        res.json(driver);
    }
    catch (error) {
        console.error('Error fetching driver:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create driver (Admin only) - creates user and driver profile
router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        const { email, password, name, phone, licenseNumber, busId } = req.body;
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
        // Check if bus is already assigned to another driver
        if (busId) {
            const existingDriverWithBus = await prisma.driver.findUnique({
                where: { busId },
            });
            if (existingDriverWithBus) {
                return res.status(400).json({
                    error: 'This bus is already assigned to another driver',
                    details: `Bus is currently assigned to driver ID: ${existingDriverWithBus.id}`
                });
            }
        }
        // Create user
        const hashedPassword = password ? await bcrypt.hash(password, 10) : await bcrypt.hash('Driver123!', 10);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: 'DRIVER',
                phone: phone || undefined,
            },
        });
        // Create driver profile
        const driver = await prisma.driver.create({
            data: {
                userId: user.id,
                licenseNumber: licenseNumber || `LIC-${Date.now()}`,
                busId: busId || undefined,
            },
            include: {
                user: true,
                bus: {
                    include: {
                        route: true,
                        school: true,
                    },
                },
            },
        });
        res.status(201).json(driver);
    }
    catch (error) {
        console.error('Error creating driver:', error);
        // Handle Prisma unique constraint errors
        if (error.code === 'P2002') {
            if (error.meta?.target?.includes('licenseNumber')) {
                return res.status(400).json({ error: 'License number already exists' });
            }
            if (error.meta?.target?.includes('busId')) {
                return res.status(400).json({ error: 'This bus is already assigned to another driver' });
            }
            if (error.meta?.target?.includes('userId')) {
                return res.status(400).json({ error: 'Driver profile already exists for this user' });
            }
        }
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
// Update driver (Admin only or driver themselves)
router.patch('/:id', authenticate, async (req, res) => {
    try {
        const driver = await prisma.driver.findUnique({
            where: { id: req.params.id },
        });
        if (!driver) {
            return res.status(404).json({ error: 'Driver not found' });
        }
        // Only admin or the driver themselves can update
        if (req.user.role !== 'ADMIN' && driver.userId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const { licenseNumber, busId } = req.body;
        const updateData = {};
        if (licenseNumber !== undefined)
            updateData.licenseNumber = licenseNumber;
        if (busId !== undefined)
            updateData.busId = busId || null;
        const updatedDriver = await prisma.driver.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                user: true,
                bus: {
                    include: {
                        route: true,
                        school: true,
                    },
                },
            },
        });
        res.json(updatedDriver);
    }
    catch (error) {
        console.error('Error updating driver:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete driver (Admin only)
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
    try {
        await prisma.driver.delete({
            where: { id: req.params.id },
        });
        res.json({ message: 'Driver deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting driver:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
//# sourceMappingURL=drivers.js.map