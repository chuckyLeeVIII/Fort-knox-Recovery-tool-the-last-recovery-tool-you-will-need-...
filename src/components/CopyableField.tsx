import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyableFieldProps {
  label: string;
  value: string;
  colorClass?: string;
  mono?: boolean;
}

export function CopyableField({ label, value, colorClass = "text-gray-100", mono = false }: CopyableFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="bg-gray-900/50 p-3 rounded-lg group relative">
      <div className="flex justify-between items-start mb-1">
        <p className="text-gray-400">{label}</p>
        <button
          onClick={handleCopy}
          className="text-gray-500 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1"
          aria-label={`Copy ${label}`}
          title="Copy to clipboard"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <p className={`${colorClass} break-all ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
