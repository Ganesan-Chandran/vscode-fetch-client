import moment from 'moment-mini';
import { v4 as uuidv4 } from 'uuid';

export const SysVariables = [
  "{{#num}}",
  "{{#num, min, max}}",
  "{{#str}}",
  "{{#strspl}}",
  "{{#strnum}}",
  "{{#char}}",
  "{{#rdate}}",
  "{{#date}}",
  "{{#dateISO}}",
  "{{#date, 'format'}}",
  "{{#email}}",
  "{{#guid}}",
  "{{#bool}}"
];

export function checkSysVariable(variable: string): string {
  if ((variable.startsWith("{{#num,") || variable.startsWith("{{#date,")) && variable.endsWith("}}")) {
    return variable.replace("{{", "").replace("}}", "").replace("#", "").trim();
  }
  if (SysVariables.findIndex(t => t === variable) !== -1) {
    return variable.replace("{{", "").replace("}}", "").replace("#", "").trim();
  }

  return null;
}


export function getSysVariableWithValue(data: string) {
  try {
    switch (data) {
      case "num":
        return getRandomIntFromInterval(1, 999999);
      case "str":
        return getRandomString(getRandomIntFromInterval(1, 15), "str");
      case "strnum":
        return getRandomString(getRandomIntFromInterval(1, 15), "strnum");
      case "strspl":
        return getRandomString(getRandomIntFromInterval(1, 15), "strspl");
      case "char":
        return getRandomString(1, "str");
      case "date":
        return new Date().toDateString();
      case "rdate":
        return getRandomDate(new Date(1900, 1, 1), new Date(2100, 1, 1));
      case "dateISO":
        return new Date().toISOString();
      case "guid":
        return uuidv4();
      case "bool":
        return [true, false].at(getRandomIntFromInterval(0, 1));
      case "email":
        return getRandomEMail();
      default:
        if (data.startsWith("num,")) {
          let range = data.split(",");
          let min = parseInt(range[1]);
          let max = parseInt(range[2]);
          if (!isNaN(min) && !isNaN(max)) {
            return getRandomIntFromInterval(min, max);
          }
        } else if (data.startsWith("date,")) {
          let range = data.split(",");
          let format = range[1].trim();
          return moment().format(format);
        }
    }
  }
  catch {
    return null;
  }
}

function getRandomEMail() {
  let name = getRandomString(getRandomIntFromInterval(1, 15), "str");
  let domain = ["yahoo", "gmail", "hotmail", "outlook"].at(getRandomIntFromInterval(0, 3));
  return name + "@" + domain + ".com";
}


function getRandomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function getRandomString(len: number, type: string) {
  var text = "";
  var charset = type === "str" ? "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" : type === "strnum" ? "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890" : "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ~`!@#$%^&*()_+-={}[]:\"\'<>?,./|\\'";
  for (var i = 0; i < len; i++) {
    text += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  return text;
}

function getRandomIntFromInterval(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}