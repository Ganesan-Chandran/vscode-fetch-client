import * as vscode from 'vscode';
import loki, { LokiFsAdapter } from 'lokijs';
import { responseTypes } from '../configuration';
import { writeLog } from '../logger/logger';
import { ICookie } from '../../fetch-client-ui/components/Cookies/redux/types';
import { cookieDBPath } from './dbPaths';


function getDB(): loki {
  const idbAdapter = new LokiFsAdapter();
  const db = new loki(cookieDBPath(), { adapter: idbAdapter });
  return db;
}

export function SaveCookie(item: ICookie, webview: vscode.Webview) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      const userCookies = db.getCollection('userCookies');
      let cookieItem = userCookies.find({ id: item.id });
      if (cookieItem === null || cookieItem.length === 0) {
        userCookies.insert(item);
      } else {
        cookieItem[0].name = item.name;
        cookieItem[0].id = item.id;
        cookieItem[0].data = item.data;
      }

      db.saveDatabase();

      if (webview) {
        webview.postMessage({ type: responseTypes.saveCookieResponse });
      }
    });

  } catch (err) {
    writeLog("error::SaveCookie(): " + err);
  }
}

export function GetAllCookies(webview: vscode.Webview) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      const userCookies = db.getCollection('userCookies').data;
      webview.postMessage({ type: responseTypes.getAllCookiesResponse, cookies: userCookies });
    });

  } catch (err) {
    writeLog("error::GetAllCookies(): " + err);
  }
}

export function GetCookieById(id: string, webview: vscode.Webview) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      const userCookies = db.getCollection('userCookies').find({ 'id': id });
      db.saveDatabase();
      if (webview) {
        webview.postMessage({ type: responseTypes.getCookiesByIdResponse, data: userCookies });
      }
    });

  } catch (err) {
    writeLog("error::GetCookieById(): " + err);
  }
}

export function DeleteCookieById(id: string, webview: vscode.Webview) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      db.getCollection('userCookies').findAndRemove({ 'id': id });
      db.saveDatabase();
      if (webview) {
        webview.postMessage({ type: responseTypes.deleteCookieByIdResponse, id: id });
      }
    });

  } catch (err) {
    writeLog("error::DeleteCookieById(): " + err);
  }
}

export function DeleteAllCookies(webview: vscode.Webview) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      const userCookies = db.getCollection('userCookies');
      userCookies.removeDataOnly();
      db.saveDatabase();
      if (webview) {
        webview.postMessage({ type: responseTypes.deleteAllCookieResponse });
      }
    });

  } catch (err) {
    writeLog("error::DeleteAllCookies(): " + err);
  }
}
