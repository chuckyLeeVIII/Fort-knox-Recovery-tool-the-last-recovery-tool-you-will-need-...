import express from 'express';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

app.post('/api/recover', async (req, res) => {
  try {
    const { input } = req.body;
    
    // Create a temporary file with the input data
    const tempFile = join(__dirname, 'temp_wallet_data.txt');
    await fs.writeFile(tempFile, input);

    // Run the Python script
    const pythonProcess = spawn('python3', ['wallet_recovery.py', tempFile], {
      cwd: __dirname
    });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', async (code) => {
      // Clean up temp file
      try {
        await fs.unlink(tempFile);
      } catch (err) {
        console.error('Error cleaning up temp file:', err);
      }

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

const port = 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});