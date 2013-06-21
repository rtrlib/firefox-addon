var asn = document.getElementById("asn");
var ip = document.getElementById("ip");
var bgpPrefix = document.getElementById("bgpPrefix");
var validity = document.getElementById("validity");
var asName = document.getElementById("asName");

self.port.on("panelContentReady", function (info) {
    asn.textContent = info["asn"];
    ip.textContent = info["ip"];
    bgpPrefix.textContent = info["prefix"];
    asName.textContent = info["asName"];
    validity.textContent = info["validity"].message;
});
