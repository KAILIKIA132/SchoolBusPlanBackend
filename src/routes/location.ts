import express from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js'
import { z } from 'zod'

const router = express.Router()

// In-memory location storage (in production, use Redis or a proper real-time service)
const busLocations = new Map<string, { latitude: number; longitude: number; timestamp: Date }>()

const locationSchema = z.object({
  busId: z.string(),
  latitude: z.number(),
  longitude: z.number(),
})

// Update bus location (Driver only)
router.post('/update', authenticate, requireRole('DRIVER'), async (req: AuthRequest, res) => {
  try {
    const validatedData = locationSchema.parse(req.body)

    // Verify driver owns the bus
    const driver = await prisma.driver.findUnique({
      where: { userId: req.user!.id },
      include: { bus: true },
    })

    if (!driver || driver.busId !== validatedData.busId) {
      return res.status(403).json({ error: 'Not authorized to update this bus location' })
    }

    busLocations.set(validatedData.busId, {
      latitude: validatedData.latitude,
      longitude: validatedData.longitude,
      timestamp: new Date(),
    })

    res.json({
      message: 'Location updated',
      busId: validatedData.busId,
      location: {
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        timestamp: new Date(),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors,
      })
    }

    console.error('Error updating location:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get bus location (for parents and admins)
router.get('/bus/:busId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { busId } = req.params

    // Verify access: parent can only see their child's bus, admin can see all
    if (req.user!.role === 'PARENT') {
      const parent = await prisma.parent.findUnique({
        where: { userId: req.user!.id },
        include: { students: { include: { bus: true } } },
      })

      const hasAccess = parent?.students.some(s => s.busId === busId)
      if (!hasAccess) {
        return res.status(403).json({ error: 'Not authorized to view this bus location' })
      }
    }

    const location = busLocations.get(busId)

    if (!location) {
      return res.status(404).json({ error: 'Bus location not found' })
    }

    res.json({
      busId,
      ...location,
    })
  } catch (error) {
    console.error('Error fetching bus location:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all bus locations (Admin only)
router.get('/all', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const locations = Array.from(busLocations.entries()).map(([busId, location]) => ({
      busId,
      ...location,
    }))

    res.json(locations)
  } catch (error) {
    console.error('Error fetching all bus locations:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router


