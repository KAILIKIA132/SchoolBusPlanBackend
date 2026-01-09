import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import busRoutes from './routes/buses.js'
import routeRoutes from './routes/routes.js'
import studentRoutes from './routes/students.js'
import tripRoutes from './routes/trips.js'
import driverRoutes from './routes/drivers.js'
import parentRoutes from './routes/parents.js'
import stopRoutes from './routes/stops.js'
import locationRoutes from './routes/location.js'
import schoolRoutes from './routes/schools.js'
import notificationRoutes from './routes/notifications.js'
import reminderRoutes from './routes/reminders.js'
import statisticsRoutes from './routes/statistics.js'
import logRoutes from './routes/logs.js'
import settingsRoutes from './routes/settings.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware - CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    // Build allowed origins list
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost',
      'http://127.0.0.1',
      // Android emulator
      'http://10.0.2.2:3001',
    ]
    
    // Add additional origins from environment variable (comma-separated)
    if (process.env.CORS_ORIGINS) {
      const additionalOrigins = process.env.CORS_ORIGINS.split(',').map(o => o.trim())
      allowedOrigins.push(...additionalOrigins)
    }
    
    // In development, allow all origins (for mobile apps on physical devices)
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true)
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

app.use(cors(corsOptions))
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/buses', busRoutes)
app.use('/api/routes', routeRoutes)
app.use('/api/students', studentRoutes)
app.use('/api/trips', tripRoutes)
app.use('/api/drivers', driverRoutes)
app.use('/api/parents', parentRoutes)
app.use('/api/stops', stopRoutes)
app.use('/api/location', locationRoutes)
app.use('/api/schools', schoolRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/reminders', reminderRoutes)
app.use('/api/statistics', statisticsRoutes)
app.use('/api/logs', logRoutes)
app.use('/api/settings', settingsRoutes)

// Root route - API information
app.get('/', (req, res) => {
  res.json({
    message: 'School Transport System API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      buses: '/api/buses',
      routes: '/api/routes',
      students: '/api/students',
      trips: '/api/trips',
      drivers: '/api/drivers',
      parents: '/api/parents',
      stops: '/api/stops',
      location: '/api/location',
      schools: '/api/schools',
      notifications: '/api/notifications',
      reminders: '/api/reminders',
      statistics: '/api/statistics',
      logs: '/api/logs',
      settings: '/api/settings',
    },
  })
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'School Transport API is running' })
})

// 404 handler for undefined routes
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The endpoint ${req.method} ${req.path} does not exist`,
    availableEndpoints: {
      root: 'GET /',
      health: 'GET /health',
      apiBase: '/api/*',
    },
  })
})

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong!' })
})

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
})


