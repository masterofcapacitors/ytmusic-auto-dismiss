// ==UserScript==
// @name         Youtube Music auto dismiss liked song notification
// @namespace    https://github.com/masterofcapacitors/
// @homepageURL  https://github.com/masterofcapacitors/ytmusic-auto-dismiss
// @version      0.1
// @description  Automatically dismiss the liked song notification after some seconds
// @author       tukars
// @icon         https://music.youtube.com/favicon.ico
// @match        https://music.youtube.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

const DISMISS_DELAY = 5000;
const DESTROY_DELAY = 2000;

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

function handleNotification(notification) {
    log("Notification detected.");
    
    setTimeout(() => {
        dismissNotification(notification);
        setTimeout(() => destroyNotification(notification), DESTROY_DELAY);
    }, DISMISS_DELAY);
}

(function() {
    "use strict";
    
    const popup_container = document.getElementsByTagName("ytmusic-popup-container").item(0);
    
    if (!popup_container) {
        warn("Could not find popup container.");
        return;
    }
    
    observeChildrenWithTags(popup_container, null, ["ytmusic-notification-action-renderer"], 
        notifications => notifications.forEach(notification => handleNotification(notification))
    )
})();