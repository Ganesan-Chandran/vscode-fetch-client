const fs = require("fs");
const path = require("path");

function processDirectory(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (["node_modules", ".git"].includes(entry.name)) continue;

		const file = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			processDirectory(file);
			continue;
		}

		if (!entry.name.endsWith(".md")) continue;

		const original = fs.readFileSync(file, "utf8");

		const fixed = original
			.split(/\r?\n/)
			.map((line) => {
				const match = line.match(/^( +)(.*)$/);

				if (!match) return line;

				const spaces = match[1].length;
				const corrected = Math.ceil(spaces / 2) * 2;

				return " ".repeat(corrected) + match[2];
			})
			.join("\n");

		if (original !== fixed) {
			fs.writeFileSync(file, fixed);
			console.log(`Fixed: ${file}`);
		}
	}
}

processDirectory("docs");
