// Frontend service to handle roadmap API calls
import axios from 'axios';
import { authHeader } from './authService';

const API_URL = 'http://localhost:5000/api';

export const saveRoadmap = async (title, content) => {
  try {
    const response = await axios.post(
      `${API_URL}/roadmap`,
      { title, content },
      { headers: authHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getRoadmapHistory = async () => {
  try {
    const response = await axios.get(
      `${API_URL}/roadmap/history`,
      { headers: authHeader() }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};