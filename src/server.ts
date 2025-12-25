import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../dist')));

app.post('/api/recover', async (req, res) => {
  try {
    const { input } = req.body;
    
    // Run the Python script passing '-' to read from stdin
    const pythonProcess = spawn('python3', ['wallet_recovery.py', '-'], {
      cwd: process.cwd()
    });

    // Write input to stdin
    pythonProcess.stdin.write(input);
    pythonProcess.stdin.end();

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error('Python script error:', errorOutput);
        return res.status(500).json({ error: 'Wallet recovery script failed' });
      }

      // Parse the results
      const variations = [];
      let currentVariation = null;
      let metadata = null;

      const lines = output.split('\n');
      for (const line of lines) {
        if (line.startsWith('Key Variation #')) {
          if (currentVariation) {
            variations.push(currentVariation);
          }
          currentVariation = {
            id: parseInt(line.match(/\d+/)[0]),
            addresses: []
          };
        } else if (line.startsWith('Private Key:')) {
          currentVariation.privateKeyHex = line.split(':')[1].trim();
        } else if (line.startsWith('WIF:')) {
          currentVariation.wif = line.split(':')[1].trim();
        } else if (line.startsWith('Seed Phrase:')) {
          currentVariation.seedPhrase = line.split(':')[1].trim();
        } else if (line.match(/^[A-Z]+:/)) {
          const [chain, rest] = line.split(':');
          const [address, balance] = rest.split('(');
          currentVariation.addresses.push({
            chain,
            address: address.trim(),
            balance: balance ? balance.replace(')', '').trim() : ''
          });
        } else if (line.includes('Total Tested Variations:')) {
          metadata = {
            totalVariations: parseInt(line.split(':')[1].trim()),
            timeElapsed: '',
            memoryUsed: '',
            chainCoverage: []
          };
        } else if (line.includes('Time Elapsed:')) {
          metadata.timeElapsed = line.split(':')[1].trim();
        } else if (line.includes('Memory Used:')) {
          metadata.memoryUsed = line.split(':')[1].trim();
        } else if (line.includes('Chain Coverage:')) {
          metadata.chainCoverage = line.split(':')[1].trim().split(',').map(c => c.trim());
        }
      }

      if (currentVariation) {
        variations.push(currentVariation);
      }

      res.json({ variations, metadata });
    });
  } catch (error) {
    console.error('Recovery error:', error);
    res.status(500).json({ error: 'Failed to process wallet recovery' });
  }
});

// Handle any other requests by serving the index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});