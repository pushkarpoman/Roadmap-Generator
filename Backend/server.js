require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const roadmapRoutes = require('./routes/roadmap');

// Verify environment variables
if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables');
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error('FATAL ERROR: MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const mongooseOptions = {
  // modern mongoose defaults are fine, but being explicit helps troubleshooting
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // Wait up to 10s for server selection (matching the buffering timeout you saw)
  serverSelectionTimeoutMS: 10000,
};

mongoose.connect(process.env.MONGODB_URI, mongooseOptions)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => {
    console.error('MongoDB connection error:', err && err.message ? err.message : err);
    // Provide more context for common causes
    console.error('MongoDB URI:', process.env.MONGODB_URI ? '[REDACTED]' : 'not set');
    console.error('Common causes: network blocked, Atlas IP whitelist, wrong credentials, or invalid connection string.');
    // Exit so the app doesn't run in a broken state
    process.exit(1);
  });

// Helpful listeners for mongoose connection state
mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error event:', err && err.message ? err.message : err);
});
mongoose.connection.on('disconnected', () => {
  console.warn('Mongoose disconnected from MongoDB');
});

// Routes with request logging
app.use('/api/auth', (req, res, next) => {
  console.log(`Auth Request: ${req.method} ${req.url}`);
  next();
}, authRoutes);

app.use('/api/roadmap', (req, res, next) => {
  console.log(`Roadmap Request: ${req.method} ${req.url}`);
  next();
}, roadmapRoutes);

// Serve frontend static assets when in production
const path = require('path');
const publicPath = path.join(__dirname, 'public');

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(publicPath));

  // All other requests should serve the React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

// Error handling middleware (placed after routes)
app.use((err, req, res, next) => {
  console.error('Error:', err && err.stack ? err.stack : err);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});