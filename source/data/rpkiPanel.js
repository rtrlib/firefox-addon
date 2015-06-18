var asn = document.getElementById("asn");
var ip = document.getElementById("ip");
var prefix = document.getElementById("prefix");
var validity = document.getElementById("validity");
var asname = document.getElementById("asname");

self.port.on("panelContentReady", function (info) {
    asn.textContent = info["asn"];
    ip.textContent = info["ip"];
    prefix.textContent = info["prefix"];
    asname.textContent = info["asname"];
    validity.textContent = info["validity"].state;
});
