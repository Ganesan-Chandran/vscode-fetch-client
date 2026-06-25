export function getMethodClassName(method: string, disabled?: boolean) {
	if (disabled !== undefined && disabled !== null && disabled === false) {
		return "disabled-mtd";
	}

	switch (method) {
		case "GET":
			return "get-mtd";
		case "POST":
			return "post-mtd";
		case "PUT":
			return "put-mtd";
		case "PATCH":
			return "patch-mtd";
		case "DELETE":
			return "delete-mtd";
		default:
			return "other-mtd";
	}
}

export function getMethodName(method: string) {
	if (method === "OPTIONS") {
		return "OPT";
	}

	return method;
}
