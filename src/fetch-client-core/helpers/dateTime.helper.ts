const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
] as const;

export function formatDate(value?: string): string {
	const t = value ? new Date(value) : new Date();
	const date = String(t.getDate()).padStart(2, "0");
	const hh = String(t.getHours()).padStart(2, "0");
	const mm = String(t.getMinutes()).padStart(2, "0");
	const ss = String(t.getSeconds()).padStart(2, "0");
	return `${date}-${MONTHS[t.getMonth()]}-${t.getFullYear()} ${hh}:${mm}:${ss}`;
}

export function formatDateWithMs(value?: string): string {
	const t = value ? new Date(value) : new Date();
	const date = String(t.getDate()).padStart(2, "0");
	const hh = String(t.getHours()).padStart(2, "0");
	const mm = String(t.getMinutes()).padStart(2, "0");
	const ss = String(t.getSeconds()).padStart(2, "0");
	const ms = String(t.getMilliseconds()).padStart(4, "0");
	return `${date}-${MONTHS[t.getMonth()]}-${t.getFullYear()} ${hh}:${mm}:${ss}:${ms}`;
}

export function getDays(date1: string, date2: Date) {
	const _MS_PER_DAY = 1000 * 60 * 60 * 24;

	let dateFormat = new Date(date1);
	const utc1 = Date.UTC(
		dateFormat.getFullYear(),
		dateFormat.getMonth(),
		dateFormat.getDate(),
	);
	const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());

	const diffDays = Math.floor((utc2 - utc1) / _MS_PER_DAY);

	if (diffDays === 0) {
		return "Today";
	}
	if (diffDays === 1) {
		return "Yesterday";
	}
	if (diffDays > 365) {
		let year = Math.floor(diffDays / 365);
		return year + (year > 1 ? " years ago" : " year ago");
	}
	if (diffDays > 30) {
		let month = Math.floor(diffDays / 30);
		return month + (month > 1 ? " months ago" : " month ago");
	}
	if (diffDays > 7) {
		let week = Math.floor(diffDays / 7);
		return week + (week > 1 ? " weeks ago" : " week ago");
	}
	return diffDays + " days ago";
}

export function GetResponseTime(duration: number) {
	if (duration > 0) {
		var milliseconds = duration % 1000;
		var seconds = Math.floor((duration / 1000) % 60);
		var minutes = Math.floor((duration / (60 * 1000)) % 60);

		if (minutes > 0) {
			return minutes + ":" + seconds + "." + milliseconds + " mins";
		} else if (seconds > 0) {
			return seconds + "." + milliseconds + " secs";
		} else {
			return milliseconds + " ms";
		}
	}

	return "";
}
