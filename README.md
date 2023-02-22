# OSCWebMixer
A server that allows multiple web clients to control their own mix for a DiGiCo sound desk. It currently works with SD and S-Series consoles.

Users can save the website as a homescreen app which makes it easy for them to reconnect when needed. Users can also flag channels as favourites so they filter the display to see channels they are interested in.

![Example Server](terminal.jpg)
<div align="center">
<img src="https://github.com/castles/OSCWebMixer/blob/main/drums.jpg?raw=true" width="200">
<img src="https://github.com/castles/OSCWebMixer/blob/main/pan.jpg?raw=true" width="200">
<img src="https://github.com/castles/OSCWebMixer/blob/main/bass.jpg?raw=true" width="200">
</div>

### SD Range Requirements
* A SD Range DiGiCo Mixing desk with the [OSC extension](https://github.com/castles/OSCWebMixer/raw/main/DiGiCo_Other_OSC_Package_V987.zip) installed and enabled. The appropriate .dosc goes on the app drive in the SDx folder, usually drive D:/SD9/
* A computer to run the server. Windows, macOS or Linux.
* [Node](https://nodejs.org/en/download/) must be installed. On macOS you can install it with [Homebrew](https://brew.sh/) (brew install node)
* Server, Desk and other devices must all be on the same network

### S-Series Requirements
* A S-Series DiGiCo Mixing desk with the latest firmware installed.
* A computer to run the server. Windows, macOS or Linux.
* [Node](https://nodejs.org/en/download/) must be installed. On macOS you can install it with [Homebrew](https://brew.sh/) (brew install node)
* Server, Desk and other devices must all be on the same network

### S-Series Known Bugs
* Sends greater than 15 cannot be used. These will only be available if you have purchased the Channel Count Increase upgrade. The reason they can't be used is because the current version of the S-Series doesn't send the initial values for these channels, causing webmixer to never completely load. The best workaround for this for now is to only use the first 16 AUX channels with webmixer.

## SD Basic Setup Instructions
1. Download repository and navigate to the directory in a shell.
2. Run "npm install" to download all the required node modules.
3. Ensure OSC is enabled and configured under External Control on the sound desk. Make sure the [OSC extension](https://github.com/castles/OSCWebMixer/raw/main/DiGiCo_Other_OSC_Package_V987.zip) is installed and enabled.
4. Rename config/default-SD.js to config/default.js
5. Update the config to include the console IP and send + receive ports.
6. Go to Layout > Channel List on the console and enter the AUX numbers and Input Channel numbers into your config file. Save the config.
7. Run "node ." in the shell to start the server. If a connection is made to the sound desk the script should load all the values and print the URL for other devices to connect to.
8. Open the IP address on another device and start mixing.

## S-Series Basic Setup Instructions
1. Download repository and navigate to the directory in a shell.
2. Run "npm install" to download all the required node modules.
3. Ensure OSC is enabled on the console. You will need to enter the IP of webmixer computer and enable the send and receive ports.
4. Rename config/default-S.js to config/default.js
5. Update the config to include the console IP and send + receive ports.
6. Run "node . debug" in the shell to start the server. Move faders and take note of the numbers for channels and sends. You will need to update the numbers in the config file to match.
7. Run "node ." in the shell to start the server. If a connection is made to the sound desk the script should load all the values and print the URL for other devices to connect to.
8. Open the IP address on another device and start mixing.

## FAQs
<details>
  <summary>My External Devices won't connect</summary>
  Ensure the server is running and the devices are connected on the same network. Also check the External Control is configured correctly in the desk.
</details>
<details>
  <summary>What devices work?</summary>
  Anything with a recent web browser can connect, that means it should work on iOS, Android, Windows, macOS and Linux.
</details>
<details>
  <summary>How many devices can I connect at once?</summary>
  No limit has been set and we haved tested 20+ without any issues.
</details>
<details>
  <summary>Can I test it without a sound desk?</summary>
  Yes, add skip parameter when running the server. eg. "node . skip"
</details>
<details>
  <summary>Can I view OSC messages from the desk?</summary>
  Yes, add debug parameter when running the server. eg. "node . debug"
</details>
<details>
  <summary>Why haven't you used Web Workers?</summary>
  Web workers require HTTPS to be enabled and that would be too much mucking around to get it working on clients. Feel free to reach out if you can come up with a nice way for this to work.
</details>
<details>
  <summary>WebMixer doesn't finish loading</summary>
  Sometimes the information for a channel is not returned by the desk. Your config may be incorrect. In this case try removing channels and/or AUXs to determine which is causing webmixer not to load.
</details>

## Donate
If you find this project useful why not make a donation to show your support?

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=VL5VBHN57FVS2&item_name=OSCWebMixer)
