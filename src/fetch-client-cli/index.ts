import { resolveDbPath, resolveEncryptionEnabled, resolveEncryptionKey } from './config';
import { setGlobalStorageUri } from '../fetch-client-core/db/dbHelper';
import { setVariableEncryptionConfiguration, setVariableEncryptionKey } from '../fetch-client-core/utils/vscodeConfig';

// - 1. Bootstrap DB path before any repository code opens a database -
setGlobalStorageUri(resolveDbPath());
setVariableEncryptionConfiguration(resolveEncryptionEnabled());
setVariableEncryptionKey(resolveEncryptionKey());

// - 2. Lazy-import command handlers (DB repos are only called inside them) -
import { listCollections, listFolders, listVariables } from './commands/list';
import { runCollection, runFolder, runRequest, runCurl } from './commands/run';
import { checkDbFiles } from './commands/check';
import { writeConsoleLog } from './utils/logger';

// - Version / package info -

// eslint-disable-next-line @typescript-eslint/no-var-requires
const VERSION: string = require('./package.json').version;

// - Help text -

const HELP = `
Fetch Client CLI v${VERSION}

Usage:  fc <command> [options]

Commands:
  list      List collections, folders, or variables
  run       Execute requests, collections, folders, or a raw curl string
  check     Verify that all Fetch Client DB files are available

── LIST ───────────────────────────────────────────────────────────────

fc list --col                           List all collections
fc list --col --name <name>             Filter collections by name
fc list --col --id   <uuid>             Filter collections by id

fc list --fol --name <name>             Find folder by name
fc list --fol --id   <uuid>             Find folder by id

fc list --var                           List all variable sets
fc list --var --name <name>             Filter variable sets by name
fc list --var --id   <uuid>             Filter variable sets by id

── RUN ────────────────────────────────────────────────────────────────

fc run --req --name <name>              Run a request by name
fc run --req --id   <uuid>              Run a request by id

fc run --col --all                      Run every request in every collection
fc run --col --name <name>              Run all requests in a collection by name
fc run --col --id   <uuid>              Run all requests in a collection by id

fc run --fol --name <name>              Run all requests in a folder by name
fc run --fol --id   <uuid>              Run all requests in a folder by id

fc run --curl '<curl ...>'              Execute a raw curl command

── OPTIONS ────────────────────────────────────────────────────────────

--help, -h                              Show this help message
--version, -v                           Show CLI version

── CONFIGURATION ──────────────────────────────────────────────────────

By default the CLI locates the Fetch Client database at the standard
VS Code global-storage path for this extension.
`;

// - Minimal argument parser -

interface ParsedArgs {
  /** Positional arguments (e.g. ['list'] or ['run']) */
  _: string[];
  col: boolean;
  fol: boolean;
  var: boolean;
  req: boolean;
  all: boolean;
  help: boolean;
  version: boolean;
  name?: string;
  id?: string;
  curl?: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    _: [],
    col: false,
    fol: false,
    var: false,
    req: false,
    all: false,
    help: false,
    version: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
      continue;
    }

    if (arg === '--version' || arg === '-v') {
      result.version = true;
      continue;
    }

    if (arg === '--col') {
      result.col = true;
      continue;
    }

    if (arg === '--fol') {
      result.fol = true;
      continue;
    }

    if (arg === '--var') {
      result.var = true;
      continue;
    }

    if (arg === '--req') {
      result.req = true;
      continue;
    }

    if (arg === '--all') {
      result.all = true;
      continue;
    }

    if (arg === '--name' && i + 1 < argv.length) {
      result.name = argv[++i];
      continue;
    }

    if (arg === '--id' && i + 1 < argv.length) {
      result.id = argv[++i];
      continue;
    }

    if (arg === '--curl' && i + 1 < argv.length) {
      result.curl = argv[++i];
      continue;
    }

    // Handle --name=value / --id=value / --curl=value forms
    const eqMatch = /^--(name|id|curl)=(.+)$/.exec(arg);
    if (eqMatch) {
      (result as any)[eqMatch[1]] = eqMatch[2];
      continue;
    }

    if (!arg.startsWith('--')) {
      result._.push(arg);
    }
  }

  return result;
}

// - Main -

async function main(): Promise<void> {
  const argv = parseArgs(process.argv.slice(2));

  if (argv.help || argv._.length === 0) {
    writeConsoleLog(HELP);
    return;
  }

  if (argv.version) {
    writeConsoleLog(`fc v${VERSION}`);
    return;
  }

  const command = (argv._[0] ?? '').toLowerCase();

  switch (command) {
    case 'list':
      await handleList(argv);
      break;

    case 'run':
      await handleRun(argv);
      break;

    case 'check':
      checkDbFiles();
      break;

    default:
      console.error(`Unknown command: '${command}'. Run 'fc --help' for usage.`);
      process.exit(1);
  }
}

// - list -

async function handleList(argv: ParsedArgs): Promise<void> {
  const { name, id } = argv;

  if (argv.col) {
    await listCollections({ name, id });
    return;
  }

  if (argv.fol) {
    if (!name && !id) {
      console.error("'fc list --fol' requires --name or --id.");
      process.exit(1);
    }

    await listFolders({ name, id });
    return;
  }

  if (argv.var) {
    await listVariables({ name, id });
    return;
  }

  console.error("Specify --col, --fol, or --var after 'list'. Run 'fc --help' for usage.");
  process.exit(1);
}

// - run -

async function handleRun(argv: ParsedArgs): Promise<void> {
  const { name, id, curl } = argv;

  if (curl) {
    await runCurl(curl);
    return;
  }

  if (argv.req) {
    if (!name && !id) {
      console.error("'fc run --req' requires --name or --id.");
      process.exit(1);
    }

    await runRequest({ name, id });
    return;
  }

  if (argv.col) {
    await runCollection({
      all: argv.all,
      name,
      id,
    });
    return;
  }

  if (argv.fol) {
    if (!name && !id) {
      console.error("'fc run --fol' requires --name or --id.");
      process.exit(1);
    }

    await runFolder({ name, id });
    return;
  }

  console.error("Specify --req, --col, --fol, or --curl after 'run'. Run 'fc --help' for usage.");
  process.exit(1);
}

// - Entry -

main().catch((err: Error) => {
  console.error('Fatal error:', err?.message ?? err);
  process.exit(1);
});
