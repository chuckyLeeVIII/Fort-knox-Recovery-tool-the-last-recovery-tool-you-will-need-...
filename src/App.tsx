import React, { useState, useRef } from 'react';
import { Search, ArrowRight, AlertCircle, Key, Clock, Database, Activity, Bitcoin, X } from 'lucide-react';
import { CopyableField } from './components/CopyableField';

type KeyVariation = {
  id: number;
  privateKeyHex: string;
  wif: string;
  seedPhrase: string;
  addresses: {
    chain: string;
    address: string;
    balance: string;
  }[];
};

type RecoveryMetadata = {
  totalVariations: number;
  timeElapsed: string;
  memoryUsed: string;
  chainCoverage: string[];
};

function App() {
  const [input, setInput] = useState('');
  const [variations, setVariations] = useState<KeyVariation[]>([]);
  const [metadata, setMetadata] = useState<RecoveryMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTagline] = useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setVariations([]);
    setMetadata(null);

    try {
      const response = await fetch('/api/recover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        throw new Error('Recovery request failed');
      }

      const data = await response.json();
      setVariations(data.variations);
      setMetadata(data.metadata);

    } catch (err) {
      setError(err.message || 'Failed to process input. Please check the format and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 p-4">
      <div className="max-w-3xl mx-auto space-y-8 py-12">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-6">
            <Bitcoin className="w-20 h-20 text-red-900" />
          </div>
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-900 to-red-700">
            FORT KNOX RECOVERY TOOL
          </h1>
          {showTagline && (
            <p className="text-red-700 text-xl font-semibold italic max-w-lg mx-auto">
              "We treat your money like it's ours... even if some other dumbass lost it."
            </p>
          )}
          <p className="text-gray-500 max-w-lg mx-auto mt-4">
            Enter your wallet information (seed phrase, key hash, or encrypted data)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label htmlFor="recovery-input" className="sr-only">Wallet Recovery Information</label>
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" aria-hidden="true" />
            <textarea
              ref={inputRef}
              id="recovery-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter wallet recovery information..."
              className="w-full h-32 bg-gray-900 border border-red-900/50 rounded-lg pl-12 pr-12 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-transparent"
            />
            {input.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setInput('');
                  inputRef.current?.focus();
                }}
                className="absolute right-4 top-3.5 text-gray-500 hover:text-white transition-colors focus:outline-none focus:text-white"
                aria-label="Clear input"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            aria-busy={isLoading}
            className="w-full bg-red-900 hover:bg-red-800 disabled:bg-gray-800 disabled:cursor-not-allowed py-3 px-6 rounded-lg font-medium transition duration-150 flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Recovering...</span>
              </>
            ) : (
              <>
                <span>Recover Wallet</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>

        {error ? (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400">{error}</p>
          </div>
        ) : variations.length > 0 && (
          <div className="space-y-6">
            {variations.map((variation) => (
              <div
                key={variation.id}
                className="bg-gray-900/50 border border-red-900/30 rounded-lg overflow-hidden"
              >
                <div className="border-b border-red-900/30 bg-black p-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Key className="h-5 w-5 text-red-700" />
                    Key Variation #{variation.id}
                  </h3>
                </div>
                
                <div className="p-4 space-y-4">
                  <div className="space-y-2 font-mono text-sm">
                    <CopyableField
                      label="Private Key:"
                      value={variation.privateKeyHex}
                      colorClass="text-red-500"
                    />
                    <CopyableField
                      label="WIF:"
                      value={variation.wif}
                      colorClass="text-red-400"
                    />
                    <CopyableField
                      label="Seed Phrase:"
                      value={variation.seedPhrase}
                      colorClass="text-red-300"
                    />
                  </div>

                  <div className="border-t border-red-900/30 my-4"></div>

                  <div className="space-y-2">
                    {variation.addresses.map((addr, i) => (
                      <div key={i}>
                        <CopyableField
                          label={`${addr.chain} Address (${addr.balance}):`}
                          value={addr.address}
                          colorClass="text-red-500"
                          mono
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {metadata && (
              <div className="bg-gray-900/50 border border-red-900/30 rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Database className="h-5 w-5 text-red-700" />
                  Additional Metadata
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">Total Tested:</span>
                    <span className="font-mono">{metadata.totalVariations}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">Time Elapsed:</span>
                    <span className="font-mono">{metadata.timeElapsed}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">Memory Used:</span>
                    <span className="font-mono">{metadata.memoryUsed}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">Chains:</span>
                    <span className="font-mono">{metadata.chainCoverage.join(', ')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <footer className="fixed bottom-0 left-0 right-0 bg-red-950 text-center py-2 text-sm text-red-200">
        <p>The Ex-Presidents - we treat your money like its ours even if some other dumbass lost it ...</p>
      </footer>
    </div>
  );
}

export default App;