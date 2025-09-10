const User = require('../models/User');
const Issue = require('../models/Issue');
const connectDB = require('../config/database');

const sampleUsers = [
  {
    employeeId: 'EMP001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    password: 'password123',
    department: 'IT',
    position: 'Senior Software Engineer',
    skills: [
      { name: 'JavaScript', level: 'expert', verified: true },
      { name: 'React', level: 'advanced', verified: true },
      { name: 'Node.js', level: 'advanced', verified: true },
      { name: 'MongoDB', level: 'intermediate', verified: true }
    ],
    availability: 'available',
    rating: { average: 4.8, count: 15 },
    contributions: { issuesResolved: 25, issuesPosted: 5, totalTimeHelped: 1200 }
  },
  {
    employeeId: 'EMP002',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@company.com',
    password: 'password123',
    department: 'IT',
    position: 'System Administrator',
    skills: [
      { name: 'Network Administration', level: 'expert', verified: true },
      { name: 'Linux', level: 'advanced', verified: true },
      { name: 'Hardware Troubleshooting', level: 'advanced', verified: true },
      { name: 'Printer Repair', level: 'intermediate', verified: true }
    ],
    availability: 'available',
    rating: { average: 4.9, count: 22 },
    contributions: { issuesResolved: 35, issuesPosted: 3, totalTimeHelped: 1800 }
  },
  {
    employeeId: 'EMP003',
    firstName: 'Mike',
    lastName: 'Johnson',
    email: 'mike.johnson@company.com',
    password: 'password123',
    department: 'Marketing',
    position: 'Marketing Manager',
    skills: [
      { name: 'Email Configuration', level: 'intermediate', verified: true },
      { name: 'Software Installation', level: 'beginner', verified: false },
      { name: 'Office 365', level: 'intermediate', verified: true }
    ],
    availability: 'busy',
    rating: { average: 4.2, count: 8 },
    contributions: { issuesResolved: 8, issuesPosted: 12, totalTimeHelped: 400 }
  },
  {
    employeeId: 'EMP004',
    firstName: 'Sarah',
    lastName: 'Wilson',
    email: 'sarah.wilson@company.com',
    password: 'password123',
    department: 'HR',
    position: 'HR Specialist',
    skills: [
      { name: 'Access Management', level: 'intermediate', verified: true },
      { name: 'User Account Setup', level: 'intermediate', verified: true },
      { name: 'Password Reset', level: 'advanced', verified: true }
    ],
    availability: 'available',
    rating: { average: 4.6, count: 18 },
    contributions: { issuesResolved: 20, issuesPosted: 8, totalTimeHelped: 900 }
  },
  {
    employeeId: 'EMP005',
    firstName: 'David',
    lastName: 'Brown',
    email: 'david.brown@company.com',
    password: 'password123',
    department: 'IT',
    position: 'DevOps Engineer',
    skills: [
      { name: 'Docker', level: 'expert', verified: true },
      { name: 'Kubernetes', level: 'advanced', verified: true },
      { name: 'AWS', level: 'advanced', verified: true },
      { name: 'CI/CD', level: 'expert', verified: true }
    ],
    availability: 'available',
    rating: { average: 4.7, count: 12 },
    contributions: { issuesResolved: 18, issuesPosted: 6, totalTimeHelped: 1100 }
  }
];

