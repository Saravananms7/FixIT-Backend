const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const http = require("http");

// Import database connection
const connectDB = require("./config/database");

// Import middleware
const { errorHandler } = require("./middleware/errorHandler");

// Import routes
const authRoutes = require("./routes/auth");
const issueRoutes = require("./routes/issues");
const userRoutes = require("./routes/users");

// Import Socket.io service
const socketService = require("./services/socketService");

const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());

// Rate limiting with hardcoded values
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later."
  }
});
app.use(limiter);

// CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://your-vercel-app.vercel.app", // Replace with your Vercel domain
  "https://fixit-app.vercel.app" // Example domain
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Initialize Socket.io
socketService.initialize(server);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "FixIT Backend is running",
    timestamp: new Date().toISOString(),
    environment: "development"
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/users", userRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});

const PORT = 5000;

server.listen(PORT, () => {
  console.log(` FixIT Backend server running on port ${PORT}`);
  console.log(` Environment: development`);
  console.log(` Health check: http://localhost:${PORT}/health`);
  console.log(` Socket.io initialized`);
});

