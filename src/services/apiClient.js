import axios from 'axios';

let memoryAccessToken = null;

export const setMemoryAccessToken = (token) => {
  memoryAccessToken = token;
};

export const getMemoryAccessToken = () => {
  return memoryAccessToken;
};

const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true
});

// Request Interceptor: Menyisipkan Access Token
apiClient.interceptors.request.use(
  (config) => {
    if (memoryAccessToken) {
      config.headers['Authorization'] = `Bearer ${memoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Menangani Refresh Token Otomatis jika 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await axios.get('/api/auth/refresh', { withCredentials: true });
        const newAccessToken = res.data.accessToken;
        setMemoryAccessToken(newAccessToken);
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        setMemoryAccessToken(null);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;