const sampleIssues = [
  {
    title: 'Printer showing error code E-01',
    description: 'The HP LaserJet printer in room 201 is displaying error code E-01 and won\'t print. Need someone to check the hardware.',
    category: 'hardware',
    priority: 'medium',
    requiredSkills: ['printer repair', 'hardware troubleshooting'],
    location: {
      building: 'Main Building',
      floor: '2nd Floor',
      room: '201'
    },
    tags: ['printer', 'hardware', 'error'],
    status: 'open'
  },
  {
    title: 'Email client not syncing',
    description: 'Outlook is not syncing emails properly. Shows "disconnected" status. Tried restarting but issue persists.',
    category: 'email',
    priority: 'high',
    requiredSkills: ['email configuration', 'outlook troubleshooting'],
    location: {
      building: 'Main Building',
      floor: '1st Floor',
      room: '105'
    },
    tags: ['email', 'outlook', 'sync'],
    status: 'assigned'
  },
  {
    title: 'Network connectivity issues in Marketing department',
    description: 'Multiple users in Marketing department reporting slow internet and connection drops. Affecting work productivity.',
    category: 'network',
    priority: 'urgent',
    requiredSkills: ['network administration', 'troubleshooting'],
    location: {
      building: 'Main Building',
      floor: '3rd Floor',
      room: 'Marketing Area'
    },
    tags: ['network', 'connectivity', 'urgent'],
    status: 'in_progress'
  },
  {
    title: 'Software installation permission denied',
    description: 'Trying to install Adobe Creative Suite but getting permission denied error. Need admin rights or assistance.',
    category: 'software',
    priority: 'medium',
    requiredSkills: ['software installation', 'access management'],
    location: {
      building: 'Main Building',
      floor: '2nd Floor',
      room: 'Design Studio'
    },
    tags: ['software', 'installation', 'permissions'],
    status: 'open'
  },
  {
    title: 'VPN connection failing',
    description: 'Cannot connect to company VPN from home. Error message: "Authentication failed". Credentials are correct.',
    category: 'network',
    priority: 'high',
    requiredSkills: ['vpn configuration', 'network troubleshooting'],
    location: {
      building: 'Remote',
      floor: 'N/A',
      room: 'N/A'
    },
    tags: ['vpn', 'remote', 'authentication'],
    status: 'open'
  }
];

const seedDatabase = async () => {
  try {
    // Connect to database
    await connectDB();
    
    console.log(' Starting database seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Issue.deleteMany({});
    
    console.log('  Cleared existing data');

    // Create users
    const createdUsers = await User.create(sampleUsers);
    console.log(` Created ${createdUsers.length} users`);

    // Create issues with proper user references
    const issuesWithUsers = sampleIssues.map((issue, index) => ({
      ...issue,
      postedBy: createdUsers[index % createdUsers.length]._id,
      assignedTo: index === 1 ? createdUsers[1]._id : null // Assign second issue to Jane
    }));

    const createdIssues = await Issue.create(issuesWithUsers);
    console.log(` Created ${createdIssues.length} issues`);

    // Add some comments to issues
    const issue1 = createdIssues[0];
    issue1.addComment(createdUsers[1]._id, 'I can help with this printer issue. Will check it in the morning.', false);
    issue1.addComment(createdUsers[0]._id, 'Thanks Jane! Let me know what you find.', false);
    await issue1.save();

    const issue2 = createdIssues[1];
    issue2.addComment(createdUsers[2]._id, 'This is affecting my work. Need urgent help!', false);
    issue2.addComment(createdUsers[1]._id, 'I\'ll look into this right away. Please try restarting Outlook first.', false);
    await issue2.save();

    console.log('💬 Added sample comments');

    // Randomize points and experience for testing recommendations
    for (const user of createdUsers) {
      const postedCount = await Issue.countDocuments({ postedBy: user._id });

      // Randomize experience-like metrics
      const randomResolved = Math.floor(Math.random() * 40); // 0-39
      const randomPoints = Math.floor(Math.random() * 250); // 0-249
      const randomRating = (Math.random() * 2 + 3).toFixed(1); // 3.0 - 5.0
      const randomRatingCount = Math.floor(Math.random() * 50) + 5; // 5 - 54
      const lastActiveDaysAgo = Math.floor(Math.random() * 30); // 0-29 days ago

      user.contributions.issuesPosted = postedCount;
      user.contributions.issuesResolved = randomResolved;
      user.contributions.points = randomPoints;
      user.rating.average = Math.min(5, Math.max(0, Number(randomRating)));
      user.rating.count = randomRatingCount;
      user.lastActive = new Date(Date.now() - lastActiveDaysAgo * 24 * 60 * 60 * 1000);

      await user.save();
    }

    console.log('📊 Randomized user points, experience, and activity');

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📝 Sample login credentials:');
    console.log('Email: john.doe@company.com, Password: password123');
    console.log('Email: jane.smith@company.com, Password: password123');
    console.log('Email: mike.johnson@company.com, Password: password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, sampleUsers, sampleIssues }; 