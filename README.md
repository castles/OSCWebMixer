# OSCWebMixer
A server that allows web clients to control their own mix for a DiGiCo sound desk. This has been tested with A SD9 console running 760 Firmware (last version before stealth core 2).

Requirements
[Node](https://nodejs.org/en/download/) must be installed. On macOS you can install it with [Homebrew](https://brew.sh/) (brew install node)

Basic Setup Instructions
1. Download repository and navigate to the directory in a shell.
2. Run "npm install" to download all the required node modules.
3. Ensure OSC is enabled under External Control on the sound desk.
4. Edit index.js and configure DESK_IP, RECEIVE_PORT, SEND_PORT, auxs and ignoreChannels.
5. Run "node ." in the shell to start the server. If a connection is made to the sound desk the script should load all the values and print the URL for other devices to connect to.
6. Open the IP address on another device and start mixing. 
