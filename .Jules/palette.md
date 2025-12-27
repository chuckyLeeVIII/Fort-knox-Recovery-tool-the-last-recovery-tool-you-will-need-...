## 2024-05-22 - Button Loading State
**Learning:** Removing text from buttons during loading states (replacing with only a spinner) destroys context for screen reader users and removes certainty for sighted users.
**Action:** Always keep a descriptive label (e.g., "Processing...", "Saving...") alongside the loading indicator, and use `aria-busy="true"` to announce the state change.
