"use strict";

const config = require('config'),
	webmixer = require("./webmixer");


if(config.has('ignore_channels'))
{
	console.log("default.json needs to be updated. \"ignore_channels\" has been changed to be channels. Instead of a list of \"channels\" to ignore please add the channels that you would like to include.");
	return;
}

if(!config.has('channels'))
{
	console.log("default.json file does not contain channels key. Please add it to continue. If you don't know the channels to use please add a blank array (\"channels\": []).");
	return;
}

if(!config.has('desk.receive_port'))
{
	console.log("default.json must include the desk.receive_port");
	return;
}

if(config.has('desk.channel_count'))
{
	console.log("desk.channel_count is no longer necessary. This config entry has been ignored.");
}

let type = "SD";
if(config.has('desk.type'))
{
	type = config.get('desk.type');
}

console.log("Loading DiGiCo " + type + " configuration");
import("./mapping/" + type.toUpperCase() + "-mapping.mjs").then(mappingModule => {

	webmixer.init(
		config.get('desk.send_port'),
		config.get('desk.receive_port'),
		config.get('desk.ip'), //remoteAddress
		config.get('aux'), //The AUX channels for the session file you will be connecting to
		config.get('channels'), // A list of channels that are available to mix with.
		config.get('server.port'), // The port for the web server
		new mappingModule.default(config)
	);
})
