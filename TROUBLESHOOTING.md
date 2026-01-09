# Troubleshooting 404 Errors

## Common Causes of 404 Errors

### 1. Missing `/api` Prefix

**❌ Wrong:**
```
http://localhost:3001/auth/login
http://localhost:3001/users
```

**✅ Correct:**
```
http://localhost:3001/api/auth/login
http://localhost:3001/api/users
```

All API endpoints must be prefixed with `/api`.

### 2. Wrong HTTP Method

Make sure you're using the correct HTTP method:
- `GET /api/users` - Get all users
- `POST /api/auth/login` - Login
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### 3. Authentication Required

Many endpoints require authentication. If you get a 404, it might actually be an authentication error.

**Test authentication:**
```bash
# Login first
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.com","password":"admin123"}'

# Use the token in subsequent requests
curl http://localhost:3001/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Available Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/phone and password
- `POST /api/auth/otp/send` - Send OTP to phone
- `POST /api/auth/otp/verify` - Verify OTP

#### Users
- `GET /api/users` - Get all users (requires ADMIN)
- `GET /api/users/:id` - Get user by ID
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

#### Schools
- `GET /api/schools` - Get all schools
- `GET /api/schools/:id` - Get school by ID
- `POST /api/schools` - Create school (requires ADMIN)
- `PATCH /api/schools/:id` - Update school
- `DELETE /api/schools/:id` - Delete school

#### Buses
- `GET /api/buses` - Get all buses
- `GET /api/buses/:id` - Get bus by ID
- `POST /api/buses` - Create bus (requires ADMIN)
- `PATCH /api/buses/:id` - Update bus
- `DELETE /api/buses/:id` - Delete bus

#### Routes
- `GET /api/routes` - Get all routes
- `GET /api/routes/:id` - Get route by ID
- `POST /api/routes` - Create route (requires ADMIN)
- `PATCH /api/routes/:id` - Update route
- `DELETE /api/routes/:id` - Delete route

#### Students
- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get student by ID
- `POST /api/students` - Create student
- `PATCH /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

#### Drivers
- `GET /api/drivers` - Get all drivers
- `GET /api/drivers/:id` - Get driver by ID
- `GET /api/drivers/me` - Get current driver profile
- `POST /api/drivers` - Create driver (requires ADMIN)
- `PATCH /api/drivers/:id` - Update driver
- `DELETE /api/drivers/:id` - Delete driver

#### Parents
- `GET /api/parents` - Get all parents
- `GET /api/parents/:id` - Get parent by ID
- `GET /api/parents/me` - Get current parent profile
- `POST /api/parents` - Create parent
- `PATCH /api/parents/:id` - Update parent

#### Trips
- `GET /api/trips` - Get all trips (with query params)
- `GET /api/trips/:id` - Get trip by ID
- `POST /api/trips` - Create trip
- `PATCH /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Delete trip

#### Stops
- `GET /api/stops` - Get all stops (optional ?routeId=)
- `GET /api/stops/:id` - Get stop by ID
- `POST /api/stops` - Create stop
- `PATCH /api/stops/:id` - Update stop
- `DELETE /api/stops/:id` - Delete stop

#### Location
- `GET /api/location/bus/:busId` - Get bus location
- `GET /api/location/all` - Get all bus locations
- `POST /api/location/update` - Update bus location (DRIVER only)

#### Notifications
- `GET /api/notifications` - Get notifications
- `GET /api/notifications/unread/count` - Get unread count
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/read-all` - Mark all as read

#### Reminders
- `GET /api/reminders` - Get reminders
- `GET /api/reminders/:id` - Get reminder by ID
- `POST /api/reminders` - Create reminder
- `PATCH /api/reminders/:id` - Update reminder
- `DELETE /api/reminders/:id` - Delete reminder

#### Statistics
- `GET /api/statistics/dashboard` - Get dashboard stats
- `GET /api/statistics/school/:schoolId` - Get school stats
- `GET /api/statistics/trips/chart` - Get trips chart data

#### Logs
- `GET /api/logs` - Get logs (with query params)

#### Settings
- `GET /api/settings` - Get settings (ADMIN only)
- `PATCH /api/settings` - Update settings (ADMIN only)

### 5. Testing Endpoints

**Test the root endpoint:**
```bash
curl http://localhost:3001/
```

**Test health check:**
```bash
curl http://localhost:3001/health
```

**Test a non-existent endpoint (should return helpful 404):**
```bash
curl http://localhost:3001/api/nonexistent
```

### 6. Check Backend Logs

View backend logs to see what requests are being made:
```bash
cd backend
docker compose logs -f backend
```

### 7. Common Issues in Frontend/Flutter Apps

#### Frontend (Next.js)
- Check `frontend/lib/api.ts` - make sure `API_URL` includes `/api`
- Example: `http://localhost:3001/api` ✅ (not `http://localhost:3001` ❌)

#### Flutter Apps
- Check `lib/services/api_service.dart` - make sure `baseUrl` includes `/api`
- Example: `http://localhost:3001/api` ✅

### 8. Verify Backend is Running

```bash
cd backend
docker compose ps
```

Should show:
```
school-transport-backend   Up
school-transport-db         Up (healthy)
```

### 9. Check Port

Make sure you're using port **3001** (not 3000):
- ✅ `http://localhost:3001/api/...`
- ❌ `http://localhost:3000/api/...` (this is for frontend)

## Getting Help

If you're still getting 404 errors:

1. Check the exact URL you're calling
2. Check the HTTP method (GET, POST, etc.)
3. Check if authentication is required
4. Check backend logs: `docker compose logs backend`
5. Test the endpoint directly with curl

Example:
```bash
# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.com","password":"admin123"}'
```



