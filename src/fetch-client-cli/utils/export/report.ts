import { buildExportReport, renderReport, slugify, timestampForFilename } from "../../../fetch-client-core/helpers/exporters/reports/reportBuilder";
import { cliConfig } from "../../config";
import { ExportContext } from "../../../fetch-client-core/types/export.types";
import { ExportFormat, EXTENSION_BY_FORMAT } from "../../../fetch-client-core/consts/export.consts";
import { RunResult } from "../../../fetch-client-core/types/cli.types";
import { wrtieConsleError } from "../logger";
import * as fs from "fs/promises";
import * as path from "path";

const EXPORT_DIR_NAME = "fetch-client-exports";

/**
 * Resolves the directory reports are written to.
 * - Explicit `customPath` always wins.
 * - Otherwise, uses a "fetch-client-exports" folder alongside the DB storage directory.
 *
 * resolveDbPath() always returns a directory (custom path, workspace path, or the
 * default VS Code global-storage path are all directories) - never a file path.
 */
export async function resolveExportDirectory(customPath?: string): Promise<string> {
	if (customPath) {
		return path.resolve(customPath);
	}

	return path.join(cliConfig.dbPath, EXPORT_DIR_NAME);
}

export async function writeExportReport(
	results: RunResult[],
	format: ExportFormat,
	context: ExportContext,
	customExportPath?: string,
): Promise<string> {
	try {
		const report = buildExportReport(results, context);
		const content = renderReport(report, format);
		const directory = await resolveExportDirectory(customExportPath);
		await fs.mkdir(directory, { recursive: true });

		const fileName = `${context.scope}-${slugify(context.name)}-${format}-${timestampForFilename()}.${EXTENSION_BY_FORMAT[format]}`;
		const filePath = path.join(directory, fileName);

		await fs.writeFile(filePath, content, "utf-8");

		return filePath;
	}
	catch (err) {
		wrtieConsleError(err);
		process.exit(1);
	}
}

export async function writeReportFile(
	content: string,
	extension: string,
	fileNameParts: { scope: string; name: string; format: string },
	customExportPath?: string,
): Promise<string> {
	const directory = await resolveExportDirectory(customExportPath);
	await fs.mkdir(directory, { recursive: true });

	const fileName =
		`${fileNameParts.scope}-${slugify(fileNameParts.name)}-${fileNameParts.format}-${timestampForFilename()}.${extension}`;
	const filePath = path.join(directory, fileName);

	await fs.writeFile(filePath, content, "utf-8");
	return filePath;
}
