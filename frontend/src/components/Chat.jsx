import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { format } from 'date-fns';

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [historicalChats, setHistoricalChats] = useState({});
  const [allMessages, setAllMessages] = useState([]); // Store all messages for history navigation
  const messagesEndRef = useRef(null);
  const sidebarRef = useRef(null);
  const historyButtonRef = useRef(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Close sidebar when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (showSidebar && 
          sidebarRef.current && 
          !sidebarRef.current.contains(event.target) &&
          historyButtonRef.current && 
          !historyButtonRef.current.contains(event.target)) {
        setShowSidebar(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSidebar]);

  // Load chat history when component mounts
  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Fetching chat history with token:', token);
        
        if (!token) {
          console.error('No token found in localStorage');
          navigate('/login');
          return;
        }
        
        const response = await axios.get('https://chatwithai-g0ug.onrender.com/api/chat/history', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Chat history response:', response.data);
        
        // Convert the server response to the format our component uses
        const formattedMessages = response.data.map(msg => ({
          type: msg.role, // 'user' or 'bot'
          text: msg.content,
          timestamp: new Date(msg.timestamp),
          id: msg._id // Store message ID for reference
        }));
        
        // Save all messages for history navigation
        setAllMessages(formattedMessages);
        
        // Only show most recent messages initially
        const recentMessages = getRecentConversation(formattedMessages);
        setMessages(recentMessages);
        
        // Organize messages by date for the sidebar
        organizeMessagesByDate(formattedMessages);
      } catch (error) {
        console.error('Failed to load chat history:', error);
        
        if (error.response?.status === 401) {
          console.error('Authentication error, redirecting to login');
          navigate('/login');
        }
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchChatHistory();
  }, [navigate]);

  // Get the most recent conversation
  const getRecentConversation = (allMsgs) => {
    if (allMsgs.length === 0) return [];
    
    // Sort by timestamp descending
    const sortedMsgs = [...allMsgs].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    // Get the most recent user message
    const lastUserMsg = sortedMsgs.find(msg => msg.type === 'user');
    if (!lastUserMsg) return [];
    
    // Get messages from the last hour of conversation
    const lastMsgTime = new Date(lastUserMsg.timestamp);
    const oneHourBefore = new Date(lastMsgTime);
    oneHourBefore.setHours(oneHourBefore.getHours() - 1);
    
    return allMsgs.filter(msg => new Date(msg.timestamp) >= oneHourBefore)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  // Organize messages by date
  const organizeMessagesByDate = (messages) => {
    const chatsByDate = {};
    
    // First pass: collect user messages as conversation starters
    messages.forEach(msg => {
      if (msg.type === 'user') {
        const dateKey = format(new Date(msg.timestamp), 'yyyy-MM-dd');
        const readableDate = format(new Date(msg.timestamp), 'MMMM d, yyyy');
        
        if (!chatsByDate[dateKey]) {
          chatsByDate[dateKey] = {
            date: readableDate,
            chats: []
          };
        }
        
        // Find any bot response that came after this message
        const botResponses = messages
          .filter(m => m.type === 'bot' && 
                  new Date(m.timestamp) > new Date(msg.timestamp))
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        const nextUserMsg = messages
          .filter(m => m.type === 'user' && m !== msg && 
                  new Date(m.timestamp) > new Date(msg.timestamp))
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[0];
        
        // Get the closest bot response (before the next user message)
        let botResponse = null;
        if (botResponses.length > 0) {
          if (!nextUserMsg) {
            botResponse = botResponses[0];
          } else {
            botResponse = botResponses.find(b => 
              new Date(b.timestamp) < new Date(nextUserMsg.timestamp)
            );
          }
        }
        
        // Use first 30 chars of message as preview
        const preview = msg.text.length > 30 ? `${msg.text.substring(0, 30)}...` : msg.text;
        const time = format(new Date(msg.timestamp), 'h:mm a');
        
        chatsByDate[dateKey].chats.push({
          preview,
          time,
          fullTimestamp: msg.timestamp,
          userMsgId: msg.id,
          botResponseId: botResponse?.id,
          userMsg: msg,
          botResponse: botResponse
        });
      }
    });
    
    // Sort chats within each day by timestamp (newest first)
    Object.keys(chatsByDate).forEach(dateKey => {
      chatsByDate[dateKey].chats.sort((a, b) => 
        new Date(b.fullTimestamp) - new Date(a.fullTimestamp)
      );
    });
    
    setHistoricalChats(chatsByDate);
  };

  // Load a specific conversation
  const loadConversation = (userMsg, botResponse) => {
    let conversationMsgs = [];
    
    // Add the user message
    conversationMsgs.push(userMsg);
    
    // Add bot response if exists
    if (botResponse) {
      conversationMsgs.push(botResponse);
    }
    
    // Sort by timestamp
    conversationMsgs.sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    // Set as current conversation
    setMessages(conversationMsgs);
    
    // Close sidebar
    setShowSidebar(false);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const clearChatHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your chat history? This cannot be undone.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete('https://chatwithai-g0ug.onrender.com/api/chat/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessages([]);
      setHistoricalChats({});
    } catch (error) {
      if (error.response?.status === 401) {
        navigate('/login');
      } else {
        console.error('Failed to clear chat history:', error);
        alert('Failed to clear chat history. Please try again.');
      }
    }
  };

  // Format the bot's response text
  const formatBotResponse = (text) => {
    // Remove asterisks
    let formattedText = text.replace(/\*/g, '');

    // Handle numbered lists (e.g., "1.", "2.", etc.)
    formattedText = formattedText.split('\n').map((line, index) => {
      if (/^\d+\.\s/.test(line)) {
        return `<div class="ml-4">• ${line.replace(/^\d+\.\s/, '')}</div>`;
      }
      return line;
    }).join('\n');

    // Handle bullet points
    formattedText = formattedText.split('\n').map(line => {
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        return `<div class="ml-4">${line}</div>`;
      }
      return line;
    }).join('\n');

    // Convert newlines to <br> tags
    return formattedText.replace(/\n/g, '<br>');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    // For debugging
    console.log('Sending message:', input);
    console.log('Token:', localStorage.getItem('token'));

    setMessages(prev => [...prev, { 
      type: 'user', 
      text: input, 
      timestamp: new Date() 
    }]);
    setLoading(true);
    const userInput = input;
    setInput('');

    try {
      const token = localStorage.getItem('token');
      console.log('Making API request with token:', token);
      
      const response = await axios.post(
        'https://chatwithai-g0ug.onrender.com/api/chat/generate', 
        { question: userInput },
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      console.log('API response:', response.data);
      
      const botMessage = {
        type: 'bot',
        text: response.data.answer,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
      setAllMessages(prev => [...prev, 
        { type: 'user', text: userInput, timestamp: new Date() },
        botMessage
      ]);

      // Update sidebar chat history
      const dateKey = format(new Date(), 'yyyy-MM-dd');
      const readableDate = format(new Date(), 'MMMM d, yyyy');
      const preview = userInput.length > 30 ? `${userInput.substring(0, 30)}...` : userInput;
      const time = format(new Date(), 'h:mm a');

      setHistoricalChats(prev => {
        const updated = { ...prev };
        if (!updated[dateKey]) {
          updated[dateKey] = {
            date: readableDate,
            chats: []
          };
        }
        
        // Add to beginning of array for today
        updated[dateKey].chats.unshift({
          preview,
          time,
          fullTimestamp: new Date(),
          userMsg: { type: 'user', text: userInput, timestamp: new Date() },
          botResponse: botMessage
        });
        
        return updated;
      });
    } catch (error) {
      console.error('API error full details:', error);
      // Rest of your error handling...
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#121212] relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 z-0 pointer-events-none"
           style={{
             background: 'linear-gradient(to bottom, #1a0000 0%, #1a0000 30%, #1a0000 50%, #1a0000 70%, #1a0000 100%)',
             opacity: 0.8
           }}>
      </div>
      
      {/* Header - Updated with simplified layout */}
      <div className="bg-black/70 backdrop-blur-sm border-b border-red-900/30 shadow-md relative z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* AI Assistant title fixed on left */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-white flex items-center">
              <div className="w-8 h-8 mr-2 rounded-lg bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
                </svg>
              </div>
              AI Assistant
            </h1>
          </div>
          
          {/* Logout button fixed on right */}
          <div>
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-sm font-medium text-gray-200 bg-gray-800/60 hover:bg-gray-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 relative z-10 overflow-hidden">
        {/* Sidebar */}
        <div 
          ref={sidebarRef}
          className={`absolute inset-y-0 left-0 w-72 bg-gray-900/80 backdrop-blur-sm border-r border-gray-700 transform transition-transform duration-300 ease-in-out z-20 
                    ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}
          onMouseLeave={() => setShowSidebar(false)}
        >
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Chat History</h2>
          </div>
          
          <div className="overflow-y-auto h-[calc(100%-145px)]">
            {Object.entries(historicalChats).length === 0 ? (
              <div className="p-4 text-gray-400 text-center">
                No chat history yet
              </div>
            ) : (
              Object.entries(historicalChats)
                .sort(([dateKeyA], [dateKeyB]) => new Date(dateKeyB) - new Date(dateKeyA))
                .map(([dateKey, { date, chats }]) => (
                  <div key={dateKey} className="mb-4">
                    <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
                      {date}
                    </div>
                    {chats.map((chat, idx) => (
                      <div 
                        key={`${dateKey}-${idx}`}
                        className="px-4 py-3 hover:bg-gray-800/50 cursor-pointer transition-colors"
                        onClick={() => loadConversation(chat.userMsg, chat.botResponse)}
                      >
                        <div className="text-sm text-white font-medium truncate">
                          {chat.preview}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {chat.time}
                        </div>
                      </div>
                    ))}
                  </div>
                ))
            )}
          </div>
          
          {/* Clear history button moved to sidebar */}
          <div className="absolute bottom-20 left-0 right-0 p-4 border-t border-gray-700">
            <button
              onClick={clearChatHistory}
              className="w-full px-3 py-2 text-sm font-medium text-white bg-red-700/80 hover:bg-red-700 rounded-md transition-colors focus:outline-none"
            >
              <div className="flex items-center justify-center">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear History
              </div>
            </button>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingHistory ? (
              <div className="flex justify-center items-center h-full">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
                </svg>
                <p className="text-lg">No messages yet. Start a conversation!</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : message.error
                        ? 'bg-red-500/10 text-red-400 border border-red-500/50'
                        : 'bg-gray-700/50 text-white'
                    }`}
                  >
                    {message.type === 'bot' ? (
                      <div 
                        className="prose prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ 
                          __html: formatBotResponse(message.text) 
                        }}
                      />
                    ) : (
                      message.text
                    )}
                    {message.timestamp && (
                      <div className={`text-xs mt-2 ${message.type === 'user' ? 'text-gray-300' : 'text-gray-400'}`}>
                        {format(new Date(message.timestamp), 'h:mm a')}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-700/50 text-white p-4 rounded-lg flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700 bg-gray-900/70 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto flex gap-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-gray-700/50 text-white rounded-lg px-4 py-2 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 
                         border border-gray-600"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className={`px-6 py-2 rounded-lg ${
                  loading || !input.trim()
                    ? 'bg-blue-600/50 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white font-medium transition-colors`}
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* History button at bottom left */}
      <div 
        className="absolute bottom-20 left-4 z-30 cursor-pointer"
        onMouseEnter={() => setShowSidebar(true)}
        ref={historyButtonRef}
      >
        <button 
          className="flex items-center justify-center w-12 h-12 rounded-full bg-red-800 text-white shadow-lg hover:bg-red-700 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default Chat;