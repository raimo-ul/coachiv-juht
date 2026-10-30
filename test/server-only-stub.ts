// Stands in for the `server-only` package when tests run under node.
//
// The real package throws on import, which is how Next keeps server modules out
// of a client bundle. There is no client bundle in a vitest run, so importing
// it would fail every test of a server module for a reason that does not apply.
// The guard that matters is the production build, and that still uses the real
// package.
export {};
