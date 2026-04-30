# Rays International - Backend API

Backend server for UAE to Oman Visa Change Service Management System built with Node.js, Express, and MongoDB.

## 📁 Project Structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── userController.js    # User operations
│   ├── agentController.js   # Agent operations
│   ├── adminController.js   # Admin operations
│   ├── driverController.js  # Driver operations
│   ├── bookingController.js # Booking operations
│   ├── visaController.js    # Visa processing
│   ├── busController.js     # Bus management
│   ├── seatController.js    # Seat management
│   ├── paymentController.js # Payment processing
│   └── notificationController.js
├── models/
│   ├── User.js              # User schema
│   ├── Agent.js             # Agent schema
│   ├── Admin.js             # Admin schema
│   ├── Driver.js            # Driver schema
│   ├── Booking.js           # Booking schema
│   ├── Visa.js              # Visa schema
│   ├── Bus.js               # Bus schema
│   ├── Seat.js              # Seat schema
│   ├── Payment.js           # Payment schema
│   └── Notification.js      # Notification schema
├── routes/
│   ├── authRoutes.js        # Auth endpoints
│   ├── userRoutes.js        # User endpoints
│   ├── agentRoutes.js       # Agent endpoints
│   ├── adminRoutes.js       # Admin endpoints
│   ├── driverRoutes.js      # Driver endpoints
│   ├── bookingRoutes.js     # Booking endpoints
│   ├── visaRoutes.js        # Visa endpoints
│   ├── busRoutes.js         # Bus endpoints
│   ├── seatRoutes.js        # Seat endpoints
│   ├── paymentRoutes.js     # Payment endpoints
│   └── notificationRoutes.js
├── middleware/
│   ├── auth.js              # JWT authentication
│   ├── roleMiddleware.js    # Role-based access
│   ├── upload.js            # File upload (Multer)
│   └── errorHandler.js      # Error handling
├── uploads/                 # Uploaded files (auto-created)
├── .env.example            # Environment variables template
├── .gitignore
├── package.json
└── server.js               # Main server file
```

## 🚀 Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` file with your configuration.

3. **Start MongoDB:**
   Make sure MongoDB is running on your system or use MongoDB Atlas.

4. **Run the server:**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 🔑 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rays-international-visa-service
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Payment Gateway
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# Frontend URL
CLIENT_URL=http://localhost:3000
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register/user` - Register user
- `POST /api/auth/register/agent` - Register agent
- `POST /api/auth/login` - Login
- `POST /api/auth/forgot-password` - Forgot password
- `POST /api/auth/reset-password` - Reset password

### User Panel
- `GET /api/user/profile` - Get profile
- `PUT /api/user/profile` - Update profile
- `GET /api/user/bookings` - Get bookings

### Agent Panel
- `GET /api/agent/profile` - Get profile
- `PUT /api/agent/profile` - Update profile
- `GET /api/agent/wallet` - Get wallet balance
- `POST /api/agent/wallet/recharge` - Recharge wallet
- `POST /api/agent/bookings` - Create booking
- `GET /api/agent/bookings` - Get bookings
- `PUT /api/agent/bookings/:id/cancel` - Cancel booking

### Admin Panel
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/block` - Block/unblock user
- `GET /api/admin/agents` - Get all agents
- `PUT /api/admin/agents/:id/approve` - Approve agent
- `GET /api/admin/bookings` - Get all bookings
- `PUT /api/admin/bookings/:id/status` - Update status
- `POST /api/admin/buses` - Create bus
- `GET /api/admin/buses` - Get all buses
- `PUT /api/admin/buses/:id` - Update bus
- `DELETE /api/admin/buses/:id` - Delete bus

### Driver Panel
- `GET /api/driver/trips` - Get assigned trips
- `GET /api/driver/trips/:id` - Get trip details
- `GET /api/driver/trips/:busId/passengers/:travelDate` - Passenger list
- `POST /api/driver/check-in` - Mark passenger boarded

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/:id` - Get booking details
- `PUT /api/bookings/:id/cancel` - Cancel booking

### Visas
- `GET /api/visas/pending` - Get pending visas (admin)
- `POST /api/visas/apply` - Apply for visa (admin)
- `PUT /api/visas/:id/approve` - Approve visa (admin)
- `PUT /api/visas/:id/reject` - Reject visa (admin)

### Buses
- `GET /api/buses` - Get all buses
- `GET /api/buses/:id` - Get bus details
- `POST /api/buses` - Create bus (admin)
- `PUT /api/buses/:id` - Update bus (admin)

### Seats
- `GET /api/seats/available` - Get available seats
- `POST /api/seats/book` - Book seat

### Payments
- `POST /api/payments` - Create payment
- `GET /api/payments/my` - Get my payments
- `POST /api/payments/confirm` - Confirm payment
- `POST /api/payments/:id/refund` - Refund payment

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read

## 🔐 Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your_token>
```

## 💳 Payment Integration

The system uses Stripe for card payments. To test payments:

1. Get your Stripe API keys from https://dashboard.stripe.com
2. Add them to your `.env` file
3. Use Stripe test cards for development

## 📤 File Upload

Supported file types:
- Images: JPEG, JPG, PNG
- Documents: PDF

Maximum file size: 5MB (configurable in `.env`)

## 🛡️ Security Features

- JWT authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation
- Rate limiting
- CORS protection
- Helmet security headers
- Error handling

## 📊 Database Models

- **User** - Regular users
- **Agent** - Travel agents with wallet system
- **Admin** - System administrators
- **Driver** - Bus drivers
- **Booking** - Travel bookings
- **Visa** - Visa processing
- **Bus** - Bus fleet management
- **Seat** - Seat assignments
- **Payment** - Payment transactions
- **Notification** - System notifications

## 🧪 Testing

Test the API using:
- Postman
- Insomnia
- cURL
- Frontend application

Health check endpoint:
```
GET /api/health
```

## 📝 Notes

- Make sure MongoDB is running before starting the server
- Uploads directory is created automatically
- Use `.env.example` as a template for `.env` file
- All passwords are hashed automatically
- Agent accounts require admin approval

## 🔄 Development Workflow

1. Make changes to code
2. Server auto-restarts with nodemon
3. Test endpoints
4. Commit changes

## 📞 Support

For issues or questions, check the main project documentation.

---

**Built with ❤️ using Node.js, Express, and MongoDB**
   
 D e p l o y   T r i g g e r  
 R e - t r i g g e r  
 