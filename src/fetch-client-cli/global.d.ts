/**
 * Minimal Node.js global declarations for the CLI.
 * These are provided at runtime by Node.js; the full @types/node package
 * will supply richer types once `npm install` has been run.
 */
declare const process: {
  argv: string[];
  env: { [key: string]: string | undefined };
  exit(code?: number): never;
  platform: string;
};
