const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Hardcoded JWT secret
const JWT_SECRET = "your-super-secret-jwt-key-change-this-in-production";

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket
    this.userSockets = new Map(); // socketId -> userId
  }

  initialize(server) {
    this.io = socketIo(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
        
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user || !user.isActive) {
          return next(new Error('User not found or inactive'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.userId}`);
      
      // Store user connection
      this.connectedUsers.set(socket.userId, socket);
      this.userSockets.set(socket.id, socket.userId);

      // Update user's last active time
      this.updateUserActivity(socket.userId);

      // Join user to their personal room
      socket.join(`user:${socket.userId}`);

      // Join user to department room
      if (socket.user.department) {
        socket.join(`department:${socket.user.department}`);
      }

      // Handle issue updates
      socket.on('issue:update', (data) => {
        this.handleIssueUpdate(socket, data);
      });

      // Handle new comments
      socket.on('comment:add', (data) => {
        this.handleNewComment(socket, data);
      });

      // Handle issue assignment
      socket.on('issue:assign', (data) => {
        this.handleIssueAssignment(socket, data);
      });

      // Handle issue resolution
      socket.on('issue:resolve', (data) => {
        this.handleIssueResolution(socket, data);
      });

      // Handle availability updates
      socket.on('availability:update', (data) => {
        this.handleAvailabilityUpdate(socket, data);
      });

      // Handle private messages
      socket.on('message:send', (data) => {
        this.handlePrivateMessage(socket, data);
      });

      // Handle typing indicators
      socket.on('typing:start', (data) => {
        this.handleTypingStart(socket, data);
      });

      socket.on('typing:stop', (data) => {
        this.handleTypingStop(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  async updateUserActivity(userId) {
    try {
      await User.findByIdAndUpdate(userId, { lastActive: new Date() });
    } catch (error) {
      console.error('Error updating user activity:', error);
    }
  }

  handleIssueUpdate(socket, data) {
    const { issueId, updates } = data;
    
    // Emit to all users in the same department
    socket.to(`department:${socket.user.department}`).emit('issue:updated', {
      issueId,
      updates,
      updatedBy: {
        id: socket.userId,
        name: socket.user.getFullName(),
        employeeId: socket.user.employeeId
      },
      timestamp: new Date()
    });
  }

  handleNewComment(socket, data) {
    const { issueId, comment } = data;
    
    // Emit to all users following this issue
    this.io.to(`issue:${issueId}`).emit('comment:added', {
      issueId,
      comment: {
        ...comment,
        user: {
          id: socket.userId,
          name: socket.user.getFullName(),
          employeeId: socket.user.employeeId
        }
      },
      timestamp: new Date()
    });
  }

  handleIssueAssignment(socket, data) {
    const { issueId, assignedTo } = data;
    
    // Notify the assigned user
    this.io.to(`user:${assignedTo}`).emit('issue:assigned', {
      issueId,
      assignedBy: {
        id: socket.userId,
        name: socket.user.getFullName(),
        employeeId: socket.user.employeeId
      },
      timestamp: new Date()
    });
  }

  handleIssueResolution(socket, data) {
    const { issueId, resolution } = data;
    
    // Emit to all users in the same department
    socket.to(`department:${socket.user.department}`).emit('issue:resolved', {
      issueId,
      resolution,
      resolvedBy: {
        id: socket.userId,
        name: socket.user.getFullName(),
        employeeId: socket.user.employeeId
      },
      timestamp: new Date()
    });
  }

  handleAvailabilityUpdate(socket, data) {
    const { availability } = data;
    
    // Emit to all users in the same department
    socket.to(`department:${socket.user.department}`).emit('availability:changed', {
      userId: socket.userId,
      availability,
      user: {
        id: socket.userId,
        name: socket.user.getFullName(),
        employeeId: socket.user.employeeId
      },
      timestamp: new Date()
    });
  }

  handlePrivateMessage(socket, data) {
    const { recipientId, message, issueId } = data;
    
    // Send to recipient
    this.io.to(`user:${recipientId}`).emit('message:received', {
      sender: {
        id: socket.userId,
        name: socket.user.getFullName(),
        employeeId: socket.user.employeeId
      },
      message,
      issueId,
      timestamp: new Date()
    });

    // Send confirmation to sender
    socket.emit('message:sent', {
      recipientId,
      message,
      issueId,
      timestamp: new Date()
    });
  }

  handleTypingStart(socket, data) {
    const { recipientId } = data;
    
    this.io.to(`user:${recipientId}`).emit('typing:started', {
      userId: socket.userId,
      name: socket.user.getFullName()
    });
  }

  handleTypingStop(socket, data) {
    const { recipientId } = data;
    
    this.io.to(`user:${recipientId}`).emit('typing:stopped', {
      userId: socket.userId
    });
  }

  handleDisconnect(socket) {
    console.log(`User disconnected: ${socket.userId}`);
    
    // Remove from connected users
    this.connectedUsers.delete(socket.userId);
    this.userSockets.delete(socket.id);

    // Update user's last active time
    this.updateUserActivity(socket.userId);
  }

  // Public methods for external use
  notifyUser(userId, event, data) {
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  notifyDepartment(department, event, data) {
    this.io.to(`department:${department}`).emit(event, data);
  }

  notifyAll(event, data) {
    this.io.emit(event, data);
  }

  getConnectedUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }
}

module.exports = new SocketService(); 