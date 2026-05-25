# Avatar Upload RLS Fix TODO

- [x] Analyze upload-related files and confirm likely root cause.
- [x] Inspect Supabase client wiring and env usage.
- [x] Patch server upload client to require service role key (no anon fallback).
- [x] Improve upload API error messaging for missing/misconfigured service key.
- [x] Verify my-team page upload flow targets `/api/upload`.
- [x] Mark completion and summarize fixes.
