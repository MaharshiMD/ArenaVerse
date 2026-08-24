// Shared API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== '' 
  ? import.meta.env.VITE_API_URL 
  : 'http://localhost:5000';

export const DEFAULT_AVATAR = '/images/default-avatar.png';

