// ==UserScript==
// @name         Youtube Music auto dismiss liked song notification
// @namespace    https://github.com/masterofcapacitors/
// @homepageURL  https://github.com/masterofcapacitors/ytmusic-auto-dismiss
// @version      0.2
// @description  Automatically dismiss the liked song notification after some seconds
// @author       tukars
// @icon         https://music.youtube.com/favicon.ico
// @match        https://music.youtube.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

const DISMISS_DELAY_LIKED = 1000;
const DISMISS_DELAY_LIBRARY = 1000;
const DISMISS_DELAY_PLAYLIST = 5000;
const DISMISS_DELAY_GENERAL = 5000;
const DESTROY_DELAY = 2000;
const DESTROY_DELAY_TEXT = 7000;

const ENABLE_DEBUG_LOGGING = true;

function timeStamp() {
    const now = new Date();
    const pad = (num, size) => String(num).padStart(size, "0");
    
    const hours = pad(now.getHours(), 2);
    const minutes = pad(now.getMinutes(), 2);
    const seconds = pad(now.getSeconds(), 2);
    const milliseconds = pad(now.getMilliseconds(), 3);

    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

function contextPrint(message) {
    const log = function(...args) {console.log(messageTime(), ...args)};
    const warn = function(...args) {console.warn(messageTime(), ...args)};
    const error = function(...args) {console.error(messageTime(), ...args)};
    const info = function(...args) {console.info(messageTime(), ...args)};
    
    var debug = function(...args) {console.debug(messageTime(), ...args)};
    if (!ENABLE_DEBUG_LOGGING) {
        debug = function() {};
    }
    
    return {log, warn, error, info, debug};
}

const {log, warn, error, info, debug} = contextPrint("YT Music auto dismiss");

function observeChildren(element, config, callback) {
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === "childList") {
                callback(Array.from(mutation.addedNodes));
            }
        }
    });
    if (!config) {config = { childList: true, subtree: false };}
    observer.observe(element, config);
    return observer;
}

function observeChildrenWithFilter(element, config, filter, callback) {
    return observeChildren(element, config, addedNodes => 
        callback(addedNodes.filter(filter)
    ));
}

function observeChildrenWithTags(element, config, filterTags, callback) {
    return observeChildrenWithFilter(element, config, node => 
        node.nodeType === Node.ELEMENT_NODE && 
        filterTags.includes(node.tagName.toLowerCase()),
        callback
    );
}

function observeAndHandle(element, tags, fun) {
    observeChildrenWithTags(element, null, tags, nodes => nodes.forEach(node => fun(node)))
}

function dismissNotification(notification) {
    const dismissButton = notification.querySelector("#button");
    
    if (!dismissButton) {
        warn("Dismiss button not found");
        return;
    }
    
    debug("Dismissing notification.");
    
    const activeElement = document.activeElement;
    debug("Element in focus", activeElement);
    dismissButton.click();

    if (activeElement && activeElement.focus) {
        debug("Restoring focus to element", activeElement);
        activeElement.focus();
    }
}

function destroyNotification(notification) {
    if (!notification.parentNode) {
        warn("Notification element already removed");
        return;
    }
    
    debug("Destroying notification element.");
    notification.parentNode.removeChild(notification);
}

function getDismissDelay(notification) {
    const textElement = notification.querySelector("#text");
    
    if (!textElement) {
        warn("Could not find text element.");
        return;
    }
    
    const textContent = textElement.textContent.toLowerCase()
    
    if (textContent === "saved to liked music") {
        debug("Saved to liked music notification");
        return DISMISS_DELAY_LIKED;
    } else if (textContent == "added to library") {
        debug("Added to library notification");
        return DISMISS_DELAY_LIBRARY;
    } else if (textContent == "removed from library") {
        debug("Removed from library notification");
        return DISMISS_DELAY_LIBRARY;
    } else if (textContent.startsWith("saved to")) {
        debug("Added to playlist notification");
        return DISMISS_DELAY_PLAYLIST;
    } else if (textContent === "this track is already in the playlist") {
        debug("Already in playlist notification");
        return DISMISS_DELAY_PLAYLIST;
    } else {
        debug(`Text content (not yet matched): "${textContent}"`);
        return DISMISS_DELAY_GENERAL;
    }
}

function handleActionNotification(notification) {
    debug("Action notification detected.");
    
    setTimeout(() => {
        dismissNotification(notification);
        setTimeout(() => destroyNotification(notification), DESTROY_DELAY, notification);
    }, getDismissDelay(notification));
}

function handleTextNotification(notification) {
    debug("Text notification detected.");
    
    setTimeout(() => destroyNotification(notification), DESTROY_DELAY_TEXT);
}



(function() {
    "use strict";
    
    debug("Auto dismiss is active.");
    
    const popupContainer = document.getElementsByTagName("ytmusic-popup-container").item(0);
    
    if (!popupContainer) {
        warn("Could not find popup container.");
        return;
    }
    
    const actionNotificationTags = ["ytmusic-notification-action-renderer"];
    observeAndHandle(popupContainer, actionNotificationTags, handleActionNotification);
    
    const textNotificationTags = ["ytmusic-notification-text-renderer"];
    observeAndHandle(popupContainer, textNotificationTags, handleTextNotification);
    
})();