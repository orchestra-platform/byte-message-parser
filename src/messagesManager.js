'use strict';

const Message = require('./message.js');

/**
 * @class MessagesManager
 * @param {Message[]} messages
 */
class MessagesManager {

    constructor(messages) {
        /** @type {Message[]} */
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
     * @param {String[]} names Array of message names
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

        const generateDynamicPattern = (generatorFunction, currentProgress) =>
            generatorFunction({ precedent: bytes.slice(0, currentProgress) });

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
                    // Generate the pattern fragment using the function
                    const patternFragment = generateDynamicPattern(pattern[i], i);

                    // Add the pattern (while removing the functions )
                    pattern.splice(i, patternFragment.length, ...patternFragment);

                    // Evaluate again this byte
                    i--;
                    continue;
                }

                // "*" means multiple wildcards
                if ('*' === pattern[i]) {
                    if (i === pattern.length - 1)
                        throw new Error(`"*" cannot be used as the last pattern of a message! (${msg.name})`);

                    // Check if there is enough data to detect the end of the "*" pattern
                    // Otherwise the message can't be recognized
                    if (i === bytes.length - 1) {
                        recognized = false;
                        break;
                    }

                    // Find/generate the next byte pattern
                    let nextBytePattern = (typeof pattern[i + 1] === 'function')
                        ? generateDynamicPattern(pattern[i + 1], i + 1)[0]
                        : pattern[i + 1];
                    if (undefined === nextBytePattern)
                        throw new Error(`Invalid message definition for ${msg.name}, the next pattern after "*" must be static`);
                    if (bytes[i + 1] === nextBytePattern) {
                        // If the next value is the detected (hence this is the last byte for "*")
                        // Replace the "*" with a wildcard (undefined)
                        pattern[i] = undefined;
                    } else {
                        // Count this byte as good by adding a wildcard at the current position
                        pattern.splice(i, 0, undefined);
                    }
                    // Always evaluate again this byte
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
            const staticPatternSize = msg.fragments
                .filter(f => Array.isArray(f.pattern))
                .reduce((tot, f) => tot + f.pattern.length, 0);
            for (const fragment of msg.fragments) {
                const fragmentLength = fragment.pattern === '*'
                    ? pattern.length - staticPatternSize
                    : fragment.pattern.length;
                const bytes = msgBytes.slice(index, index + fragmentLength);
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
