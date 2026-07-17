# Building Manager Project Instructions

## Required completion flow

1. Finish the scoped implementation.
2. Run the repository's complete automated validation:

   ```powershell
   npm --prefix prototype-web run check
   ```

3. Only after the automated validation passes may the work be handed to the
   user for manual QA.

## Manual QA environment

- Every human/manual QA session must use a GitHub-hosted online preview URL.
- Never ask a human tester to use `localhost`, a local dev server, `file://`,
  or a locally opened production build.
- Local execution is allowed only for automated tests, validators, builds, and
  developer diagnostics.
- A manual-QA handoff is blocked until the exact tested commit is deployed to
  the GitHub preview and the URL has been opened successfully.
- Record the preview URL and deployed commit in the QA report before starting
  a manual test round.

