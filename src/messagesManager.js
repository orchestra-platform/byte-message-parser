'use strict';

const Message = require('./message.js');

/**
 * @class MessagesManager
 * @param {Message[]} messages
 */
class MessagesManager {

    constructor(messages) {
        this._messages = messages;
    }


    /**
     * @param {String} name Message name
     */
    getMessage(name) {
        for (const msg of this._messages)
            if (msg.name === name)
                return msg;
        throw new Error(`Message ${name} not found`);
    }


    /**
     * @param {String[]} name Array of message names
     */
    getMessages(names) {
        return names.forEach(name => this.getMessage(name));
    }


    /**
     * Recognize a message from an array of bytes
     * @param {Array} bytes 
     * @param {Message[]} messages 
     * @return {Boolean} Returns false if no message is found
     * @return {Object} Returns an Object {type,bytes,values} if a message is found
     */
    recognizeMessage(bytes) {
        // TODO: check messages

        for (const msg of this._messages) {

            const pattern = msg.getPattern(msg);
            if (pattern.length > bytes.length)
                continue;

            let recognized = true;
            for (let i = 0; i < pattern.length && recognized; i++) {
                // Undefined count as wildcard
                if (typeof pattern[i] === 'undefined')
                    continue;

                // Handle non static patterns
                if (typeof pattern[i] === 'function') {
                    // Remove the function
                    const callback = pattern.splice(i, 1)[0];

                    // Add the pattern
                    const precedent = bytes.slice(0, i);
                    const patternFragment = callback({ precedent });
                    pattern.splice(i, 0, ...patternFragment);

                    // Evaluate again this byte
                    i--;
                    continue;
                }

                let value = pattern[i];
                if (value != bytes[i])
                    recognized = false;
            }
            if (!recognized)
                continue;

            // Extract values from message
            const msgBytes = bytes.slice(0, pattern.length);
            const values = {};
            let index = 0;
            for (const fragment of msg.fragments) {
                const bytes = msgBytes.slice(index, index + fragment.pattern.length);
                index += fragment.pattern.length;
                values[fragment.name] = bytes;
            }

            return {
                type: msg.name,
                bytes: msgBytes,
                values: values
            }
        }
        return false;
    }

}

module.exports = MessagesManager;
