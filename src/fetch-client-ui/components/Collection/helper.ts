export function HandleColSelectionValidation(selectedCollection: string, colName: string, selectedFolder: string, folderName: string, errors: any, setErrors: any) {
	if (selectedCollection === "") {
		setErrors({ ...errors, "colSelect": "Please select/create the collection" });
		return false;
	}

	if (selectedCollection === "0") {
		if (!colName) {
			setErrors({ ...errors, "colName": "Cannot be empty" });
			return false;
		}
		if (colName.toUpperCase().trim() === "DEFAULT") {
			setErrors({ ...errors, "colName": "Collection name should not be 'Default'" });
			return false;
		}
	}

	if (selectedFolder === "0") {
		if (!folderName) {
			setErrors({ ...errors, "folderName": "Cannot be empty" });
			return false;
		}
	}

	return true;
}
