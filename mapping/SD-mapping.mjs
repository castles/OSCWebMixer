"use strict";
export default class Mapper
{
	constructor(config)
	{
	}

	/**
 	* Convert webmixer message to OSC message.
 	* @param {Object} msg - the object to convert to an OSC message.
 	*/
	getOSC(msg)
	{
		if(msg.level != undefined)
		{
			return {
				address: "/sd/Input_Channels/" + msg.channel + "/Aux_Send/" + msg.aux + "/send_level",
				args: [msg.level]
			};
		}

		if(msg.pan != undefined)
		{
			return {
				address: "/sd/Input_Channels/" + msg.channel + "/Aux_Send/" + msg.aux + "/send_pan",
				args: [(msg.pan + 1) / 2]
			};
		}

		return false;
	}

	/**
 	* Convert OSC messages to messages that webmixer understands.
 	* @param {Object} osc - The OSC message to convert
 	*/
	getMsg(osc, auxChannels)
	{
		//channel level
		let match = /\/sd\/Input_Channels\/([0-9]+)\/Aux_Send\/([0-9]+)\/send_level/.exec(osc.address);
		if(match)
		{
			return {
				aux: parseInt(match[2]),
				channel: parseInt(match[1]),
				level:  osc.args[0]
			};
		}

		//channel panning
		match = /\/sd\/Input_Channels\/([0-9]+)\/Aux_Send\/([0-9]+)\/send_pan/.exec(osc.address);
		if(match)
		{
			return {
				aux: parseInt(match[2]),
				channel: parseInt(match[1]),
				pan:  (osc.args[0] * 2) - 1
			};
		}

		//channel name
		match = /\/sd\/Input_Channels\/([0-9]+)\/Channel_Input\/name/.exec(osc.address);
		if(match)
		{
			return {
				name: osc.args[0],
				channel: parseInt(match[1])
			};
		}

		//Aux name
		match = /\/sd\/Aux_Outputs\/([0-9]+)\/Buss_Trim\/name/.exec(osc.address);
		if(match)
		{
			return {
				auxname: osc.args[0],
				channel: parseInt(match[1])
			};
		}

		return false;
	}

	/**
 	* Get a list of OSC addresses that need to be fetched from the desk before the system is ready to use.
 	* @param {Object} auxs - the auxs defined in the config file.
 	* @param [int] channels - the channels defined in the config file.
 	*/
	getLoadingAddresses(auxs, channels)
	{
		let addressesToRequest = [];

		//Build an array of all the addresses we need to know about.
		auxs.forEach(function(aux)
		{
			//request aux names from desk
			addressesToRequest.push("/sd/Aux_Outputs/" + aux.channel + "/Buss_Trim/name/?");

			for(let i=0; i<channels.length; i++)
			{
				//request aux pan level from desk
				if(aux.stereo)
				{
					addressesToRequest.push("/sd/Input_Channels/" + channels[i] + "/Aux_Send/" + aux.channel + "/send_pan/?");
				}

				//request aux send level from desk
				addressesToRequest.push("/sd/Input_Channels/" + channels[i] + "/Aux_Send/" + aux.channel + "/send_level/?");
			}
		});

		//request channel names from desk
		for(let i=0; i<channels.length; i++)
		{
			addressesToRequest.push("/sd/Input_Channels/" + channels[i] + "/Channel_Input/name/?");
		}

		return addressesToRequest;
	}
}
