## 2024-05-22 - [Race Condition in Temporary Files]
**Learning:** Using fixed temporary filenames (like `temp_wallet_data.txt`) introduces race conditions in concurrent environments and adds unnecessary disk I/O latency.
**Action:** Prefer piping data via `stdin`/`stdout` between processes to avoid disk I/O and race conditions. If files are necessary, use unique temporary filenames or `mktemp`.
