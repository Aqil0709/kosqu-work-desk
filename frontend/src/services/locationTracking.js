/**
 * locationTracking.js
 * Auto-pings the employee's GPS every PING_INTERVAL ms to the backend.
 * Start when employee checks in, stop when they check out or close the app.
 */
import api from './api';

const PING_INTERVAL = 60_000; // 60 seconds

let _timer      = null;
let _isRunning  = false;

const getGPS = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 30_000,
    });
  });

const ping = async () => {
  try {
    const pos = await getGPS();
    const { latitude, longitude, accuracy, speed } = pos.coords;

    // Battery API (Chrome only, optional)
    let battery = null;
    try {
      if (navigator.getBattery) {
        const b = await navigator.getBattery();
        battery = Math.round(b.level * 100);
      }
    } catch (_) {}

    await api.post('/location-tracking/ping', { latitude, longitude, accuracy, speed, battery });
  } catch (_) {
    // Silent — don't crash the app if GPS fails
  }
};

export const startLocationTracking = () => {
  if (_isRunning) return;
  _isRunning = true;
  ping(); // immediate first ping
  _timer = setInterval(ping, PING_INTERVAL);
};

export const stopLocationTracking = () => {
  _isRunning = false;
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
};

export const isTracking = () => _isRunning;
