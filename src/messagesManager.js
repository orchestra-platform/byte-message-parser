'use strict';

module.exports = class MessagesManager {
    constructor(messages) {
        if (!messages)
            throw new Error('Invalid messages');
        this._messages = messages;
    }


    /**
     * Return the requested message
     * @param {string} msg Message code 
     */
    get(msg) {
        if (!this._messages[msg])
            throw new Error('Invalid message');
        return this._messages[msg];
    }


    /**
     * Return pattern of the requested message
     * @param {string} msg Message code 
     */
    getPattern(msg) {
        return this.get(msg)
            .reduce((pattern, val) => pattern.concat(val.pattern), []);
    }

    /**
     * Recognize a message from an array of bytes
     * @param {Array} bytes 
     * @return {Boolean} Returns false if no message is found
     * @return {Object} Returns an Object {type,bytes,values} if a message is found
     */
    recognizeMessage(bytes) {
        for (const msgName in this._messages) {
            const msg = this._messages[msgName];
            const pattern = this.getPattern(msgName);
            if (pattern.length > bytes.length)
                continue;

            let recognized = true;
            for (let i = 0; i < pattern.length && recognized; i++) {
                // Undefined count as wildcard
                if (typeof pattern[i] === 'undefined')
                    continue;

                // Handle non static patterns
                let value = pattern[i];
                if (typeof pattern[i] === 'function')
                    value = pattern[i]({
                        precedent: bytes.slice(0, i)
                    });

                if (value != bytes[i])
                    recognized = false;
            }
            if (!recognized)
                continue;

            // Extract values from message
            const msgBytes = bytes.slice(0, pattern.length);
            const values = {};
            let index = 0;
            for (const fragment of msg) {
                const bytes = msgBytes.slice(index, index + fragment.pattern.length);
                index += fragment.pattern.length;
                values[fragment.name] = bytes;
            }

            return {
                type: msgName,
                bytes: msgBytes,
                values: values
            }
        }
        return false;
    }


    /**
     * Generate a message
     * @param {String} message
     * @param {Object} data
     * @returns {Array} Byte array
     */
    generateMessage(message, data = {}) {
        const msg = this.get(message);
        const packet = [];
        for (const fragment of msg) {
            if (data[fragment.name] != undefined) {
                // Set custom value
                packet.push(...data[fragment.name]);
            } else if (fragment.default != undefined) {
                // Set default value
                if (Array.isArray(fragment.default)) {
                    packet.push(...fragment.default);
                } else if (typeof fragment.default === 'function') {
                    const defaultBytes = fragment.default({ precedent: packet });
                    packet.push(...defaultBytes);
                } else
                    throw new Error(`Invalid default value for ${fragment.name}`);
            } else {
                throw new Error(`Missing parameter ${fragment.name}`);
            }
        }
        return packet;
    }

}
