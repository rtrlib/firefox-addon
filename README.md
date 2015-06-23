# RPKI Validator - Firefox Addon

## build

First, download and install the Firefox Addon SDK as described
[here](https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Installation).
Then run ```<path/to/sdk>/bin/cfx xpi``` in ```<path/to/rpki-addon>/source```,
this will create the ```rpki-validator.xpi``` - see install.

## install

Open Firefox and goto the main menu and open Add-ons control panel, or open a
tab with URL ```about:addons```. Click on the *tools* button an select *install
addon from file* for manual addon installation, browse to and open  
```rpki-validator.xpi```. Done!

## configure

The following parameters can be configured within the addon, default values are
set in preference section of ```package.json```:
- **validation server URL**: URL of the validation server offering a RESTful API
  verify origin AS of an IP prefix
- **cache server host**: hostname of a RPKI cache server
- **cache server port**: port number of the RPKI cache service
- **cache time to live**: live time (TTL) of cached validation entries

## notes

If you use a customized addon, disable auto updates for this addon.
