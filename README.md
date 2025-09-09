# FixIT Backend

An AI-powered internal support platform backend built with Node.js, Express, MongoDB, and Socket.io. Designed for large organizations to enable collaborative problem-solving and eliminate confusion during technical difficulties.

## 🚀 Features

### Core Functionality
- **User Authentication & Authorization** - JWT-based authentication with role-based access
- **Issue Management** - Complete CRUD operations for technical issues
- **AI-Powered Helper Matching** - Smart algorithm that ranks potential helpers based on:
  - Skill relevance (40% weight)
  - Past issue-solving history (30% weight)
  - User engagement and availability (30% weight)
- **Real-time Communication** - Socket.io integration for live updates
- **File Upload Support** - Attachment handling for issue documentation
- **Voting System** - Upvote/downvote issues for better prioritization

### Advanced Features
- **Skill Verification System** - Admin can verify user skills
- **Contribution Tracking** - Monitor user participation and resolution metrics
- **Department-based Organization** - Filter and organize by departments
- **Comprehensive Analytics** - User statistics and top contributor rankings
- **Rate Limiting & Security** - Production-ready security measures

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.io
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Zod
- **Security**: Helmet, bcryptjs, rate limiting
- **File Upload**: Multer

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd FixIT/fixit-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/fixit_db

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d

   # AI Ranking Algorithm Configuration
   SKILL_WEIGHT=0.4
   HISTORY_WEIGHT=0.3
   ENGAGEMENT_WEIGHT=0.3

   # File Upload Configuration
   MAX_FILE_SIZE=5242880
   UPLOAD_PATH=./uploads

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100

   # Client URL (for CORS)
   CLIENT_URL=http://localhost:3000
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "employeeId": "EMP001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@company.com",
  "password": "password123",
  "department": "IT",
  "position": "Software Engineer",
  "skills": [
    {
      "name": "JavaScript",
      "level": "advanced"
    }
  ]
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john.doe@company.com",
  "password": "password123"
}
```

### Issue Endpoints

#### Create Issue
```http
POST /api/issues
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Printer not working",
  "description": "The printer in room 201 is showing error code E-01",
  "category": "hardware",
  "priority": "medium",
  "requiredSkills": ["printer repair", "hardware troubleshooting"],
  "location": {
    "building": "Main Building",
    "floor": "2nd Floor",
    "room": "201"
  }
}
```

#### Get AI Helper Suggestions
```http
GET /api/issues/:issueId/helpers
Authorization: Bearer <token>
```

#### Assign Issue to Helper
```http
PUT /api/issues/:issueId/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "assignedTo": "helperUserId"
}
```

### User Endpoints

#### Get User Statistics
```http
GET /api/users/:userId/stats
Authorization: Bearer <token>
```

#### Search Users by Skills
```http
GET /api/users/search/skills?skills=javascript,react&availability=available
Authorization: Bearer <token>
```

## 🔌 Socket.io Events

### Client to Server
- `issue:update` - Update issue details
- `comment:add` - Add new comment
- `issue:assign` - Assign issue to helper
- `issue:resolve` - Resolve issue
- `availability:update` - Update user availability
- `message:send` - Send private message
- `typing:start` - Start typing indicator
- `typing:stop` - Stop typing indicator

### Server to Client
- `issue:updated` - Issue was updated
- `comment:added` - New comment added
- `issue:assigned` - Issue assigned to user
- `issue:resolved` - Issue resolved
- `availability:changed` - User availability changed
- `message:received` - Private message received
- `typing:started` - User started typing
- `typing:stopped` - User stopped typing

## 🤖 AI Helper Matching Algorithm

The system uses a weighted scoring algorithm to rank potential helpers:

```javascript
Helper Score = (Skill Score × 0.4) + (History Score × 0.3) + (Engagement Score × 0.3)
```

### Components:
1. **Skill Relevance (40%)**: Percentage of required skills that match user's skills
2. **History Score (30%)**: Based on resolved issues count and average rating
3. **Engagement Score (30%)**: Recent activity and current availability

## 📊 Database Schema

### User Model
- Basic info (name, email, employee ID)
- Skills array with levels and verification
- Rating and contribution tracking
- Availability status
- Department and position

### Issue Model
- Title, description, category, priority
- Required skills for resolution
- Location information
- Assignment and resolution tracking
- Comments and voting system
- File attachments

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting to prevent abuse
- Helmet for security headers
- CORS configuration
- Input validation with Zod
- Error handling middleware

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📦 Production Deployment

1. **Environment Variables**: Ensure all production environment variables are set
2. **Database**: Use MongoDB Atlas or production MongoDB instance
3. **Process Manager**: Use PM2 for process management
4. **Reverse Proxy**: Configure Nginx for load balancing
5. **SSL**: Enable HTTPS with SSL certificates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Version History

- **v1.0.0** - Initial release with core functionality
- **v1.1.0** - Added AI helper matching
- **v1.2.0** - Real-time features with Socket.io
- **v1.3.0** - Enhanced security and performance 