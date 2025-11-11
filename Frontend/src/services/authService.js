import axios from 'axios';

// Use Vite env variable when provided, otherwise fall back to relative path so
// the app works when served from the same origin (Backend serves the static build).
const API_URL = import.meta.env.VITE_API_URL || '/api';

export const register = async (name, email, password) => {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, {
      name,
      email,
      password
    });
    
    if (!response.data.token) {
      throw new Error('Registration successful but no authentication token received');
    }

    // Store auth data
    localStorage.setItem('user', JSON.stringify(response.data.user));
    localStorage.setItem('token', response.data.token);

    // Trigger a storage event for other tabs/components
    window.dispatchEvent(new Event('storage'));
    
    return response.data;
  } catch (error) {
    if (error.response) {
      const serverMessage = error.response.data?.message || error.response.statusText || error.message;
      throw new Error(serverMessage);
    }
    throw new Error(error.message || 'Registration failed. Please try again.');
  }
};

export const login = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    });
    if (response.data.token) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 400) {
      throw new Error('Invalid email or password');
    }
    throw new Error('Login failed. Please try again.');
  }
};

export const logout = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
};

export const getCurrentUser = () => {
  return JSON.parse(localStorage.getItem('user'));
};

export const authHeader = () => {
  const token = localStorage.getItem('token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};