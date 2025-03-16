import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../css/Login.css'; // Use Login.css instead of Register.css

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();
  const gridContainerRef = useRef(null);
  const rowLinesRef = useRef([]);
  const colLinesRef = useRef([]);

  useEffect(() => {
    // Create grid animation effects for the gaps between grid items
    const gridSize = 16; // 16x16 grid
    const createGridLines = () => {
      const container = gridContainerRef.current;
      if (!container) return;
      
      // Get container dimensions
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      
      // Calculate cell size
      const cellWidth = containerWidth / gridSize;
      const cellHeight = containerHeight / gridSize;
      
      // Create row lines (horizontal lines)
      for (let i = 0; i <= gridSize; i++) {
        const rowLine = document.createElement('div');
        rowLine.className = 'grid-row-line';
        rowLine.style.top = `${i * cellHeight}px`;
        container.appendChild(rowLine);
        rowLinesRef.current.push(rowLine);
      }
      
      // Create column lines (vertical lines)
      for (let i = 0; i <= gridSize; i++) {
        const colLine = document.createElement('div');
        colLine.className = 'grid-col-line';
        colLine.style.left = `${i * cellWidth}px`;
        container.appendChild(colLine);
        colLinesRef.current.push(colLine);
      }
    };
    
    // Call once to create the lines
    createGridLines();
    
    // Animate the grid lines
    let currentRowLine = 0;
    let currentColLine = 0;
    
    const animateLines = () => {
      // Clear all active lines
      rowLinesRef.current.forEach(line => {
        line.classList.remove('active-line');
      });
      colLinesRef.current.forEach(line => {
        line.classList.remove('active-line');
      });
      
      // Activate current row line
      if (rowLinesRef.current[currentRowLine]) {
        rowLinesRef.current[currentRowLine].classList.add('active-line');
      }
      
      // Move to next row line
      currentRowLine = (currentRowLine + 1) % (gridSize + 1);
      
      // If we've completed a full cycle of rows, move to the next column
      if (currentRowLine === 0) {
        // Deactivate previous column line
        if (colLinesRef.current[currentColLine]) {
          colLinesRef.current[currentColLine].classList.remove('active-line');
        }
        
        // Move to next column line
        currentColLine = (currentColLine + 1) % (gridSize + 1);
        
        // Activate new column line
        if (colLinesRef.current[currentColLine]) {
          colLinesRef.current[currentColLine].classList.add('active-line');
        }
      }
    };
    
    // Start the animation
    const interval = setInterval(animateLines, 100); // Adjust speed as needed
    
    // Handle window resize
    const handleResize = () => {
      // Clear existing lines
      rowLinesRef.current.forEach(line => line.remove());
      colLinesRef.current.forEach(line => line.remove());
      rowLinesRef.current = [];
      colLinesRef.current = [];
      
      // Recreate lines with new dimensions
      createGridLines();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup function
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      rowLinesRef.current.forEach(line => line.remove());
      colLinesRef.current.forEach(line => line.remove());
    };
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user types
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate form
    if (!formData.name || !formData.email || !formData.password) {
      setError('All fields are required');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      await register(formData.name, formData.email, formData.password);
      navigate('/chat');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Create grid items for background
  const gridSize = 16;
  const createGridItems = () => {
    const items = [];
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const index = row * gridSize + col;
        items.push(
          <div 
            key={index} 
            className="grid-item"
            data-row={row}
            data-col={col}
          />
        );
      }
    }
    return items;
  };

  return (
    <div className="login-page">
      <div className="animated-gradient"></div>
      <div className="grid-container" ref={gridContainerRef}>
        {createGridItems()}
      </div>

      {/* Register Form */}
      <div className="login-container">
        <h2 className="title">SIGN UP</h2>

        {/* Error Display */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form">
          {/* Name Field */}
          <div className="input-group">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input-field"
              placeholder="Full Name"
              required
            />
          </div>

          {/* Email Field */}
          <div className="input-group">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input-field"
              placeholder="Email"
              required
            />
          </div>

          {/* Password Field */}
          <div className="input-group">
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input-field"
              placeholder="Password"
              required
            />
          </div>

          {/* Confirm Password Field */}
          <div className="input-group">
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="input-field"
              placeholder="Confirm Password"
              required
            />
          </div>

          {/* Links */}
          <div className="links">
            <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem' }}>Password must be at least 6 characters</span>
            <Link to="/login" className="link">
              Sign in
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`submit-btn ${loading ? 'loading' : ''}`}
          >
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        {/* Terms and Privacy Notice */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-gray-400 text-xs">
            By continuing, you agree to our{' '}
            <a href="#" className="link">Terms</a>
            {' '}and{' '}
            <a href="#" className="link">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;