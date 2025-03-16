import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on initial load
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          // Configure axios
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          const res = await axios.get('https://chatwithai-g0ug.onrender.com/api/auth/me');
          setUser(res.data);
        } catch (error) {
          console.error('Failed to load user:', error);
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      
      setLoading(false);
    };
    
    loadUser();
  }, []);

  // Register user
  const register = async (name, email, password) => {
    try {
      const res = await axios.post('https://chatwithai-g0ug.onrender.com/api/auth/register', {
        name,
        email,
        password
      });
      
      // Store token and set default headers
      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      
      setUser(res.data.user);
      return res.data.user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      const res = await axios.post('https://chatwithai-g0ug.onrender.com/api/auth/login', {
        email,
        password
      });
      
      console.log('Login response:', res.data);
      
      // Store token and set default headers
      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      
      setUser(res.data.user);
      return res.data.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = {
    user,
    loading,
    register,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}