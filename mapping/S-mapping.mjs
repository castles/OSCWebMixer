"use strict";
export default class Mapper
{
	constructor(config)
	{
		/*
		 * Mapping of Aux Channels to Sends
		 * S-Series Consoles give Aux a channel number for the AUX but require a different send for the OSC command.
		 */
 		this.auxToSend = {};
		this.sendToAux = {};
		let auxs = config.get("aux");
		for(const aux of auxs)
		{
			this.auxToSend[aux.channel] = aux.send;
			this.sendToAux[aux.send] = aux.channel;
		}
	}

	getOSC(data)
	{
		if(data.level != undefined)
		{
			return {
				address: "/channel/" + data.channel + "/send/" + this.auxToSend[data.aux] + "/level",
				args: [(data.level * 70) - 60]
			};
		}
		if(data.pan != undefined)
		{
			return {
				address: "/channel/" + data.channel + "/send/" + this.auxToSend[data.aux] + "/pan",
				args: [data.pan]
			};
		}

		return false;
	}

	getMsg(osc, auxChannels)
	{
		//level
		let match = /\/channel\/([0-9]+)\/send\/([0-9]+)\/level/.exec(osc.address);
		if(match)
		{
			let msg = {
				aux: this.sendToAux[parseInt(match[2])],
				channel: parseInt(match[1])
			}
			msg["level"] = (osc.args[0] + 60) / 70;
			return msg;
		}

		//pan
		match = /\/channel\/([0-9]+)\/send\/([0-9]+)\/pan/.exec(osc.address);
		if(match)
		{
			let msg = {
				aux: this.sendToAux[parseInt(match[2])],
				channel: parseInt(match[1])
			}
			msg["pan"] = osc.args[0];
			return msg;
		}

		//channel name
		match = /\/channel\/([0-9]+)\/name/.exec(osc.address);
		if(match)
		{
			let channel = parseInt(match[1]);
			if(auxChannels.indexOf(channel) != -1)
			{
				return {
					auxname: osc.args[0],
					channel: channel
				};
			}

			return {
				name: osc.args[0],
				channel: channel
			};
		}

		return false;
	}

	getLoadingAddresses(auxs, channels)
	{
		//ask the desk to send details about everything. This will cause the desk to send a lot of OSC messages.
		return ["/console/resend"];
	}
}
