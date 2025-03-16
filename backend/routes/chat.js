const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

// Get chat history for the current user
router.get('/history', auth, async (req, res) => {
  try {
    const messages = await Message.find({ userId: req.user.id })
      .sort({ timestamp: 1 });
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Clear chat history for the current user
router.delete('/history', auth, async (req, res) => {
  try {
    await Message.deleteMany({ userId: req.user.id });
    res.json({ message: 'Chat history cleared successfully' });
  } catch (error) {
    console.error('Error clearing chat history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

const generate = async (prompt) => {
  try {
    console.log('Received prompt:', prompt);
    const result = await model.generateContent(prompt);
    const response = await result.response.text();
    console.log('Generated response:', response);
    return response;
  } catch (error) {
    console.error("ERROR in generate function:", error);
    throw error;
  }
};

router.post("/generate", auth, async (req, res) => {
  try {
    console.log('Received request body:', req.body);
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    console.log('User ID from token:', req.user.id);

    // Save user message to database
    try {
      const userMessage = new Message({
        userId: req.user.id,
        content: question,
        role: 'user'
      });
      
      const savedUserMessage = await userMessage.save();
      console.log('User message saved:', savedUserMessage);
    } catch (dbError) {
      console.error('Failed to save user message:', dbError);
    }


    // Generate AI response
    let response;
    try {
      response = await generate(question);
      console.log('Generated response successfully');
    } catch (aiError) {
      console.error('Error generating AI response:', aiError);
      return res.status(500).json({ error: 'Failed to generate AI response' });
    }

    // Save bot response to database
    try {
      const botMessage = new Message({
        userId: req.user.id,
        content: response,
        role: 'bot'
      });
      
      const savedBotMessage = await botMessage.save();
      console.log('Bot message saved:', savedBotMessage);
    } catch (dbError) {
      console.error('Failed to save bot message:', dbError);
    }
    
    return res.json({ answer: response });
  } catch (error) {
    console.error("ERROR in generate endpoint:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Test database connection
router.get('/test-db', auth, async (req, res) => {
  try {
    // Try to create a test message
    const testMessage = new Message({
      userId: req.user.id,
      content: 'This is a test message',
      role: 'user'
    });
    
    const saved = await testMessage.save();
    
    // Try to retrieve it
    const retrieved = await Message.findById(saved._id);
    
    res.json({
      success: true,
      saved: saved,
      retrieved: retrieved,
      collections: await mongoose.connection.db.listCollections().toArray()
    });
  } catch (error) {
    console.error('Test DB error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;