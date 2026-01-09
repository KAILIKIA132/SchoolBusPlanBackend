import express from 'express'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js'

const router = express.Router()

const routeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startLocation: z.string().min(1),
  endLocation: z.string().min(1),
  schoolId: z.string().optional(),
})

// Get all routes
router.get('/', async (req, res) => {
  try {
    const { schoolId } = req.query

    const where: any = {}
    if (schoolId) where.schoolId = schoolId

    const routes = await prisma.route.findMany({
      where,
      include: {
        school: true,
        stops: { orderBy: { order: 'asc' } },
        buses: true,
      },
      orderBy: { name: 'asc' },
    })

    res.json(routes)
  } catch (error) {
    console.error('Error fetching routes:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get route by ID
router.get('/:id', async (req, res) => {
  try {
    const route = await prisma.route.findUnique({
      where: { id: req.params.id },
      include: {
        school: true,
        stops: { orderBy: { order: 'asc' } },
        buses: {
          include: {
            driver: { include: { user: true } },
            students: true,
          },
        },
      },
    })

    if (!route) {
      return res.status(404).json({ error: 'Route not found' })
    }

    res.json(route)
  } catch (error) {
    console.error('Error fetching route:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create route
router.post('/', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const validatedData = routeSchema.parse(req.body)

    const route = await prisma.route.create({
      // Zod ensures shape; cast for Prisma's strict RouteCreateInput
      data: validatedData as any,
      include: {
        school: true,
        stops: { orderBy: { order: 'asc' } },
      },
    })

    res.status(201).json(route)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors,
      })
    }

    console.error('Error creating route:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update route
router.patch('/:id', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const validatedData = routeSchema.partial().parse(req.body)

    const route = await prisma.route.update({
      where: { id: req.params.id },
      data: validatedData,
      include: {
        school: true,
        stops: { orderBy: { order: 'asc' } },
      },
    })

    res.json(route)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors,
      })
    }

    console.error('Error updating route:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete route
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    await prisma.route.delete({
      where: { id: req.params.id },
    })

    res.json({ message: 'Route deleted successfully' })
  } catch (error) {
    console.error('Error deleting route:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router


