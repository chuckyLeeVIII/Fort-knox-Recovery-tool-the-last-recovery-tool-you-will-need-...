import { spawn } from 'child_process';

// Start the Express server
const server = spawn('npm', ['run', 'server'], { 
  stdio: 'inherit',
  env: { ...process.env, PORT: '3001' }
});

// Handle server process errors
server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Give the server a moment to start
setTimeout(async () => {
  const vite = spawn('npm', ['run', 'dev'], { 
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  vite.on('error', (err) => {
    console.error('Failed to start Vite:', err);
    process.exit(1);
  });
}, 2000);