// low-level API to access powerful functions
var { Cc, Ci } = require('chrome');

/**
 * DNS Service for resolving the domain into an IP
 * http://stackoverflow.com/questions/1082728/ip-address-lookup-in-a-firefox-extension
 */
var dns = Cc['@mozilla.org/network/dns-service;1'].getService(Ci.nsIDNSService);

/**
 * DOM Parser for parsing the result go from Cymru
 * http://stackoverflow.com/questions/9171590/how-to-parse-a-xml-string-in-a-firefox-addon-using-add-on-sdk
 */
var domParser = Cc["@mozilla.org/xmlextras/domparser;1"].createInstance(Ci.nsIDOMParser);

// resolve hostname to IP address, using mozilla DSN service calls
exports.resolveHostname = function(host) {
    if (host == null) return;
    var record = dns.resolve(host, true);
    var ipArray = new Array();
    while (record.hasMore()) {
        ipArray.push(record.getNextAddrAsString());
    }
    return ipArray[0];
};

// parse HTML response and extract string with desired data values
exports.parseResponse = function(data) {
    doc = domParser.parseFromString(data, "text/html");
    var node = doc.getElementsByTagName("pre")[0];
    if(node == null) return null;
    return node.childNodes[0].nodeValue;
}
