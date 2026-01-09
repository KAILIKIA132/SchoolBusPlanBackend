import express from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js'
import { z } from 'zod'

const router = express.Router()

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
  name: z.string().min(1),
  role: z.enum(['ADMIN', 'DRIVER', 'PARENT']),
  phone: z.string().optional(),
})

// Get all users
router.get('/', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        driverProfile: {
          include: {
            bus: true,
          },
        },
        parentProfile: {
          include: {
            students: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get user by ID
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    // Users can only view their own profile unless they're admin
    if (req.user!.role !== 'ADMIN' && req.user!.id !== req.params.id) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        driverProfile: {
          include: {
            bus: {
              include: {
                route: true,
              },
            },
          },
        },
        parentProfile: {
          include: {
            students: true,
          },
        },
      },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user
    res.json(userWithoutPassword)
  } catch (error) {
    console.error('Error fetching user:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update user
router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    // Users can only update their own profile unless they're admin
    if (req.user!.role !== 'ADMIN' && req.user!.id !== req.params.id) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const updateData = userSchema.partial().parse(req.body)

    // Don't allow role changes unless admin
    if (updateData.role && req.user!.role !== 'ADMIN') {
      delete updateData.role
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
    })

    const { password, ...userWithoutPassword } = user
    res.json(userWithoutPassword)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors,
      })
    }

    console.error('Error updating user:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete user
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    await prisma.user.delete({
      where: { id: req.params.id },
    })

    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router


