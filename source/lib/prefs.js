/**
 * The preferences for the extension.
 * Copy and paste them into the "Properties-> Extra package.json Properties" field.
 * They are stored here only for easier editing, because after copying them
 * into the "Extra package.json Properties", they lose the formatting.

{"preferences": [
    {
        "type": "string",
        "name": "cacheServerHost",
        "value": "rpki-validator.realmv6.org",
        "title": "Cache Server Host"
    },
    {
        "type": "string",
        "name": "cacheServerPort",
        "value": "8282",
        "title": "Cache Server Port"
    },
    {
        "type": "string",
        "name": "cacheTimeToLive",
        "value": "90",
        "title": "Cache Time To Live (Seconds)"
    }
]}

Old:

{"preferences": [{
    "name": "cacheServer",
    "type": "menulist",
    "title": "Cache Server",
    "value": 1,
    "options": [
        {
            "value": "0",
            "label": "rpki.realmv6.org:42420"
        },
        {
            "value": "1",
            "label": "rpki-validator.realmv6.org:8282"
        }
    ]
}]}
*/