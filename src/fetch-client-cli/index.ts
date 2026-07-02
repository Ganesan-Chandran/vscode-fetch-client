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
import { writeConsoleLog, wrtieConsleError } from './utils/logger';
import { isSupportedExportFormat, SUPPORTED_EXPORT_FORMATS, ExportFormat } from './types/export.types';


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

── LIST ──────────────────────────────────────────────────────

fc list --col --id <uuid>                  Filter collections by id

fc list --fol --name <name>                Find folder by name
fc list --fol --id <uuid>                  Find folder by id

fc list --var                              List all variable sets
fc list --var --name <name>                Filter variable sets by name
fc list --var --id <uuid>                  Filter variable sets by id

── RUN ─────────────────────────────────────────────────────────────

fc run --req --name <name>                      Run a request by name
fc run --req --id <uuid>                        Run a request by id
fc run --req --name <name> --var-id <uuid>      Override variable set (by id)
fc run --req --name <name> --var-name <name>    Override variable set (by name)

fc run --col --all                              Run every request in every collection
fc run --col --name <name>                      Run all requests in a collection by name
fc run --col --id <uuid>                        Run all requests in a collection by id
fc run --col --name <name> --var-id <uuid>      Run collection with a specific variable set (by id)
fc run --col --name <name> --var-name <name>    Run collection with a specific variable set (by name)
fc run --col --name <name> --var-id <uuid>      Override variable set (by id)
fc run --col --name <name> --var-name <name>    Override variable set (by name)
                                                Note: if the collection is already linked to a variable set,
                                                the linked variable takes priority and --var-id/--var-name
                                                is ignored (an info message is printed).

fc run --fol --name <name>                      Run all requests in a folder by name
fc run --fol --id <uuid>                        Run all requests in a folder by id
fc run --fol --name <name> --var-id <uuid>      Override variable set (by id)
fc run --fol --name <name> --var-name <name>    Override variable set (by name)
                                                Note: same priority rule applies - linked variable wins.

fc run --curl '<curl ...>'                      Execute a raw curl command

── EXPORT ────────────────────────────────────────────────────────

fc run --req --name <name> --export <format> --var-id <uuid>        Export a detailed report after running
fc run --col --id <uuid> --export <format> --var-name <name>        Supported formats: csv, html, json, xml, nunit
fc run --col --name <name> --export <format>
fc run --fol --id <uuid> --export <format>            
fc run --fol --name <name> --export <format>
fc run --col --all --export json --export-path <dir>                Export to a custom directory
                                                                    Notes:
                                                                    --export is only supported with --req, --col, and --fol.
                                                                    --export-path must be a directory. If omitted, reports are
                                                                      written to a "fetch-client-exports" folder alongside the
                                                                      Fetch Client database.

── CHECK ───────────────────────────────────────────────────────────

fc check                                   Check if all DB files exist

── OPTIONS ─────────────────────────────────────────────────────────

--help, -h                                    Show this help message
--version, -v                                 Show CLI version

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
  varId?: string;
  varName?: string;
  export?: string;
  exportPath?: string;
}

const VALUE_FLAGS = new Set([
  '--name', '--id', '--curl', '--var-id', '--var-name', '--export', '--export-path',
]);

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

    // --name=value / --id=value / --curl=value / --var-id=value /
    // --var-name=value / --export=value / --export-path=value
    const eqMatch = /^--(name|id|curl|var-id|var-name|export|export-path)=(.+)$/.exec(arg);
    if (eqMatch) {
      const key = eqMatch[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase()) as keyof ParsedArgs;
      (result as any)[key] = eqMatch[2];
      continue;
    }

    if (VALUE_FLAGS.has(arg)) {
      const next = argv[i + 1];

      // Missing value entirely, or the "value" is actually another flag.
      if (next === undefined || next.startsWith('--')) {
        wrtieConsleError(`Missing value for '${arg}'.`);
        process.exit(1);
      }

      const key = arg
        .replace(/^--/, '')
        .replace(/-([a-z])/g, (_, c) => c.toUpperCase()) as keyof ParsedArgs;
      (result as any)[key] = next;
      i++;
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

  if (argv.version) {
    writeConsoleLog(`fc v${VERSION}`);
    return;
  }

  if (argv.help || argv._.length === 0) {
    writeConsoleLog(HELP);
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
      wrtieConsleError(`Unknown command: '${command}'. Run 'fc --help' for usage.`);
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
      wrtieConsleError("'fc list --fol' requires --name or --id.");
      process.exit(1);
    }

    await listFolders({ name, id });
    return;
  }

  if (argv.var) {
    await listVariables({ name, id });
    return;
  }

  wrtieConsleError("Specify --col, --fol, or --var after 'list'. Run 'fc --help' for usage.");
  process.exit(1);
}

// - run -

async function handleRun(argv: ParsedArgs): Promise<void> {
  const { name, id, curl, export: exportFormatRaw, exportPath } = argv;

  if (exportFormatRaw && !isSupportedExportFormat(exportFormatRaw)) {
    wrtieConsleError(
      `Invalid --export format '${exportFormatRaw}'. Supported formats: ${SUPPORTED_EXPORT_FORMATS.join(', ')}.`
    );
    process.exit(1);
  }

  const exportFormat = exportFormatRaw as ExportFormat | undefined;

  if (curl) {
    if (exportFormat) {
      writeConsoleLog("Note: --export is not supported with --curl and will be ignored.");
    }
    await runCurl(curl);
    return;
  }

  if (argv.req) {
    if (!name && !id) {
      wrtieConsleError("'fc run --req' requires --name or --id.");
      process.exit(1);
    }

    await runRequest({ name, id, varId: argv.varId, varName: argv.varName, exportFormat, exportPath });
    return;
  }

  if (argv.col) {
    await runCollection({
      all: argv.all,
      name,
      id,
      varId: argv.varId,
      varName: argv.varName,
      exportFormat,
      exportPath,
    });
    return;
  }

  if (argv.fol) {
    if (!name && !id) {
      wrtieConsleError("'fc run --fol' requires --name or --id.");
      process.exit(1);
    }

    await runFolder({ name, id, varId: argv.varId, varName: argv.varName, exportFormat, exportPath });
    return;
  }

  wrtieConsleError(
    "Specify --req, --col, --fol, or --curl after 'run'. Run 'fc --help' for usage."
  );

  process.exit(1);
}

// - Entry -

main().catch((err: Error) => {
  console.error('Fatal error:', err?.message ?? err);
  process.exit(1);
});
