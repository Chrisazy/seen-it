'use strict';

/**
 * Keys where we send our local storage values to
 */
var seenItKey = 'seen-it-ndpkdkckdhfanagkhmjicjhdlmfaacmb';
var enableSkipsKey = seenItKey + '-skips';

/**
 * Handler for messages passed to background.js
 * @param  {Object} msg           The message payload object passed
 * @param  {[type]} sender        Who the message is coming from
 * @param  {[type]} sendResponse) Chrome's sendResponse param
 */
chrome.extension.onMessage.addListener(function(msg, sender, sendResponse) {
  switch (msg.action) {
    case 'enableSkips':
      onEnableSkips();
      break;
    case 'disableSkips':
      onDisableSkips();
      break;
    case 'clearSkips':
      onClearSkips();
      break;
    case 'log':
      onLog(msg.log);
      break;
    default:
      console.warn('Unrecognized message: ' + msg.action);
  }
});

/**
 * Checks if the tab is on Imgur to decide whether to load the page action
 * @param  {String} tabId      chrome.tabs.onUpdate's tabId param
 * @param  {Object} changeInfo chrome.tabs.onUpdate's changeInfo param
 * @param  {Object} tab        chrome.tabs.onUpdate's tab param
 */
function checkForImgurUrl(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete') {
    if (tab.url.indexOf('http://imgur.com') === 0) {
      chrome.pageAction.show(tabId);
      processUrl(tab.url);
    } else {
      chrome.pageAction.hide(tabId);
    }
  }
}

/**
 * Handles logic for what to do with the current image URL
 * @param  {String} url The current URL of the Imgur page
 */
function processUrl(url) {
  // Don't process the URL if it isn't a gallery link
  // Gallery links are in the form '*/gallery/imageId'
  if (url.indexOf('gallery') === -1) {
    return;
  }

  // Get the image's ID from the URL
  var idStart = url.lastIndexOf('/') + 1;
  var imageId = url.substring(idStart);
  var images = getImageObj();

  // Save the image ID if it's not already in local storage
  if (!images[imageId]) {
    console.log('storing image: ' + imageId);
    images[imageId] = Date.now();
    localStorage.setItem(seenItKey, JSON.stringify(images));
  }
  // Otherwise skip the image if skipping is enabled
  else if (localStorage.getItem(enableSkipsKey)) {
    console.log('skipping image: ' + imageId);
    skipImage();
  }
}

/**
 * Passes a message to the content script to skip the image
 */
function skipImage() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'skip'}, function(response) {
      // put response from message here if needed
    });
  });
}

/**
 * Helper function to get the object of imageIds saved in local storage
 * @return {Object} Object with imageIds as fields and unix timstamps as values
 */
function getImageObj() {
  var imageString = localStorage.getItem(seenItKey);
  return imageString ? JSON.parse(imageString) : {};
}

/**
 * Enables skipping images
 */
function onEnableSkips() {
  console.log('enable skips');
  localStorage.setItem(enableSkipsKey, true);
}

/**
 * Disables skipping images
 */
function onDisableSkips() {
  console.log('disable skips');
  localStorage.setItem(enableSkipsKey, false);
}

/**
 * Clears all images currently stored in local storage
 */
function onClearSkips() {
  console.log('clear skips');
  localStorage.removeItem(seenItKey);
}

/**
 * Helper function to log out statements. Other files can pass background.js a
 * message with `type: log` and `log: thingToLog`
 * @param  {Any} log The content to log
 */
function onLog(log) {
  console.log(log);
}

function init() {
  var skipsEnabled = localStorage.getItem(enableSkipsKey);
  if (skipsEnabled === null) {
    localStorage.setItem(enableSkipsKey, true);
  }
}

chrome.tabs.onUpdated.addListener(checkForImgurUrl);
init();
