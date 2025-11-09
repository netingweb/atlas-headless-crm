import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// Use direct API URL - CORS is configured on the API side
// In production, use env variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000, // 10 seconds timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('auth_token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Network error (no response)
        if (!error.response) {
          console.error('Network error:', error.message);
          return Promise.reject(
            new Error(
              'Network error: Unable to connect to the server. Please check if the API is running.'
            )
          );
        }

        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('auth_token');
          // Only redirect if we're not already on login page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  get instance(): AxiosInstance {
    return this.client;
  }
}

export const apiClient = new ApiClient().instance;
