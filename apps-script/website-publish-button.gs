/**
 * Drama Club website - Publish button
 *
 * Lives inside the "Drama Club Website Content" Sheet (Extensions > Apps Script).
 * The website shows the last published copy of this Sheet, so edits stay private
 * until someone clicks Website > Publish changes to the website. That stamps the
 * date and time onto the Publish tab; a job on GitHub checks that stamp every few
 * minutes and copies the tabs to the site.
 *
 * Run setUp() once after pasting this in, then reload the Sheet.
 */

var PUBLISH_TAB = 'Publish';
var STATUS_URL = 'https://drama-maas.github.io/data/sheet-cache/meta.json';
var STAMP_LABEL = 'Publish stamp';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Website')
    .addItem('Publish changes to the website', 'publishNow')
    .addItem('Check publishing status', 'checkStatus')
    .addToUi();
}

/** Creates and formats the Publish tab. Safe to run again. */
function setUp() {
  var sheet = publishTab();
  var ss = SpreadsheetApp.getActive();
  ss.toast('Publish tab ready. Reload the Sheet to get the Website menu.', 'Set up', 8);
  return sheet.getSheetId();
}

function publishTab() {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(PUBLISH_TAB);
  if (!sheet) sheet = ss.insertSheet(PUBLISH_TAB, ss.getNumSheets());

  sheet.getRange('A1').setValue('Publishing to the website');
  sheet.getRange('A1').setFontSize(13).setFontWeight('bold');
  sheet.getRange('A2').setValue(
    'Your edits stay off the website until you publish them. When everything is ready, ' +
    'choose Website > Publish changes to the website. The site updates within about five minutes.');
  sheet.getRange('A2').setWrap(true).setFontColor('#666666');
  if (!sheet.getRange('A2').isPartOfMerge()) sheet.getRange('A2:E2').merge();
  sheet.setRowHeight(2, 46);

  sheet.getRange('A4').setValue(STAMP_LABEL).setFontWeight('bold');
  sheet.getRange('A5').setValue('Asked for by').setFontWeight('bold');
  sheet.getRange('A6').setValue('What changed').setFontWeight('bold');
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 460);

  sheet.getRange('A8').setValue(
    'Do not edit cell B4 by hand, and do not delete or rename this tab. ' +
    'The website finds the stamp by the words in A4.');
  sheet.getRange('A8').setFontColor('#999999').setFontSize(10);
  if (!sheet.getRange('A8').isPartOfMerge()) sheet.getRange('A8:E8').merge();

  var existing = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  for (var i = 0; i < existing.length; i++) existing[i].remove();
  sheet.protect().setDescription('Publish tab').setWarningOnly(true);

  sheet.getRange('A4:A6').setBackground('#f3f3f3');
  return sheet;
}

/** Stamps the Publish tab, which is what asks the website to update. */
function publishNow() {
  var ui = SpreadsheetApp.getUi();
  var answer = ui.prompt(
    'Publish to the website',
    'Everything in the Calendar, Announcements and Cast tabs will go live within about five minutes. ' +
    'A short note about what changed (optional):',
    ui.ButtonSet.OK_CANCEL);
  if (answer.getSelectedButton() !== ui.Button.OK) return;

  var sheet = publishTab();
  var now = new Date();
  var stamp = Utilities.formatDate(now, SpreadsheetApp.getActive().getSpreadsheetTimeZone(),
    'yyyy-MM-dd HH:mm:ss');
  sheet.getRange('B4').setNumberFormat('@').setValue(stamp);
  sheet.getRange('B5').setValue(Session.getActiveUser().getEmail() || 'a drama club editor');
  sheet.getRange('B6').setValue(answer.getResponseText() || '');

  SpreadsheetApp.getActive().toast(
    'Asked the website to publish. It should be live in about five minutes. ' +
    'Use Website > Check publishing status to see when it lands.', 'Publishing', 10);
}

/** Compares the stamp here with what the live website has published. */
function checkStatus() {
  var ui = SpreadsheetApp.getUi();
  var asked = String(publishTab().getRange('B4').getDisplayValue() || '').trim();
  var live;
  try {
    var res = UrlFetchApp.fetch(STATUS_URL + '?t=' + Date.now(), { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) throw new Error('the website replied ' + res.getResponseCode());
    live = JSON.parse(res.getContentText());
  } catch (err) {
    ui.alert('Publishing status',
      'Could not reach the website just now (' + err.message + '). Try again in a few minutes.',
      ui.ButtonSet.OK);
    return;
  }

  var published = String(live.publishStamp || '').trim();
  var when = live.publishedAt ? new Date(live.publishedAt).toLocaleString() : 'unknown';
  var message;
  if (!asked) {
    message = 'Nobody has published from this Sheet yet. The website last updated: ' + when + '.';
  } else if (published === asked) {
    message = 'The website is up to date. Your publish of ' + asked + ' went live at ' + when + '.';
  } else {
    message = 'Still publishing. You asked at ' + asked + '. The website has not picked it up yet; ' +
      'it checks every five minutes. Try again shortly.';
  }
  ui.alert('Publishing status', message, ui.ButtonSet.OK);
}
