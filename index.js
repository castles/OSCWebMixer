"use strict";

const DESK_IP = "10.79.2.27",
RECEIVE_PORT = 8001,
SEND_PORT = 9001;

//The AUX channels for the session file you will be connecting to
/**
 * The AUX channels that will be available in the APP.
 * Each AUX object should have the following values:
 {
	label: "AUX Label", //(label isn't required as it will be captured from the desk)
	send: 1, //AUX number
	stereo: true, //whether or not the AUX is a stereo output
	colour: "6, 106, 166" //the colour tint in for format R, G, B
 }
 * @type Array[Object]
 */
let auxs = [
	{
		label: "DRUMS",
		send: 1,
		stereo: true,
		colour: "6, 106, 166"
	},
	{
		label: "BASS",
		send: 2,
		stereo: true,
		colour: "6, 166, 99"
	},
	{
		label: "GTR",
		send: 4,
		stereo: true,
		colour: "48, 213, 6"
	},
	{
		label: "KEYS",
		send: 5,
		stereo: true,
		colour: "166, 6, 6"
	},
	{
		label: "Lead 1",
		send: 6,
		stereo: false,
		colour: "113, 6, 166"
	},
	{
		label: "Lead 2",
		send: 7,
		stereo: false,
		colour: "194, 62, 132"
	},
	{
		label: "BV 1",
		send: 8,
		stereo: false,
		colour: "6, 46, 140"
	},
	{
		label: "BV 2",
		send: 9,
		stereo: false,
		colour: "166, 89, 6"
	},
	{
		label: "BV 3",
		send: 10,
		stereo: false,
		colour: "242, 187, 0"
	}
];

/**
 * A list of channel numbers to ignore. When a channel number is listed here it will not be available in the app.
 * @type Array[Int]
 */
const ignoreChannels = [];


//// ------ Don't Edit Below This Line (Unless you know what your doing) ---------  ////


const osc = require("osc"),
    express = require("express"),
    WebSocket = require("ws"),
	http = require('http'),
	cliProgress = require('cli-progress');

//The channels that we currently support
let channels = [
	{
		label: "CLICK",
		number: 21
	},
	{
		label: "MD",
		number: 22
	},
	{
		label: "MD2",
		number: 31
	},
	{
		label: "Kick",
		number: 1
	},
	{
		label: "Snare Top",
		number: 3
	},
	{
		label: "Snare Bottom",
		number: 4
	},
	{
		label: "Hats",
		number: 5
	},
	{
		label: "Tom 1",
		number: 6
	},
	{
		label: "Floor Tom",
		number: 8
	},
	{
		label: "OH L",
		number: 9
	},
	{
		label: "OH R",
		number: 10 //???
	},
	{
		label: "SPDSX",
		number: 11
	},
	{
		label: "BASS",
		number: 13
	},
	{
		label: "GTR",
		number: 15
	},
	{
		label: "ACOUSTIC2",
		number: 17
	},
	{
		label: "KEYS 1",
		number: 47
	},
	{
		label: "TRAX",
		number: 20
	},
	{
		label: "TRAX GTR",
		number: 2
	},
	{
		label: "LEAD 1",
		number: 41
	},
	{
		label: "LEAD 2",
		number: 42
	},
	{
		label: "BV1",
		number: 43
	},
	{
		label: "BV2",
		number: 44
	},
	{
		label: "BV3",
		number: 45
	},
	{
		label: "BV4",
		number: 46
	},
	{
		label: "Choir L",
		number: 7
	},
	{
		label: "Choir R",
		number: 16
	},
	{
		label: "MC1",
		number: 29
	},
	{
		label: "MC2",
		number: 30
	},
	{
		label: "Media",
		number: 32 
	},
];

//channels = [];



let values = {};

/**
 * Get the IP addresses for this device on the network.
 */
function getIPAddresses()
{
	var os = require("os"),
	interfaces = os.networkInterfaces(),
	ipAddresses = [];

	for (var deviceName in interfaces)
	{
		var addresses = interfaces[deviceName];
		for (var i = 0; i < addresses.length; i++)
		{
			var addressInfo = addresses[i];
			if(addressInfo.family === "IPv4" && !addressInfo.internal)
			{
				ipAddresses.push(addressInfo.address);
			}
		}
	}
	return ipAddresses;
};

let ipAddresses = getIPAddresses();

// Bind to a UDP socket to listen for incoming OSC events.
var udpPort = new osc.UDPPort({
	localAddress: ipAddresses[0],
	localPort: RECEIVE_PORT, //The port to listen on
	remotePort: SEND_PORT, //The remote port to send messages to
	remoteAddress: DESK_IP //The remote address to send messages to
});

udpPort.on("error", function (err)
{
	console.log("udp error", err);
});

/*udpPort.on("raw", function (data, info)
{
	console.log("udp raw", data, info);
});*/

/**
 * Stores all of the addresses that the server needs to know about before it's ready to use.
 * @type Array
 */
let addressesToRequest = [];

/**
 * Store the total number of address to request from the desk
 * @type Int
 */
let totalAddressesToRequest = 0;

/*
Progress bar to load desk values
*/
const loadingProgress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

