# OSCWebMixer
A server that allows web clients to control their own mix for a DiGiCo sound desk. This has been tested with A SD9 console running 760 Firmware (last version before stealth core 2).

![Example Server](https://github.com/castles/OSCWebMixer/blob/main/server.jpg?raw=true)
![Example Drum Mix](https://github.com/castles/OSCWebMixer/blob/main/drums.jpg?raw=true)
![Example Drum Panning](https://github.com/castles/OSCWebMixer/blob/main/pan.jpg?raw=true)
![Example Bass Mix](https://github.com/castles/OSCWebMixer/blob/main/bass.jpg?raw=true)

Requirements
[Node](https://nodejs.org/en/download/) must be installed. On macOS you can install it with [Homebrew](https://brew.sh/) (brew install node)

## Basic Setup Instructions
1. Download repository and navigate to the directory in a shell.
2. Run "npm install" to download all the required node modules.
3. Ensure OSC is enabled and configured under External Control on the sound desk.
4. Edit index.js and configure DESK_IP, RECEIVE_PORT, SEND_PORT, auxs and ignoreChannels.
5. Run "node ." in the shell to start the server. If a connection is made to the sound desk the script should load all the values and print the URL for other devices to connect to.
6. Open the IP address on another device and start mixing. 

## FAQs
<details>
  <summary>My External Devices won't connect</summary>
  Ensure the server is running and the devices are connected on the same network.
</details>
<details>
  <summary>Can I test it without a sound desk?</summary>
  Yes, type "node . skip" when running the server.
</details>
<details>
  <summary>Why haven't you use Web Workers?</summary>
  Web workers require HTTPS to be enabled and that would be too much mucking around to get it working on clients. Feel free to reach out if you can come up with a nice way for this to work.
</details>
