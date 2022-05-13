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

export function FormatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
