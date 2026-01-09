import express from 'express'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js'

const router = express.Router()

const stopSchema = z.object({
  routeId: z.string(),
  name: z.string().min(1),
  address: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  order: z.number().int().positive(),
})

// Get all stops
router.get('/', async (req, res) => {
  try {
    const { routeId } = req.query

    const where = routeId ? { routeId: routeId as string } : {}

    const stops = await prisma.stop.findMany({
      where,
      include: {
        route: true,
      },
      orderBy: { order: 'asc' },
    })

    res.json(stops)
  } catch (error) {
    console.error('Error fetching stops:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get stop by ID
router.get('/:id', async (req, res) => {
  try {
    const stop = await prisma.stop.findUnique({
      where: { id: req.params.id },
      include: {
        route: true,
      },
    })

    if (!stop) {
      return res.status(404).json({ error: 'Stop not found' })
    }

    res.json(stop)
  } catch (error) {
    console.error('Error fetching stop:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create stop
router.post('/', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const validatedData = stopSchema.parse(req.body)

    const stop = await prisma.stop.create({
      data: validatedData,
      include: {
        route: true,
      },
    })

    res.status(201).json(stop)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors,
      })
    }

    console.error('Error creating stop:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update stop
router.patch('/:id', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const validatedData = stopSchema.partial().parse(req.body)

    const stop = await prisma.stop.update({
      where: { id: req.params.id },
      data: validatedData,
      include: {
        route: true,
      },
    })

    res.json(stop)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors,
      })
    }

    console.error('Error updating stop:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete stop
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    await prisma.stop.delete({
      where: { id: req.params.id },
    })

    res.json({ message: 'Stop deleted successfully' })
  } catch (error) {
    console.error('Error deleting stop:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router


