'use strict';

const Logger = require('@orchestra-platform/logger');

const byteArrayToString = (byteArray) => {
    const pad2 = x => x && x.length == 1 ? '0' + x : x;
    const bytes = Array.from(byteArray || [])
        .map(x => x !== undefined ? pad2(x.toString(16)) : '?');
    return `[${bytes.join(', ')}]`;
};


/**
 * @class Buffer
 * @param {Object} options
 * @param {Object} options.isMessageStart 
 * @param {Object} options.recognizeMessage Function that recognize a message from an array of bytes, it must return false or an Object with a property 'type'
 * @param {Number} [readMessageTimeout] The value of Buffer.readMessageTimeout
 * @property {Number} readMessageTimeout Time (in milliseconds) after which readMessage will throw an error if no data is received
 */
class Buffer {

    constructor(options = {}) {
        // Check isMessageStart
        if (!options.isMessageStart)
            throw new Error('Invalid isMessageStart funciton');
        // TODO: check if it's a funciton
        this._isMessageStart = options.isMessageStart;

        // Check recognizeMessage
        if (!options.recognizeMessage)
            throw new Error('Invalid recognizeMessage funciton');
        // TODO: check if it's a funciton
        this._recognizeMessage = options.recognizeMessage;

        // Init support variables
        this._byteBuffer = [];
        this._messageBuffer = [];
        this._messageBufferMaxLenght = 10;
        this._subscriptions = [];
        this._isReadingMessage = false;
        this.readMessageTimeout = options.readMessageTimeout || 60 * 1000;

        // Init logger
        this._log = new Logger(options.logLevel);
    }


    /**
     * Functions that receive chunks of data and recognize the messages
     * @param {Number[]} data 
     */
    handleData(data) {
        // Convert data to an array if needed
        if (false === Array.isArray(data))
            data = Array.from(data);

        if (!this._isReadingMessage) {
            while (data.length > 0) {
                const isStart = this._isMessageStart(data);
                if (isStart) {
                    this._isReadingMessage = true;
                    break;
                }
                // We don't know what this means, we just ignore the byte
                // Ideally this should never happen 😅
                const byteString = byteArrayToString([data[0]]);
                this._log.w(this._name, `*** Ignored ${byteString}`);
                data.shift();
            }
        }

        for (const byte of data) {
            this._byteBuffer.push(byte);

            const message = this._recognizeMessage(this._byteBuffer);
            if (message) {
                // Remove the message from the byteBuffer
                this._removeFromByteBuffer(message.bytes.length);

                // Add the message to the messageBuffer
                if (this._messageBuffer.length + 1 > this._messageBufferMaxLenght)
                    this._messageBuffer.shift();
                message.received = new Date();
                this._messageBuffer.push(message);

                // Notify subscriptions
                this._subscriptions.forEach((subscription, index, subscriptions) => {
                    if (subscription.all !== true && subscription.msg.name !== message.type)
                        return;
                    if (typeof subscription.callback === 'function')
                        subscription.callback(message);
                    if (subscription.once)
                        subscriptions.splice(index, 1); // Remove subscription
                });

                this._log.i(this._name, '_handleSerialPortData', 'New Message', message);
            }
        }
    }


    /**
     * Removes N bytes from the buffer
     * @param {Number} n Number of bytes to be removed. With n=-1 it emptys the buffer
     */
    _removeFromByteBuffer(n) {
        this._log.i(this._name, '_removeFromByteBuffer', n);
        if (n == -1)
            n = this._byteBuffer.length;
        for (let i = 0; i < n && this._byteBuffer.length > 0; i++)
            this._byteBuffer.shift();
    }


    /**
     * Subscribe to a message
     * @param {Object} options
     * @param {Message} options.msg Message
     * @param {Boolean} [options.once=true] 
     * @param {Boolean} [options.all=false] 
     * @param {Function} options.callback
     */
    subscribe(options) {
        const { msg, once = true, all = false, callback } = options;
        this._subscriptions.push({
            msg, once, all, callback
        });
    }


    /**
     * Read a message from the serialport
     * @param {String} msg Message
     * @returns {Message} message
     * @async
     */
    async readMessage(msg) {
        let resolve, reject;
        const promise = new Promise((_resolve, _reject) => {
            resolve = _resolve;
            reject = _reject;
        });

        const timeout = setTimeout(_ => {
            const msgBuffer = this._messageBuffer.map(m => m.type);
            const error = new Error(`Timeout, current buffers: ${JSON.stringify(this._byteBuffer)}, ${JSON.stringify(msgBuffer)}`);
            error.byteBuffer = this._byteBuffer;
            error.msgBuffer = this._messageBuffer.map(m => ({
                type: m.type,
                data: m.bytes
            }));
            reject(error);
        }, this.readMessageTimeout);

        const callback = msg => {
            clearTimeout(timeout);
            resolve(msg);
        }

        this.subscribe({ msg, once: true, callback });

        return promise;
    }
}

module.exports = Buffer;