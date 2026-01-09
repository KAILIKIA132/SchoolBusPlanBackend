import express from 'express'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js'

const router = express.Router()

const busSchema = z.object({
  busNumber: z.string().min(1),
  capacity: z.number().int().positive(),
  licensePlate: z.string().min(1),
  routeId: z.string().optional(),
  schoolId: z.string().optional(),
})

// Get all buses
router.get('/', async (req, res) => {
  try {
    const buses = await prisma.bus.findMany({
      include: {
        school: true,
        route: true,
        driver: { include: { user: true } },
        students: true,
      },
      orderBy: { busNumber: 'asc' },
    })

    res.json(buses)
  } catch (error) {
    console.error('Error fetching buses:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get bus by ID
router.get('/:id', async (req, res) => {
  try {
    const bus = await prisma.bus.findUnique({
      where: { id: req.params.id },
      include: {
        school: true,
        route: true,
        driver: { include: { user: true } },
        students: {
          include: {
            parent: { include: { user: true } },
          },
        },
      },
    })

    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' })
    }

    res.json(bus)
  } catch (error) {
    console.error('Error fetching bus:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create bus
router.post('/', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const validatedData = busSchema.parse(req.body)

    const bus = await prisma.bus.create({
      // Cast to any to satisfy Prisma's strict create input typing while we rely on Zod validation
      data: validatedData as any,
      include: {
        school: true,
        route: true,
        driver: { include: { user: true } },
      },
    })

    res.status(201).json(bus)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors,
      })
    }

    console.error('Error creating bus:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update bus
router.patch('/:id', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const validatedData = busSchema.partial().parse(req.body)

    const bus = await prisma.bus.update({
      where: { id: req.params.id },
      data: validatedData,
      include: {
        school: true,
        route: true,
        driver: { include: { user: true } },
      },
    })

    res.json(bus)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors,
      })
    }

    console.error('Error updating bus:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete bus
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    await prisma.bus.delete({
      where: { id: req.params.id },
    })

    res.json({ message: 'Bus deleted successfully' })
  } catch (error) {
    console.error('Error deleting bus:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router


