var data = require("sdk/self").data;
var tabs = require('sdk/tabs');
var panels = require("sdk/panel");
var { ToggleButton } = require('sdk/ui/button/toggle');
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
    var cache_server_host = require("sdk/simple-prefs").prefs.cacheServerHost;
    var cache_server_port = require("sdk/simple-prefs").prefs.cacheServerPort;
    return (cache_server_host+":"+cache_server_port);
}

// timout in ms when a cached validity info expires.
function getCacheTimeToLive() {
    var cacheTTL = require("sdk/simple-prefs").prefs.cacheTTL;
    if (isNaN(cacheTTL)) {
        console.error("Cannot parse cache time to live to integer. Using default value: 90 seconds.");
        cacheTTL = 90;
    }
    return cacheTTL*1000;
}

function getValidationServer() {
    var onlineValidatorUrl = require("sdk/simple-prefs").prefs.validationServerURL;
    len = onlineValidatorUrl.length;
    if (onlineValidatorUrl.indexOf("/",len-1) == -1) {
      onlineValidatorUrl = onlineValidatorUrl+"/";
    }
    return onlineValidatorUrl;
}

/****************************************************************************
 * Settings
 ****************************************************************************/

// Create a panel which will show all the information
var rpkiPanel = panels.Panel({
  width: 400,
  height: 150,
  contentURL: data.url("rpkiPanel.html"),
  contentScriptFile: data.url("rpkiPanel.js"),
  onHide: handleHide
});

var rpkiButton = ToggleButton({
    label: "RPKI Validator",
    id: "rpki-validator-button",
    icon: data.url("notFound.png"),
    onChange: handleChange
});

function handleChange(state) {
  if (state.checked) {
    rpkiPanel.show({
      position: rpkiButton
    });
  }
}

function handleHide() {
  rpkiButton.state('window', {checked: false});
}

tabs.on('ready', updateData);
tabs.on('activate', updateData);

// The main function which updates the icon and the information in the panel
function updateData(tab) {
    var ip = getIP();
    var info = rpkiData[ip];
    var now = new Date();
    if(info == null || (now - info["timestamp"])>getCacheTimeToLive()) {
        rpkiData[ip] = null;
        clearData();
        getAsData(ip);
    } else {
        updateButtonIcon(info["validity"]);
        updatePanelContent(info);
    }
}

// Remove all the information from the panel and set the icon to the default state
function clearData() {
    updateButtonIcon(null);
    var info = new Object();
    info["ip"] = "N/A";
    info["prefix"] = "N/A";
    info["asname"] = "N/A";
    info["asn"] = "N/A";
    info["validity"] = "N/A";
    rpkiPanel.port.emit("panelContentReady", info);
}

/****************************************************************************
 * Step 1: Get the IP based on the URL entered in the address bar
 ****************************************************************************/

// Get host URL of active tab
function getHost() {
    var url = require("sdk/url").URL(tabs.activeTab.url);
    return url.host;
}

// Resolve the domain into the IP using Mozilla's DNS service
function getIP() {
    var host = getHost();
    if(host==null) {
        return;
    }
    var record = dns.resolve(host, true);
    var ipArray = new Array();
    while (record.hasMore()) {
        ipArray.push(record.getNextAddrAsString());
    }
    var ip = ipArray[0];
    return ip;
}

/****************************************************************************
 * Step 2: Get the AS Number, AS Name and BGP Prefix based on the IP
 ****************************************************************************/

// Retrieve the AS data from the Cymru service
function getAsData(ip) {
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
            parseAsData(response.text, ip);
        }
    }).post();
}

// Since the data is sent embedded into an HTML document (very messy),
// it has to be parsed and extracted by hand
function parseAsData(cymruResponse, ip) {
    doc = domParser.parseFromString(cymruResponse, "text/html");
    var node = doc.getElementsByTagName("pre")[0];
    if(node == null) return;
    var requestResult = node.childNodes[0].nodeValue;
    console.error("CymruResponse: "+requestResult);
    // Cutting unnecessary parts.
    var split1 = requestResult.split("AS Name");
    var split2 = split1[1].split("|");

    // The extracted data
    var info = new Object();
    info["brief"] = "true";
    info["cacheserver"] = getCacheServer();
    info["asn"] = split2[0].trim();
    info["asname"] = split2[3].trim();
    info["ip"] = split2[1].trim();
    info["prefix"] = split2[2].trim();
    getValidity(info, ip);
}

/****************************************************************************
 * Step 3: Get validity information from validation server
 ****************************************************************************/

function getValidity(info, ip) {
    var onlineValidatorUrl = getValidationServer()
    Request({
        url: onlineValidatorUrl+"AS"+info["asn"]+"/"+info["prefix"],
        content: {
            brief: info["brief"],
            cache_server: info["cacheserver"]
        },
        onComplete: function (response) {
            if(response.status != 200) {
                info["validity"] = "Validation Server Error" +
                    " (" + response.status + " " + response.statusText + ")";
            } else {
                var val_response = JSON.parse(response.text);
                info["validity"] = val_response.validated_route.validity;
            }
            console.error("getValidity: "+response.text)
            info["timestamp"] = new Date();
            rpkiData[ip] = info;
            updateButtonIcon(info["validity"]);
            updatePanelContent(info);
        }
    }).get();
}

function updateButtonIcon(validity) {
    // Valid
    if (validity != null) {
        if(validity.state.toLowerCase() === "valid") {
            rpkiButton.icon = data.url("valid.png");
            // Not found
        } else if(validity.state.toLowerCase() === "notfound") {
            rpkiButton.icon = data.url("notFound.png");
        // Invalid
        } else if(validity.state.toLowerCase().substring(0,7) === "invalid") {
            rpkiButton.icon = data.url("invalid.png");
        } else {
            rpkiButton.icon = data.url("notAvailable.png");
        }
    } else {
        rpkiButton.icon = data.url("notAvailable.png");
    }
}

function updatePanelContent(info) {
    rpkiPanel.port.emit("panelContentReady", info);
}
