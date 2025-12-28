
import { spawn } from 'child_process';

// Spawn backend
const backend = spawn('npx', ['ts-node', '--esm', 'src/server.ts'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PORT: '3001' }
});

// Spawn frontend (Vite)
const frontend = spawn('npx', ['vite'], {
    stdio: 'inherit',
    shell: true
});

// Handle termination
const cleanup = () => {
    backend.kill();
    frontend.kill();
    process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
