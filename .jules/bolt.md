## 2024-12-25 - [Python Nested Loop Optimization]
**Learning:** Python's nested loops can hide expensive operations like PBKDF2. Hoisting them out of inner loops is a massive win, especially when the inner loop iterates over items that don't affect the expensive calculation.
**Action:** Always check loop bodies for loop-invariant calculations, especially cryptography operations.
