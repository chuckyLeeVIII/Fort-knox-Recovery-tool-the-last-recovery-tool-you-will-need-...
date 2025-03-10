import { spawn } from 'child_process';

// Start the Express server
spawn('node', ['src/server.js'], { stdio: 'inherit' });

// Wait a moment for the server to start
setTimeout(() => {
  // Start Vite dev server
  spawn('npm', ['run', 'dev'], { stdio: 'inherit' });
}, 1000);