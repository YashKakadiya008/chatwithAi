const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./db/connect');

// Import routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // or whatever your frontend URL is
  credentials: true
}));
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server is listening on port:', PORT);
});