# RPKI Validator - Firefox Addon

## build

First, download and install the Firefox Addon SDK as described
[here](https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Installation).
Second, open a terminal and clone the Firefox addon repo (this one), afterwards
change directory to ```<path/to/addon-clone>/source```.
Third, run ```<path/to/sdk>/bin/cfx xpi``` within the source directory, this
will create the ```rpki-validator.xpi```. Next steps see install.

## install

Open Firefox and goto the main menu. Open the Add-ons control panel, or open a
tab with URL ```about:addons```. Click on the *tools* button an select *install
addon from file* for manual addon installation, browse to and open  
```rpki-validator.xpi```, click install now. Done!

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
