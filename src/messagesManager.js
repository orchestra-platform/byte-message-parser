'use strict';

module.exports = class MessagesManager {

    /**
     * Return pattern of the requested message
     * @param {Message} msg - 
     */
    static getPattern(msg) {
        MessagesManager.checkMessage(msg);
        const pattern = msg.reduce((pattern, val) => {
            return pattern.concat(val.pattern)
        }, []);
        // for (let i = 0; i < pattern.length; i++) {
        //     if (typeof pattern[i] !== 'function')
        //         continue;
        //     // Remove the function
        //     const callback = pattern.splice(i, 1)[0];
        //     // Add the pattern
        //     const patternFragment = callback({
        //         message: pattern.splice(0, 1)
        //     });
        //     pattern.splice(i, 0, ...patternFragment);
        // }
        return pattern;
    }

    /**
     * Recognize a message from an array of bytes
     * @param {Array} bytes 
     * @return {Boolean} Returns false if no message is found
     * @return {Object} Returns an Object {type,bytes,values} if a message is found
     */
    static recognizeMessage(bytes, messages) {
        // TODO: check messages

        for (const msgName in messages) {

            const msg = messages[msgName];
            const pattern = this.getPattern(msg);
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
     * @param {Message} msg - 
     * @param {Object} data -
     * @returns {Array} Byte array
     */
    static generateMessage(msg, data = {}) {
        MessagesManager.checkMessage(msg);
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


    /**
     * 
     * @param {Message} msg 
     */
    static checkMessage(msg) {
        return true;
    }
}
