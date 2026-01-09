import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database with comprehensive school transport data...')

  // Clear existing data in correct order (due to foreign key constraints)
  await prisma.trip.deleteMany()
  await prisma.reminder.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.student.deleteMany()
  await prisma.stop.deleteMany()
  await prisma.bus.deleteMany()
  await prisma.route.deleteMany()
  await prisma.driver.deleteMany()
  await prisma.parent.deleteMany()
  await prisma.user.deleteMany()
  await prisma.school.deleteMany()

  // Create Schools
  console.log('📚 Creating schools...')
  const schools = await Promise.all([
    prisma.school.create({
      data: {
        name: 'Lincoln Elementary School',
        address: '123 Education Ave, Nairobi, Kenya',
        phone: '+254712345678',
        email: 'info@lincolnelementary.edu',
        latitude: -1.2921,
        longitude: 36.8219,
      },
    }),
    prisma.school.create({
      data: {
        name: 'Westlands Primary School',
        address: '456 School Road, Westlands, Nairobi, Kenya',
        phone: '+254712345679',
        email: 'info@westlandsprimary.edu',
        latitude: -1.2649,
        longitude: 36.8035,
      },
    }),
    prisma.school.create({
      data: {
        name: 'Kileleshwa Academy',
        address: '789 Academy Street, Kileleshwa, Nairobi, Kenya',
        phone: '+254712345680',
        email: 'info@kileleshwaacademy.edu',
        latitude: -1.2906,
        longitude: 36.7750,
      },
    }),
  ])

  // Create Admin User
  console.log('👤 Creating admin user...')
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@school.com',
      password: adminPassword,
      name: 'System Administrator',
      role: 'ADMIN',
      phone: '+254700000001',
    },
  })

  // Create Multiple Drivers
  console.log('🚗 Creating drivers...')
  const driverData = [
    { email: 'driver@school.com', name: 'John Driver', phone: '+254700000002', license: 'DL-12345', busNumber: 'BUS-001' },
    { email: 'driver2@school.com', name: 'Jane Smith', phone: '+254700000003', license: 'DL-12346', busNumber: 'BUS-122' },
    { email: 'driver3@school.com', name: 'Mike Johnson', phone: '+254700000004', license: 'DL-12347', busNumber: 'BUS-002' },
    { email: 'driver4@school.com', name: 'Sarah Williams', phone: '+254700000005', license: 'DL-12348', busNumber: 'BUS-345' },
    { email: 'driver5@school.com', name: 'David Brown', phone: '+254700000006', license: 'DL-12349', busNumber: 'BUS-45' },
  ]

  const drivers = []
  for (const driverInfo of driverData) {
    const driverPassword = await bcrypt.hash('driver123', 10)
    const driverUser = await prisma.user.create({
      data: {
        email: driverInfo.email,
        password: driverPassword,
        name: driverInfo.name,
        role: 'DRIVER',
        phone: driverInfo.phone,
      },
    })

    const driver = await prisma.driver.create({
      data: {
        userId: driverUser.id,
        licenseNumber: driverInfo.license,
      },
    })
    drivers.push({ ...driver, user: driverUser, busNumber: driverInfo.busNumber })
  }

  // Create Multiple Parents
  console.log('👨‍👩‍👧 Creating parents...')
  const parentData = [
    { email: 'parent@school.com', name: 'Jane Parent', phone: '+254700000010', address: '123 Main St, Westlands, Nairobi' },
    { email: 'parent2@school.com', name: 'Bob Parent', phone: '+254700000011', address: '456 Oak Ave, Kileleshwa, Nairobi' },
    { email: 'parent3@school.com', name: 'Alice Guardian', phone: '+254700000012', address: '789 Pine Road, Karen, Nairobi' },
    { email: 'parent4@school.com', name: 'Charlie Guardian', phone: '+254700000013', address: '321 Elm Street, Parklands, Nairobi' },
    { email: 'parent5@school.com', name: 'Diana Parent', phone: '+254700000014', address: '654 Maple Ave, Kilimani, Nairobi' },
  ]

  const parents = []
  for (const parentInfo of parentData) {
    const parentPassword = await bcrypt.hash('parent123', 10)
    const parentUser = await prisma.user.create({
      data: {
        email: parentInfo.email,
        password: parentPassword,
        name: parentInfo.name,
        role: 'PARENT',
        phone: parentInfo.phone,
      },
    })

    const parent = await prisma.parent.create({
      data: {
        userId: parentUser.id,
        address: parentInfo.address,
      },
    })
    parents.push({ ...parent, user: parentUser })
  }

  // Create Routes with Stops
  console.log('🗺️ Creating routes and stops...')
  const routes = []

  // Route 1: Westlands Route
  const route1 = await prisma.route.create({
    data: {
      name: 'Westlands Route',
      description: 'Route covering Westlands residential area',
      startLocation: 'Lincoln Elementary School',
      endLocation: 'Westlands Terminal',
      schoolId: schools[0].id,
      stops: {
        create: [
          { name: 'Ruiru Bypass Roundabout', address: 'Ruiru Bypass Roundabout, Nairobi', order: 1, latitude: -1.1649, longitude: 36.9574 },
          { name: 'Ruiru Bypass & Thika Road Junction', address: 'Ruiru Bypass & Thika Road Junction, Nairobi', order: 2, latitude: -1.1665, longitude: 36.9592 },
          { name: 'Ruiru Bypass & Eastern Bypass', address: 'Ruiru Bypass & Eastern Bypass, Nairobi', order: 3, latitude: -1.1680, longitude: 36.9610 },
          { name: 'Ruiru Bypass & Kamiti Road', address: 'Ruiru Bypass & Kamiti Road, Nairobi', order: 4, latitude: -1.1695, longitude: 36.9628 },
        ],
      },
    },
  })
  routes.push(route1)

  // Route 2: Kileleshwa Route
  const route2 = await prisma.route.create({
    data: {
      name: 'Kileleshwa Route',
      description: 'Route covering Kileleshwa residential area',
      startLocation: 'Lincoln Elementary School',
      endLocation: 'Kileleshwa Terminal',
      schoolId: schools[0].id,
      stops: {
        create: [
          { name: 'Kileleshwa Main Stop', address: 'Kileleshwa Main Road, Nairobi', order: 1, latitude: -1.2906, longitude: 36.7750 },
          { name: 'Kileleshwa Secondary Stop', address: 'Kileleshwa Secondary Road, Nairobi', order: 2, latitude: -1.2910, longitude: 36.7760 },
        ],
      },
    },
  })
  routes.push(route2)

  // Route 3: Karen Route
  const route3 = await prisma.route.create({
    data: {
      name: 'Karen Route',
      description: 'Route covering Karen residential area',
      startLocation: 'Lincoln Elementary School',
      endLocation: 'Karen Terminal',
      schoolId: schools[0].id,
      stops: {
        create: [
          { name: 'Karen Main Stop', address: 'Karen Main Road, Nairobi', order: 1, latitude: -1.3197, longitude: 36.7008 },
        ],
      },
    },
  })
  routes.push(route3)

  // Create Buses
  console.log('🚌 Creating buses...')
  const buses = []
  for (let i = 0; i < drivers.length; i++) {
    const bus = await prisma.bus.create({
      data: {
        busNumber: drivers[i].busNumber,
        capacity: 50,
        licensePlate: `KEN-${String(i + 1).padStart(3, '0')}`,
        routeId: routes[i % routes.length].id,
        schoolId: schools[0].id,
      },
    })
    buses.push(bus)

    // Assign driver to bus
    await prisma.driver.update({
      where: { id: drivers[i].id },
      data: { busId: bus.id },
    })
  }

  // Create Students
  console.log('🎓 Creating students...')
  const studentNames = [
    'Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Diana Wilson', 'Emma Davis',
    'Frank Miller', 'Grace Lee', 'Henry Taylor', 'Ivy Anderson', 'Jack Moore',
  ]

  const students = []
  for (let i = 0; i < studentNames.length; i++) {
    const parent = parents[i % parents.length]
    const bus = buses[i % buses.length]

    const student = await prisma.student.create({
      data: {
        parentId: parent.id,
        name: studentNames[i],
        grade: String(Math.floor(Math.random() * 5) + 1), // Grades 1-5
        pickupAddress: parent.address || '123 Main St',
        dropoffAddress: parent.address || '123 Main St',
        busId: bus.id,
        schoolId: schools[0].id,
      },
    })
    students.push(student)
  }

  // Create Trips for Today
  console.log('🚍 Creating trips...')
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Get all stops
  const allStops = await prisma.stop.findMany({
    where: { routeId: { in: routes.map(r => r.id) } },
  })

  for (let i = 0; i < students.length; i++) {
    const student = students[i]
    const bus = buses.find(b => b.id === student.busId)
    if (!bus) continue

    const driver = drivers.find(d => d.busId === bus.id)
    if (!driver) continue

    const route = routes.find(r => r.id === bus.routeId)
    if (!route) continue

    const routeStops = allStops.filter(s => s.routeId === route.id)
    if (routeStops.length === 0) continue

    const stop = routeStops[0]

    // Morning pickup trip
    const pickupTime = new Date(today)
    pickupTime.setHours(7, 0, 0, 0)

    await prisma.trip.create({
      data: {
        busId: bus.id,
        driverId: driver.id,
        studentId: student.id,
        stopId: stop.id,
        tripType: 'PICKUP',
        status: i % 3 === 0 ? 'COMPLETED' : i % 3 === 1 ? 'IN_PROGRESS' : 'SCHEDULED',
        scheduledTime: pickupTime,
        actualTime: i % 3 === 0 ? new Date(pickupTime.getTime() + 5 * 60000) : null,
      },
    })

    // Afternoon dropoff trip
    const dropoffTime = new Date(today)
    dropoffTime.setHours(15, 30, 0, 0)

    await prisma.trip.create({
      data: {
        busId: bus.id,
        driverId: driver.id,
        studentId: student.id,
        stopId: stop.id,
        tripType: 'DROPOFF',
        status: 'SCHEDULED',
        scheduledTime: dropoffTime,
      },
    })
  }

  // Create Notifications
  console.log('🔔 Creating notifications...')
  for (const parent of parents) {
    await prisma.notification.createMany({
      data: [
        {
          userId: parent.user.id,
          title: 'Welcome to School Transport System',
          message: 'Your child\'s bus tracking is now active. You will receive real-time updates.',
        },
        {
          userId: parent.user.id,
          title: 'Bus Route Information',
          message: 'Your child has been assigned to Bus route. Check the app for details.',
        },
      ],
    })
  }

  // Create Sample Reminders
  console.log('⏰ Creating reminders...')
  for (const parent of parents) {
    const parentStudents = students.filter(s => s.parentId === parent.id)
    if (parentStudents.length > 0) {
      await prisma.reminder.createMany({
        data: [
          {
            userId: parent.user.id,
            studentId: parentStudents[0].id,
            type: 'PICKUP',
            title: 'School Pickup Reminder',
            description: 'Bus arrives at pickup location in 15 minutes',
            time: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
            frequency: 'DAILY',
            daysOfWeek: '[1,2,3,4,5]', // Monday to Friday
          },
          {
            userId: parent.user.id,
            studentId: parentStudents[0].id,
            type: 'DROPOFF',
            title: 'School Dropoff Reminder',
            description: 'Bus arrives at school in 15 minutes',
            time: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000), // Tomorrow morning
            frequency: 'DAILY',
            daysOfWeek: '[1,2,3,4,5]',
          },
        ],
      })
    }
  }

  console.log('✅ Seeding completed!')
  console.log('\n📊 Summary:')
  console.log(`- Schools: ${schools.length}`)
  console.log(`- Drivers: ${drivers.length}`)
  console.log(`- Parents: ${parents.length}`)
  console.log(`- Routes: ${routes.length}`)
  console.log(`- Buses: ${buses.length}`)
  console.log(`- Students: ${students.length}`)
  console.log(`- Trips: ${students.length * 2} (pickup + dropoff)`)
  console.log('\n🔐 Default accounts:')
  console.log('Admin: admin@school.com / admin123')
  console.log('Driver: driver@school.com / driver123')
  console.log('Parent: parent@school.com / parent123')
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


