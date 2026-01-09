import express from 'express'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js'

const router = express.Router()

const schoolSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

// Get all schools
router.get('/', async (req, res) => {
  try {
    const schools = await prisma.school.findMany({
      include: {
        routes: true,
        buses: true,
        students: true,
      },
      orderBy: { name: 'asc' },
    })

    res.json(schools)
  } catch (error) {
    console.error('Error fetching schools:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get school by ID
router.get('/:id', async (req, res) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.params.id },
      include: {
        routes: {
          include: {
            stops: { orderBy: { order: 'asc' } },
            buses: true,
          },
        },
        buses: {
          include: {
            driver: { include: { user: true } },
            route: true,
            students: true,
          },
        },
        students: {
          include: {
            parent: { include: { user: true } },
            bus: true,
          },
        },
      },
    })

    if (!school) {
      return res.status(404).json({ error: 'School not found' })
    }

    res.json(school)
  } catch (error) {
    console.error('Error fetching school:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create school
router.post('/', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const validatedData = schoolSchema.parse(req.body)

    const school = await prisma.school.create({
      // Cast to any to satisfy Prisma's SchoolCreateInput typing
      data: validatedData as any,
    })

    res.status(201).json(school)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors,
      })
    }

    console.error('Error creating school:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update school
router.patch('/:id', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const validatedData = schoolSchema.partial().parse(req.body)

    const school = await prisma.school.update({
      where: { id: req.params.id },
      data: validatedData,
    })

    res.json(school)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors,
      })
    }

    console.error('Error updating school:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete school
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    await prisma.school.delete({
      where: { id: req.params.id },
    })

    res.json({ message: 'School deleted successfully' })
  } catch (error) {
    console.error('Error deleting school:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router


