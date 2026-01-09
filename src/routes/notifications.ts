import express from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate, AuthRequest } from '../middleware/auth.js'
import { z } from 'zod'

const router = express.Router()

const notificationSchema = z.object({
  userId: z.string(),
  title: z.string().min(1),
  message: z.string().min(1),
})

// Get notifications for current user
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { read, limit } = req.query

    const where: any = { userId: req.user!.id }
    if (read !== undefined) {
      where.read = read === 'true'
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit as string) : undefined,
    })

    res.json(notifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get unread count
router.get('/unread/count', authenticate, async (req: AuthRequest, res) => {
  try {
    const count = await prisma.notification.count({
      where: {
        userId: req.user!.id,
        read: false,
      },
    })

    res.json({ count })
  } catch (error) {
    console.error('Error fetching unread count:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Mark notification as read
router.patch('/:id/read', authenticate, async (req: AuthRequest, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    })

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    if (notification.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    })

    res.json(updated)
  } catch (error) {
    console.error('Error updating notification:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Mark all as read
router.patch('/read-all', authenticate, async (req: AuthRequest, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user!.id,
        read: false,
      },
      data: { read: true },
    })

    res.json({ message: 'All notifications marked as read' })
  } catch (error) {
    console.error('Error marking all as read:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create notification (Admin only)
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    // Allow admins to create notifications for any user
    // Others can only create for themselves
    const validatedData = notificationSchema.parse(req.body)

    if (req.user!.role !== 'ADMIN' && validatedData.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const notification = await prisma.notification.create({
      // Zod already validates this payload; cast for Prisma's strict typing
      data: validatedData as any,
    })

    res.status(201).json(notification)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors,
      })
    }

    console.error('Error creating notification:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router


