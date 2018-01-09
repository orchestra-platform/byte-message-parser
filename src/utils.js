'use strict';

/**
 * @module utils
 */
module.exports = {};


/**
 * @param {number} millis milliseconds
 */
module.exports.wait = millis => new Promise(resolve => setTimeout(resolve, millis));


/**
 * Converts a byte array to string
 * @param {Array} byteArray
 * @returns {String}
 */
module.exports.byteArrayToString = (byteArray) => {
    const pad2 = x => x && x.length == 1 ? '0' + x : x;
    const bytes = Array.from(byteArray || [])
        .map(x => x ? pad2(x.toString(16)) : '?');
    return `[${bytes.join(', ')}]`;
}
const byteArrayToString = module.exports.byteArrayToString;


/**
 * Prints a byte array as hex values
 * @param {Array} byteArray
 * @param {String} text
 */
module.exports.log = (byteArray, text) => {
    if (text) text += "\n\t";
    console.log(byteArrayToString(byteArray), text || '');
};


/**
 * Converts a number to a byte array
 * @param {Number} n Number to convert
 * @param {Number} length Length of the array
 */
module.exports.numberToByteArray = (n, length) => {
    const array = [];
    const string = '' + n;

    // Fill unused digits with zeros
    const padding = length - string.length
    for (let i = 0; i < padding; i++)
        array.push(0x30);

    // Fill the rest with the number
    for (let i = 0; i < length - padding; i++)
        array.push(string.charCodeAt(i));

    return array;
}


/**
 * Converts a byte array to a number
 * @param {Array} bytes 
 */
module.exports.byteArrayToNumber = (bytes) => {
    let string = "";
    try {
        for (let i = 0; i < bytes.length; i++)
            string += String.fromCharCode(bytes[i]);
        return parseInt(string, 16);
    } catch (err) {
        throw new Error(`Invalid Number (${byteArrayToString(bytes)})`);
    }
}
