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

const DISMISS_DELAY_LIKED = 3000;
const DISMISS_DELAY_LIBRARY = 3000;
const DISMISS_DELAY_PLAYLIST = 5000;
const DISMISS_DELAY_GENERAL = 5000;
const DESTROY_DELAY = 2000;
const DESTROY_DELAY_TEXT = 7000;

const ENABLE_DEBUG_LOGGING = false;

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
    if (!ENABLE_DEBUG_LOGGING) {
        return {
            log: function(...args) {},
            warn: function(...args) {},
            error: function(...args) {},
            info: function(...args) {},
            debug: function(...args) {}
        }
    }
    
    const messageTime = () => `[${message}] ${timeStamp()} -`
    
    return {
        log: function(...args) {console.log(messageTime(), ...args)},
        warn: function(...args) {console.warn(messageTime(), ...args)},
        error: function(...args) {console.error(messageTime(), ...args)},
        info: function(...args) {console.info(messageTime(), ...args)},
        debug: function(...args) {console.debug(messageTime(), ...args)}
    }
}

const {log, warn, error} = contextPrint("YT Music auto dismiss");

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
    
    log("Dismissing notification.");
    dismissButton.click();
}

function destroyNotification(notification) {
    if (!notification.parentNode) {
        warn("Notification element already removed");
        return;
    }
    
    log("Destroying notification element.");
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
        log("Saved to liked music notification");
        return DISMISS_DELAY_LIKED;
    } else if (textContent == "added to library") {
        log("Added to library notification");
        return DISMISS_DELAY_LIBRARY;
    }  else if (textContent == "removed from library") {
        log("Removed from library notification");
        return DISMISS_DELAY_LIBRARY;
    } else if (textContent.startsWith("saved to")) {
        log("Added to playlist notification");
        return DISMISS_DELAY_PLAYLIST;
    } else if (textContent === "this track is already in the playlist") {
        log("Already in playlist notification");
        return DISMISS_DELAY_PLAYLIST;
    } else {
        log(`Text content (not yet matched): "${textContent}"`);
        return DISMISS_DELAY_GENERAL;
    }
}

function handleActionNotification(notification) {
    log("Action notification detected.");
    
    setTimeout(() => {
        dismissNotification(notification);
        setTimeout(() => destroyNotification(notification), DESTROY_DELAY);
    }, getDismissDelay(notification));
}

function handleTextNotification(notification) {
    log("Text notification detected.");
    
    setTimeout(() => destroyNotification(notification), DESTROY_DELAY_TEXT);
}



(function() {
    "use strict";
    
    log("Auto dismiss is active.");
    
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