"use strict";

const init = (localPort, remotePort, remoteAddress, auxs, supportedChannels, serverPort, mapping) =>
{
	/**
	 * The list of aux channels
	 * Uses JSON.stringify and JSON.parse to clone auxs
	 * @type {Object}
	 */
	let auxList = JSON.parse(JSON.stringify(auxs));

	const osc = require("osc"),
		cliProgress = require('cli-progress'),
		express = require("express"),
		http = require('http'),
		WebSocket = require("ws");

	const SKIP = process.argv.indexOf("skip") !== -1;
	const DEBUG = process.argv.indexOf("debug") !== -1;

	/**
	 * The total number of parameters that need to load.
	 * @type {Int}
	 */
	let totalParamsToLoad = 0;

	/**
	 * All of the channels for the AUXs
	 * @type [Int]
	 */
	let auxChannels = [];

	//add all aux channels to the channel numbers
	for(let aux of auxList)
	{
		auxChannels.push(aux.channel);
		aux.label = null; //reset all labels
		totalParamsToLoad++; //need to fetch the aux labels
	}

	/**
 	* All the OSC address:values that have been saved since the server started
 	*/
	let values = {};

	// pre-populate values with default data
	for(let channelIndex=0; channelIndex < supportedChannels.length; channelIndex++)
	{
		for(let auxIndex=0; auxIndex < auxList.length; auxIndex++)
		{
			let data = {
				"level": null
			};
			totalParamsToLoad++;

			if(auxList[auxIndex].stereo != undefined && auxList[auxIndex].stereo)
			{
				data.pan = null;
				totalParamsToLoad++;
			}

			values["a" + auxList[auxIndex].channel + "|c" + supportedChannels[channelIndex]] = data;
		}
	}

	/**
	 * Socket connections that have connected
	 * @type {Array}
	 */
	let connections = [];

	/**
	 * The channels that are available to mix.
	 * @type {Array}
	 */
	let channels = [];

	//populate channels with blank values
	for(let chan of supportedChannels)
	{
		channels.push({
			label: null,
			channel: chan
		});
		totalParamsToLoad++;
	}

	/**
 	* Get the IP addresses for this device on the network.
 	*/
	const getIPAddresses = () =>
	{
		let os = require("os"),
		interfaces = os.networkInterfaces(),
		ipAddresses = [];

		for (let deviceName in interfaces)
		{
			let addresses = interfaces[deviceName];
			for (let i = 0; i < addresses.length; i++)
			{
				let addressInfo = addresses[i];
				if(addressInfo.family === "IPv4" && !addressInfo.internal)
				{
					ipAddresses.push(addressInfo.address);
				}
			}
		}
		return ipAddresses;
	};

	let ipAddresses = getIPAddresses();

	/*
	Progress bar to load desk values
	*/
	const loadingProgress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

	// Bind to a UDP socket to listen for incoming OSC events.
	let udpPort = new osc.UDPPort({
		localAddress: ipAddresses[0],
		localPort: localPort,
		remotePort: remotePort,
		remoteAddress: remoteAddress
	});

	udpPort.on("error", function (err)
	{
		console.error("UDP error", err);
	});

	let loadingAddresses = mapping.getLoadingAddresses(auxList, supportedChannels);

	udpPort.on("ready", function ()
	{
		console.log("Loading Desk Values...");

		loadingProgress.start(totalParamsToLoad, 0);

		if(SKIP)
		{
			loadingProgress.update(totalParamsToLoad);
			loadingProgress.stop();

			udpPort.off("message", loadingMessages);
			udpPort.on("message", loadedMessages);

			startWebSocketServer();
			return;
		}

		/*
		Start loading values from the desk
		It seems that you can't ask for all of these addresses at once on an SD9 console.
		If you do this the desk can ignore some requests and then we will never load correctly.
		*/
		if(loadingAddresses.length > 0)
		{
			udpPort.send({
				address: loadingAddresses.shift()
			});
		}
	});

	/**
	 * Handle OSC messages while loading
	 * @param {Object} oscMsg - the OSC message received
	 * @param {??} timeTag - the time tag specified by the sender (may be undefined for non-bundle messages)
	 * @param {??} info - an implementation-specific remote information object
	 */
	function loadingMessages(oscMsg, timeTag, info)
	{
		if(DEBUG)
		{
			console.debug("Loading OSC message arrived: ", oscMsg);
		}

		const msg = mapping.getMsg(oscMsg, auxChannels);
		if(!msg)
		{
			return;
		}

		//save the changes
		saveConfig(msg);

		const totalLoadedParams = getTotalLoadedParams();
		loadingProgress.update(totalLoadedParams);

		if(totalLoadedParams == totalParamsToLoad)
		{
			loadingProgress.stop();

			udpPort.off("message", loadingMessages);
			udpPort.on("message", loadedMessages);

			startWebSocketServer();

			return;
		}

		//request the next value from the desk
		if(loadingAddresses.length > 0)
		{
			udpPort.send({
				address: loadingAddresses.shift()
			});
		}
	}
	udpPort.on("message", loadingMessages);
	udpPort.open();


	/**
	 * Handle OSC messages after everything has been loaded
	 * @param {Object} oscMsg - the OSC message received
	 * @param {??} timeTag - the time tag specified by the sender (may be undefined for non-bundle messages)
	 * @param {??} info - an implementation-specific remote information object
	 */
	function loadedMessages(oscMsg, timeTag, info)
	{
		if(DEBUG)
		{
			console.debug("OSC message arrived: ", oscMsg);
		}

		const msg = mapping.getMsg(oscMsg, auxChannels);

		if(!msg)
		{
			return;
		}

		saveConfig(msg);

		sendToConnections(msg);
	}

	/**
	 * Get the total Loaded parameters
	 */
	function getTotalLoadedParams()
	{
		let totalLoadedParams = 0;

		//check if values have loaded
		for(let value in values)
		{
			if(values[value].level != null)
			{
				totalLoadedParams++;
			}
			if(values[value].pan !== undefined && values[value].pan != null)
			{
				totalLoadedParams++;
			}
		}

		//check if channels have loaded
		for(let chan of channels)
		{
			if(chan.label != null)
			{
				totalLoadedParams++;
			}
		}

		//check if aux labels have loaded
		for(let aux of auxList)
		{
			if(aux.label != null)
			{
				totalLoadedParams++;
			}
		}

		return totalLoadedParams;
	}

	function startWebSocketServer()
	{
		// Create an Express-based Web Socket server that clients can connect to
		let appResources = __dirname + "/web",
			app = express();

		let server = http.createServer(app).listen(serverPort);

		app.use("/", express.static(appResources));

		let wss = new WebSocket.Server({
			server: server
		});

		wss.on("connection", function(socket)
		{
			connections.push(socket);

			if(DEBUG)
			{
				console.debug("New Connection");
			}

			//send new connection the current config
			let info = JSON.stringify({
				"config": {
					channels: channels,
					aux: auxList
				}
			});
			socket.send(info);

			socket.on('message', function message(data)
			{
				let msg = JSON.parse(data);

				if(DEBUG)
				{
					console.debug("Message from client: ", msg);
				}

				/*
				Respond to connection when a request was made for the current values for a AUX.
				*/
				if(msg["aux?"])
				{
					let channelValues = {};
					for(let value in values)
					{
						for(let channel of channels)
						{
							if(value == "a" + msg["aux?"] + "|c" + channel.channel)
							{
								channelValues[channel.channel] = values[value];
							}
						}
					}

					this.send(JSON.stringify({
						"aux?": msg["aux?"],
						channels: channelValues
					}));

					return;
				}

				//save the update
				saveConfig(msg);

				//tell desk to update
				udpPort.send(mapping.getOSC(msg));

				//tell other connections to update
				sendToConnections(msg, this);
			});
		});

		wss.on("error", function (err)
		{
			console.debug("wss error", err);
		});

		console.log("\n\nServer Ready.\nVisit http://" + ipAddresses[0] + ":" + serverPort + " in a web browser to access OSC Web Mixer.\nPlease make sure the device you want to use is on the same network.");
	}

	/**
	 * Send a message to current connections.
	 *    This will remove any connections from the connections array if that have become invalid.
	 * @param object msg - The OSC message to send
	 * @param socket ignore - A socket connection to not send the message to.
	 */
	function sendToConnections(msg, ignore = null)
	{
		let validConnections = [];
		connections.forEach(function(connection)
		{
			/**
			* CONNECTING = 0
			* OPEN = 1
			*/
			if(connection.readyState <= 1)
			{
				validConnections.push(connection);
				if(connection != ignore)
				{
					connection.send(JSON.stringify(msg));
				}
			}
		});
		connections = validConnections;
	}

	/**
	 * Update current config with supplied message
	 * @param object update - the update to apply
	 */
	function saveConfig(update)
	{
		//update aux channel name
		if(update.auxname != undefined)
		{
			//only save aux info we care about
			if(auxChannels.indexOf(update.channel) == -1)
			{
				return;
			}

			for(let aux of auxList)
			{
				if(aux.channel == update.channel)
				{
					aux.label = update.auxname;
					return;
				}
			}
		}

		//only save channel info we care about
		if(supportedChannels.indexOf(update.channel) == -1)
		{
			return;
		}

		//update channel name
		if(update.name != undefined)
		{
			for(let channel of channels)
			{
				if(channel.channel == update.channel)
				{
					channel.label = update.name;
					return;
				}
			}
		}

		const valueKey = "a" + update.aux + "|c" + update.channel;

		//save the level for a channel
		if(update.level != undefined)
		{
			if(!values[valueKey])
			{
				return;
				values[valueKey] = {};
			}

			values[valueKey].level = update.level;
		}

		//save the pan for a channel
		if(update.pan != undefined)
		{
			if(!values[valueKey] || values[valueKey].pan === undefined)
			{
				return;
				values[valueKey] = {};
			}

			values[valueKey].pan = update.pan;
		}
	}



	/*setTimeout(function(){

		loadingMessages({
			address: "/sd/Input_Channels/1/Aux_Send/1/send_level",
			args: [.5]
		});

		loadingMessages({
			address: "/sd/Input_Channels/1/Aux_Send/1/send_pan",
			args: [.5]
		});

		loadingMessages({
			address: "/sd/Input_Channels/1/Channel_Input/name",
			args: ["test"]
		});

		loadingMessages({
			address: "/sd/Aux_Outputs/1/Buss_Trim/name",
			args: ["test"]
		});

		loadedMessages({
			address: "/channel/1/send/70/level",
			args: [.15]
		});

		loadedMessages({
			address: "/channel/1/send/70/pan",
			args: [1]
		});

		loadedMessages({
			address: "/channel/1/name",
			args: ["test1"]
		});

		loadedMessages({
			address: "/channel/70/name",
			args: ["test2"]
		});


	}, 5000);*/
}

module.exports = { init }
