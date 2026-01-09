import express from 'express'
import { prisma } from '../lib/prisma.js'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import jwt from 'jsonwebtoken'

const router = express.Router()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['ADMIN', 'DRIVER', 'PARENT']),
  phone: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(6),
}).refine((data) => data.email || data.phone, {
  message: "Either email or phone must be provided",
})

const otpSchema = z.object({
  phone: z.string().min(10),
})

const verifyOtpSchema = z.object({
  phone: z.string().min(10),
  otp: z.string().length(6),
})

// In-memory OTP storage (in production, use Redis or database)
const otpStore = new Map<string, { code: string; expiresAt: Date }>()

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Register
router.post('/register', async (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body)

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' })
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
        role: validatedData.role,
        phone: validatedData.phone,
      },
    })

    // Create role-specific profile
    if (validatedData.role === 'DRIVER') {
      await prisma.driver.create({
        data: {
          userId: user.id,
          licenseNumber: `LIC-${Date.now()}`,
        },
      })
    } else if (validatedData.role === 'PARENT') {
      await prisma.parent.create({
        data: {
          userId: user.id,
        },
      })
    }

    res.status(201).json({
      message: 'User created successfully',
      userId: user.id,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors,
      })
    }

    console.error('Registration error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Login (Email/Phone + Password)
router.post('/login', async (req, res) => {
  try {
    const { email, phone, password } = loginSchema.parse(req.body)

    // Find user by email or phone
    let user = null
    if (email) {
      user = await prisma.user.findUnique({
        where: { email },
      })
    } else if (phone) {
      user = await prisma.user.findFirst({
        where: { phone },
      })
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Generate JWT token
    const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      secret,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors,
      })
    }

    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Send OTP (for driver quick sign-in)
router.post('/otp/send', async (req, res) => {
  try {
    const { phone } = otpSchema.parse(req.body)

    // Find user by phone
    const user = await prisma.user.findFirst({
      where: { phone },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found with this phone number' })
    }

    // Generate OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    // Store OTP
    otpStore.set(phone, { code: otp, expiresAt })

    // In production, send OTP via SMS service (Twilio, AWS SNS, etc.)
    // For now, log it (remove in production)
    console.log(`📱 OTP for ${phone}: ${otp} (Valid for 5 minutes)`)

    res.json({
      message: 'OTP sent successfully',
      // Remove phone in production
      // For demo purposes only:
      otp: otp,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors,
      })
    }

    console.error('OTP send error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Verify OTP (for driver quick sign-in)
router.post('/otp/verify', async (req, res) => {
  try {
    const { phone, otp } = verifyOtpSchema.parse(req.body)

    // Check if OTP exists and is valid
    const storedOtp = otpStore.get(phone)

    if (!storedOtp) {
      return res.status(400).json({ error: 'OTP not found or expired' })
    }

    if (storedOtp.expiresAt < new Date()) {
      otpStore.delete(phone)
      return res.status(400).json({ error: 'OTP expired' })
    }

    if (storedOtp.code !== otp) {
      return res.status(401).json({ error: 'Invalid OTP' })
    }

    // Find user by phone
    const user = await prisma.user.findFirst({
      where: { phone },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Generate JWT token
    const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      secret,
      { expiresIn: '7d' }
    )

    // Remove used OTP
    otpStore.delete(phone)

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors,
      })
    }

    console.error('OTP verify error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
