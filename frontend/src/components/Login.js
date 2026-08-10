import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const { port, hostname, protocol } = window.location;
    // If running on any local port other than backend port 5000 (e.g. 3000, 3001, 5001, 8080, etc.), route to backend port 5000
    if (port && port !== '5000') {
      return `${protocol}//${hostname}:5000/api`;
    }
  }
  return process.env.REACT_APP_API_URL || '/api';
};

const API_URL = getApiUrl();

function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await axios.post(`${API_URL}${endpoint}`, formData, { timeout: 4000 });
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.removeItem('isClientDemo');
      
      navigate('/game');
    } catch (err) {
      console.error('Login/Register Error:', err);
      
      // If network is unreachable or server offline, fall back to In-Browser Demo Mode seamlessly
      if (err.message === 'Network Error' || !err.response || err.code === 'ECONNABORTED') {
        console.warn('Backend API unreachable. Falling back to In-Browser Demo Mode.');
        const mockUser = {
          id: 'demo_' + Math.random().toString(36).substring(2, 8),
          username: formData.username || (formData.email ? formData.email.split('@')[0] : 'Player'),
          email: formData.email || 'demo@example.com',
          gamesPlayed: 0,
          gamesWon: 0
        };
        localStorage.setItem('token', 'demo_client_token_' + Date.now());
        localStorage.setItem('user', JSON.stringify(mockUser));
        localStorage.setItem('isClientDemo', 'true');
        
        navigate('/game');
        return;
      }

      const serverMessage = err.response?.data?.message;
      const detailError = err.response?.data?.error;
      const validationErrors = err.response?.data?.errors;
      const statusText = err.response?.status ? ` (Status ${err.response.status})` : '';
      
      let displayError = serverMessage;
      if (!displayError && validationErrors && Array.isArray(validationErrors)) {
        displayError = validationErrors.map(v => `${v.path || v.param || 'field'}: ${v.msg}`).join(', ');
      }
      if (!displayError) {
        displayError = err.message || 'An unexpected error occurred';
      }
      if (detailError) {
        displayError += ` Details: ${detailError}`;
      }
      setError(`${displayError}${statusText}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>{isLogin ? 'Login' : 'Register'}</h1>
        <p className="subtitle">Hangman Game</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                minLength="3"
                placeholder="Enter username"
              />
            </div>
          )}
          
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter email"
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
              placeholder="Enter password"
            />
          </div>
          
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Loading...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>
        
        <p className="toggle-text">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;
