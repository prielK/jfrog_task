const express = require('express');
const axios = require('axios');
const _ = require('lodash');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const userRoutes = require('./routes/users');
const { formatUserData, validateRequest } = require('./utils/helpers');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demoSecretKeyForMaskScanner.4v8Qw1Q2w3e4r5t6y7u8i9o0p';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic logging middleware using moment
app.use((req, res, next) => {
  console.log(`${moment().format('YYYY-MM-DD HH:mm:ss')} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: moment().toISOString(),
    version: '1.0.0'
  });
});

// Example endpoint that demonstrates vulnerable axios usage
app.get('/api/external-data', async (req, res) => {
  try {
    // This uses the vulnerable axios version
    const response = await axios.get('https://jsonplaceholder.typicode.com/users');
    const processedData = _.map(response.data, user => formatUserData(user));
    
    res.json({
      success: true,
      data: processedData,
      fetchedAt: moment().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch external data',
      timestamp: moment().toISOString()
    });
  }
});

// Login endpoint demonstrating JWT and bcrypt usage
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!validateRequest(req.body, ['username', 'password'])) {
    return res.status(400).json({
      success: false,
      error: 'Username and password are required'
    });
  }

  try {
    // In a real app, you'd check against a database
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate JWT token (using vulnerable version)
    const token = jwt.sign(
      { username, loginTime: moment().unix() },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: { username },
      loginTime: moment().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: moment().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    timestamp: moment().toISOString()
  });
});

// Importing the app in tests must not leave a listening server behind.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Started at: ${moment().format('YYYY-MM-DD HH:mm:ss')}`);
  });
}

module.exports = app; 