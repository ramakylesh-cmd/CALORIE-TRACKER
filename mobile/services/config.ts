// =============================================================================
// NutriPulse — App Configuration
// =============================================================================
import { Platform } from 'react-native';

// Android emulator uses 10.0.2.2 to reach host machine's localhost.
// Physical device: replace with your computer's LAN IP (e.g., 192.168.1.100).
// Production: replace with your deployed Render URL.
export const API_BASE_URL = __DEV__
  ? Platform.select({
      android: 'http://10.0.2.2:5000',
      ios: 'http://localhost:5000',
      default: 'http://localhost:5000',
    })!
  : 'https://nutripulse-api.onrender.com';

export const GOOGLE_CLIENT_ID =
  '236595548964-mdlk7q8lgkipcbsu1lcssmnti6u34fp8.apps.googleusercontent.com';
