var data = require("sdk/self").data;
var tabs = require('sdk/tabs');
var { Cc, Ci } = require('chrome');
var Request = require("sdk/request").Request;
// Associative array for storing all the information belonging to each host
var rpkiData = new Object();

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

// Removed cached validation data when the cache server preference changes
function onCacheServerChange(prefName) {
    rpkiData = new Object();
}
require("sdk/simple-prefs").on("cacheServerHost", onCacheServerChange);
require("sdk/simple-prefs").on("cacheServerPort", onCacheServerChange);

function getCacheServer() {
    var host = require("sdk/simple-prefs").prefs.cacheServerHost;
    var port = require("sdk/simple-prefs").prefs.cacheServerPort;
    var cacheServer = host + ":" + port;
    return cacheServer;
}

// The maximum time in ms between creation time and when a cached validity
// info expires.
function getCacheTimeToLive() {
    var cacheTimeToLive = parseInt(require("sdk/simple-prefs").prefs.cacheTimeToLive);
    if (isNaN(cacheTimeToLive)) {
        console.error("Cannot parse cache time to live to integer. Using default value: 90 seconds.");
        cacheTimeToLive = 90;
    }
    return cacheTimeToLive*1000;
}

/****************************************************************************
 * Settings
 ****************************************************************************/
var onlineValidatorUrl = "http://rpki-validator.realmv6.org/validator/v1.1";
//var onlineValidatorUrl = "http://127.0.0.1:5000/validator/v1.1";
//var onlineValidatorUrl = "http://127.0.0.1:80/validator/v1.1";

// Create a panel which will show all the information
var rpkiPanel = require("sdk/panel").Panel({
  width: 400,
  height: 130,
  contentURL: data.url("rpkiPanel.html"),
  contentScriptFile: data.url("rpkiPanel.js"),
});
 
// Create a widget, and attach the panel to it, so the panel is
// shown when the user clicks the widget.
var rpkiWidget = require("sdk/widget").Widget({
  label: "RPKI Validator",
  id: "rpki-validator-widget",
  contentURL: data.url("notFound.png"),
  panel: rpkiPanel
});

tabs.on('ready', updateData);
tabs.on('activate', updateData);

// The main function which updates the icon and the information in the panel
function updateData(tab) {
    var host = getHost();
    var info = rpkiData[host];
    var now = new Date();
    if(info == null || (now - info["timestamp"])>getCacheTimeToLive()) {
        rpkiData[host] = null;
        clearData();
        getIp(host);
    } else {
        updateWidgetIcon(info["validity"]);
        updatePanelContent(info);
    }
}

// Remove all the information from the panel and set the icon to the default state
function clearData() {
    updateWidgetIcon("N/A");
    var info = new Object();
    info["ip"] = "N/A";
    info["prefix"] = "N/A";
    info["asName"] = "N/A";
    info["asn"] = "N/A";
    info["validity"] = "N/A";
    rpkiPanel.port.emit("panelContentReady", info);
}

/****************************************************************************
 * Step 1: Get the IP based on the URL entered in the address bar
 ****************************************************************************/

function getHost() {
    var url = require("sdk/url").URL(tabs.activeTab.url);
    return url.host;
}

// Resolve the domain into the IP using Mozilla's DNS service
function getIp(host) {
    if(host==null) {
        return;
    }
    var record = dns.resolve(host, true);
    var ipArray = new Array();
    while (record.hasMore())
    {
        ipArray.push(record.getNextAddrAsString());
    }
    var ip = ipArray[0];
    getAsData(ip, host);
}

/****************************************************************************
 * Step 2: Get the AS Number, AS Name and BGP Prefix based on the IP
 ****************************************************************************/

// Retrieve the AS data from the Cymru service
function getAsData(ip, host) {
    Request({
        url: "http://whois.cymru.com/cgi-bin/whois.cgi",
        content: {
            action: 'do_whois',
            bulk_paste: ip,
            //family:'ipv4',
            method_whois:'whois',
            flag_prefix: 'prefix',
            submit_paste:'Submit'},
        onComplete: function (response){
            parseAsData(response.text, host);
        }
    }).post();
}

// Since the data is sent embedded into an HTML document (very messy),
// it has to be parsed and extracted by hand
function parseAsData(cymruResponse, host) {
    doc = domParser.parseFromString(cymruResponse, "text/html");
    var node = doc.getElementsByTagName("pre")[0];
    if(node == null) return;
    var requestResult = node.childNodes[0].nodeValue;
    
    // Cutting unnecessary parts.
    var split1 = requestResult.split("AS Name");
    var split2 = split1[1].split("|");
    
    // The extracted data
    var info = new Object();
    info["cacheServer"] = getCacheServer();
    info["asn"] = split2[0].trim();
    info["asName"] = split2[3].trim();
    info["ip"] = split2[1].trim();
    info["prefix"] = split2[2].trim();
    getValidity(info, host);
}

/****************************************************************************
 * Step 3: Get validity information from the Freie Universität Berlin server
 *         and update the icon and the panel information
 ****************************************************************************/

function getValidity(info, host) {
/**
 * The following request causes an error for some reason (Error Console):
 * Error: NS_ERROR_XPC_BAD_CONVERT_JS: Could not convert JavaScript argument
 * 
 */
    Request({
        url: onlineValidatorUrl,
        content: {
            cache_server: info["cacheServer"],
            ip: info["ip"],
            prefix: info["prefix"],
            asn: info["asn"]
        },
        onComplete: function (response) {
            if(response.status != 200) {
                info["validity"] = "Validation Server Error" + 
                    " (" + response.status + " " + response.statusText + ")";
            } else {
                info["validity"] = JSON.parse(response.text);
            }
            info["timestamp"] = new Date();
            rpkiData[host] = info;
            updateWidgetIcon(info["validity"]);
            updatePanelContent(info);        
        }
    }).post();
}

function updateWidgetIcon(validity) {
    var tab = tabs.activeTab;
    var view = rpkiWidget.getView(tab.window);
    // Valid
    if(validity.code == "1") {
        view.contentURL = data.url("valid.png");
    // Invalid
    } else if(validity.code == "0") {
        view.contentURL = data.url("invalid.png");
    // Not found
    } else if(validity.code == "-1") {
        view.contentURL = data.url("notFound.png");
    } else {
        view.contentURL = data.url("notAvailable.png");
    }
}

function updatePanelContent(info) {
    rpkiPanel.port.emit("panelContentReady", info);
}