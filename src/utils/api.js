// Function to determine API URL based on environment
export function getApiUrl() {
  // Check if we're in production (deployed environment)
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // Use deployed backend URL
    return 'https://no-place-left-illinois-backend.onrender.com';
  }
  
  // If VITE_API_URL is explicitly set, use it (for local development)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Default to localhost for development
  return 'http://localhost:5100';
} 