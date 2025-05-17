# Fort Knox Recovery Tool 🔒

A powerful wallet recovery tool designed to help users recover lost or compromised cryptocurrency wallets with advanced security features and AI-powered analysis.

## Features 🌟

- **Multi-Chain Support**: Recovers wallets across multiple blockchains (BTC, ETH)
- **Advanced Recovery**: Uses AI-powered analysis to test multiple key derivation paths
- **Secure Processing**: All operations performed locally for maximum security
- **Real-Time Analysis**: Live feedback on recovery progress and chain coverage
- **Beautiful UI**: Modern, responsive interface with real-time updates

## Tech Stack 💻

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Backend**: Express.js + Python
- **Security**: Local processing, no external API calls for sensitive operations

## Getting Started 🚀

### Prerequisites

- Node.js 18+
- Python 3.8+
- Required Python packages:
  - pycryptodome (for wallet decryption)
  - web3 (for blockchain interactions)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/chuckyLeeVIII/Fort-knox-Recovery-tool-the-last-recovery-tool-you-will-need-...
   cd fort-knox-recovery
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install Python requirements:
   ```bash
   pip install pycryptodome web3
   ```

4. Start the development server:
   ```bash
   node src/start.ts
   ```

## Usage Guide 📖

1. **Input Methods**
   - Seed phrases
   - Private keys
   - Encrypted wallet files
   - Key hashes

2. **Recovery Process**
   - Enter wallet information in the input field
   - Click "Recover Wallet" to start the process
   - Monitor real-time progress and results
   - Review recovered addresses and balances

3. **Security Features**
   - Local processing only
   - No external API calls for sensitive data
   - Memory wiping after processing
   - Encrypted temporary storage

## API Reference 📚

### Recovery Endpoint

```typescript
POST /api/recover
Content-Type: application/json

{
  "input": "wallet-data-or-key"
}
```

Response:
```typescript
{
  "variations": [{
    "id": number,
    "privateKeyHex": string,
    "wif": string,
    "seedPhrase": string,
    "addresses": [{
      "chain": string,
      "address": string,
      "balance": string
    }]
  }],
  "metadata": {
    "totalVariations": number,
    "timeElapsed": string,
    "memoryUsed": string,
    "chainCoverage": string[]
  }
}
```

## Security Considerations 🛡️

- Never share private keys or seed phrases
- Use only on trusted devices
- Clear browser cache after use
- Verify addresses before transactions
- Keep recovery data secure

## Development 👨‍💻

### Project Structure

```
fort-knox-recovery/
├── src/
│   ├── App.tsx           # Main React component
│   ├── server.ts         # Express backend
│   ├── wallet_recovery.py # Python recovery script
│   └── start.ts          # Development server
├── public/
└── package.json
```

### Running Tests

```bash
npm run test
```

### Building for Production

```bash
npm run build
```

## Contributing 🤝

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Open a Pull Request

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer ⚠️

This tool is for legitimate wallet recovery only. Users are responsible for ensuring they have the right to access any wallet they attempt to recover. The developers are not responsible for any misuse of this tool.

## Support 💬

For support, please open an issue in the GitHub repository or contact the development team.