udpPort.on("ready", function ()
{
	console.log("Loading Desk Values...");	
	
	//request session filename
/*	udpPort.send({
		address: "/Console/Session/Filename/?",
		args: []
	});*/

	//Build an array of all the addresses we need to know about.
	auxs.forEach(function(aux)
	{
		//request aux send names from desk
		addressesToRequest.push("/sd/Aux_Outputs/" + aux.send + "/Buss_Trim/name");
		
		for(let i=1; i<=48; i++)
		{
			//don't request addresses for channels that are being ignored
			if(ignoreChannels.indexOf(i) !== -1)
			{
				continue;
			}
			
			//request aux pan level from desk
			if(aux.stereo)
			{
				addressesToRequest.push("/sd/Input_Channels/" + i + "/Aux_Send/" + aux.send + "/send_pan");
			}
			
			//request aux send level from desk
			addressesToRequest.push("/sd/Input_Channels/" + i + "/Aux_Send/" + aux.send + "/send_level");
		}
	});
	
	//request channel names from desk
	for(let i=1; i<=48; i++)
	{
		//don't request names for channels that are being ignored
		if(ignoreChannels.indexOf(i) !== -1)
		{
			continue;
		}
		
		addressesToRequest.push("/sd/Input_Channels/" + i + "/Channel_Input/name");
	}
	/*channels.forEach(function(channel)
	{		
		addressesToRequest.push("/sd/Input_Channels/" + channel.number + "/Channel_Input/name");
	});*/

	totalAddressesToRequest = addressesToRequest.length;
	loadingProgress.start(totalAddressesToRequest, 0);
	
	if(process.argv[2] == "skip")
	{
		loadingProgress.update(addressesToRequest.length);
		loadingProgress.stop();
		startWebSocketServer();
		return;
	}
	
	getNextAddress();
});

let requestTimeout = null;
let currentRequestAddress = null;

/**
 * Ask the desk for the value of the next address
 */
function getNextAddress()
{
	clearTimeout(requestTimeout);
	
	loadingProgress.update(totalAddressesToRequest - addressesToRequest.length);
	currentRequestAddress = addressesToRequest.pop();
	if(currentRequestAddress)
	{
		udpPort.send({
			address: currentRequestAddress + "/?",
			args: []
		});
		
		requestTimeout = setTimeout(function(){
			console.log("\n\nMessage Timeout.. trying again..." );
			addressesToRequest.push(currentRequestAddress);
			getNextAddress();
		}, 10000);
	}
	else
	{
		console.log(channels);
		loadingProgress.stop();
		startWebSocketServer();
	}
}

/**
 * Callback for when something has changed at the mixing desk
 */
udpPort.on("message", function (oscMsg, timeTag, info)
{
	//console.log("udp An OSC message just arrived!", oscMsg);

	//save the changes
	saveConfig(oscMsg);

	if(currentRequestAddress)
	{
		//ignore all messages that we haven't requested when first loading
		if(oscMsg.address != currentRequestAddress)
		{
			return;
		}
		
		//get the next address
		getNextAddress();
		
		return;
	}
	
	//tell other connections to update
	sendToConnections(oscMsg);
});

udpPort.open();


//an array of socket connections that have connected
let connections = [];

function startWebSocketServer()
{
	// Create an Express-based Web Socket server that clients can connect to
	var appResources = __dirname + "/web",
    	app = express();
	
	var server = http.createServer(app).listen(8081);
	
	app.use("/", express.static(appResources));
	
	var wss = new WebSocket.Server({
		server: server
	});

	wss.on("connection", function(socket)
	{
		connections.push(socket);
	
		console.log("New Connection");
		
		//send new connection the current config
		let info = JSON.stringify({
			address: "config",
			args: {
				channels: channels,
				aux: auxs
			}
		});
		socket.send(info);
	
		socket.on('message', function message(data)
		{
			let msg = JSON.parse(data);
			
			//console.log(msg);
			
			/*
			Respond to connection when a request was made for the current values or an AUX.
			This is a custom OSC command and doesn't query the desk. It simply responds with the values it knows about.
			*/
			let match = /\/sd\/Aux_Outputs\/([0-9]+)\/?/.exec(msg.address);
			if(match)
			{
				let channelValues = {};
				for(let value in values)
				{
					//Look for volume or pan address
					if(value.indexOf("Aux_Send/" + match[1]) != -1)
					{
						channelValues[value] = values[value];
					}
				}
				
				this.send(JSON.stringify({
					address: "/sd/Aux_Outputs/" + match[1],
					args: channelValues
				}));
				
				return;
			}
			
			
			//save the update
			saveConfig(msg);
	
			//tell desk to update
			udpPort.send(msg);
	
			//tell other connections to update
			sendToConnections(msg, this);
		});
	});
	
	wss.on("error", function (err)
	{
		console.log("wss error", err);
	});
	
	console.log("\n\nServer Ready. Visit http://" + ipAddresses[0] + ":8081 in your web browser to access OSC Web Mixer.");
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
 * Update current config with supplied OSC message
 * @param object update - the update to apply
 */
function saveConfig(update)
{	
	//update aux name
	let match = /\/sd\/Aux_Outputs\/([0-9]+)\/Buss_Trim\/name/.exec(update.address);
	if(match)
	{
		//console.log(match, update);
		auxs.forEach(function(aux)
		{
			if(aux.send == match[1])
			{
				aux.label = update.args[0];
			}
		});
		return;
	}
	
	//update channel name
	match = /\/sd\/Input_Channels\/([0-9]+)\/Channel_Input\/name/.exec(update.address);
	if(match)
	{	
		//console.log(match, update);
		
		//don't save channels we are ignoring
		if(ignoreChannels.indexOf(match[1]) !== -1)
		{
			return;
		}
		
		//look for a channel to update
		channels.forEach(function(channel)
		{
			if(channel.number == match[1])
			{
				channel.label = update.args[0];
				return;
			}
		});
		
		//no channel found so add one
		channels.unshift({
			label: update.args[0],
			number: parseInt(match[1])
		});
		
		return;
	}
	
	/**
	 * Save send level and pan level in key value array
	 */
	values[update.address] = update.args[0];
}
