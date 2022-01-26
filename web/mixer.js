"use strict";

const channelsDiv = document.getElementById('channels'),
auxSelect = document.getElementById('aux'),
panCheckbox = document.getElementById("panning"),
favourites = document.getElementById("favourites"),
auxiliaries = document.getElementById("auxiliaries");

let ws = null,
timeout = null;

/**
 * callback for when a channel volume or pan changes
 * @param ChangeEvent e - the channel volume/pan change event
 */
function sliderChange(e)
{
	this.parentNode.style.setProperty('--value', (this.value * 100) + "%");

	if(!ws)
	{
		return;
	}

	let parameter = "send_level";
	if(this.classList.contains("panInput"))
	{
		parameter = "send_pan";
	}

	ws.send(JSON.stringify({
		address: "/sd/Input_Channels/" + this.dataset.channel + "/Aux_Send/" + auxSelect.value + "/" + parameter,
		args: [
			parseFloat(this.value)
		]
	}));
}

/**
 * Request current AUX values from server
 */
function requestValues()
{
	ws.send(JSON.stringify({
		address: "/sd/Aux_Outputs/" + auxSelect.value + "/?",
		args: []
	}));
}

/**
 * Callback for when socket receives a message
 * @param SocketEvent e - the message socket event
 */
function onMessage(e)
{
	let json = JSON.parse(e.data);

	//console.log(json);

	//Setup AUX and channels
	if(json.address == "config")
	{
		buildAux(json.args.aux);
		buildChannels(json.args.channels);
		return;
	}

	//Set values for all channels for the current AUX
	if(json.address == "/sd/Aux_Outputs/" + auxSelect.value)
	{
		for(let slider of document.getElementsByClassName("volumeInput"))
		{
			let value = json.args["/sd/Input_Channels/" + slider.dataset.channel + "/Aux_Send/" + auxSelect.value + "/send_level"] ?? 0;
			slider.value = value;
			slider.parentNode.style.setProperty('--value', (value * 100) + "%");
		}

		for(let slider of document.getElementsByClassName("panInput"))
		{
			let value = json.args["/sd/Input_Channels/" + slider.dataset.channel + "/Aux_Send/" + auxSelect.value + "/send_pan"] ?? 0.5;
			slider.value = value;
			slider.parentNode.style.setProperty('--value', (value * 100) + "%");
		}

		let checkedFavourites = localStorage.getItem("aux" + auxSelect.value + "fav");
		if(checkedFavourites)
		{
			checkedFavourites = checkedFavourites.split(",");
		}
		else
		{
			checkedFavourites = [];
		}

		//restore whether or not favourites checkbox was ticked previously
		favourites.checked = localStorage.getItem("aux" + auxSelect.value + "favChecked") == "true";

		//restore previously favourited channels
		for(let fav of document.querySelectorAll('input[name="fav[]"]'))
		{
			fav.checked = checkedFavourites.indexOf(fav.value) != -1;
		}

		//make sure channel visibility is correct
		favourites.dispatchEvent(new Event("change"));

		return;
	}

	//when an aux name changes
	let match = /\/sd\/Aux_Outputs\/([0-9]+)\/Buss_Trim\/name/.exec(json.address);
	if(match)
	{
		let aux = match[1];
		for(let option of auxSelect.options)
		{
			if(option.value == aux)
			{
				option.innerHTML = json.args[0];
			}
		}
		return;
	}

	//when a channel name changes
	match = /\/sd\/Input_Channels\/([0-9]+)\/Channel_Input\/name/.exec(json.address);
	if(match)
	{
		let channel = match[1];

		for(let slider of document.querySelectorAll('input[data-channel="' + channel + '"]'))
		{
			slider.previousElementSibling.innerHTML = json.args[0];
		}
		return;
	}

	//Update the volume for a single channel
	let regex = new RegExp("/sd/Input_Channels/([0-9]+)/Aux_Send/" + auxSelect.value + "/send_level");
	match = regex.exec(json.address);
	if(match)
	{
		let channel = match[1];

		for(let slider of document.querySelectorAll('input[data-channel="'+channel+'"].volumeInput'))
		{
			slider.parentNode.style.setProperty('--value', (json.args[0] * 100) + "%");
			slider.value = json.args[0];
		}
		return;
	}

	//Update the pan for a single channel
	regex = new RegExp("/sd/Input_Channels/([0-9]+)/Aux_Send/" + auxSelect.value + "/send_pan");
	match = regex.exec(json.address);
	if(match)
	{
		let channel = match[1];

		for(let slider of document.querySelectorAll('input[data-channel="'+channel+'"].panInput'))
		{
			slider.parentNode.style.setProperty('--value', (json.args[0] * 100) + "%");
			slider.value = json.args[0];
		}
		return;
	}
}

/**
 * Populate AUX Select Box
 * @param array options - An array of AUXs to add to the select box
 */
function buildAux(options)
{
	let selectHTML = "";

	auxiliaries.innerHTML = "";

	for(let option of options)
	{
		selectHTML += '<option value="' + option.send + '" data-colour="' + option.colour + '" data-stereo="' + option.stereo + '">' + option.label + '</option>';

		let button = document.createElement("button");
		button.value = option.send;
		button.innerHTML = option.label;
		button.style.setProperty('--tint', option.colour);
		auxiliaries.appendChild(button);
	}
	auxSelect.innerHTML = selectHTML;

	if(localStorage.getItem("aux"))
	{
		auxSelect.value = localStorage.getItem("aux");
	}
	else
	{
		document.body.classList.add("auxPicker");
	}

	auxSelect.dispatchEvent(new Event("change"));
}

/**
 * open the auxiliaries picker when tapped
 * @param MouseEvent e - the mouse event
 */
auxSelect.addEventListener("mousedown", function(e)
{
	e.preventDefault();
	e.stopImmediatePropagation();
	document.body.classList.add("auxPicker");
});

/**
 * Select the Aux when a button is tapped
 * @param MouseEvent e - the mouse event
 */
auxiliaries.addEventListener("click", function(e)
{
	if(e.target.nodeName == "BUTTON")
	{
		auxSelect.value = e.target.value;
		auxSelect.dispatchEvent(new Event("change"));
		document.body.classList.remove("auxPicker");
	}
});

//Detect double tap events for touch devices
let tapedTwice = false;
function tapSlider(e)
{
	if(!tapedTwice)
	{
		tapedTwice = true;
		setTimeout( function() { tapedTwice = false; }, 300 );
		return false;
	}
	resetSlider(e);
}

/**
 * Reset a channel to its default value.
 - Pan sliders will be set to 50%
 - Volume sliders will be set to 0
 * @param Event e - The Tap or Click Event
 */
function resetSlider(e)
{
	if(e.target.classList.contains("panInput"))
	{
		e.target.value = 0.5;
	}
	if(e.target.classList.contains("volumeInput"))
	{
		e.target.value = 0;
	}
	e.target.dispatchEvent(new Event("input"));
}

/**
 * Build channels html and add to the page
 * @param array channels - the channels to build
 */
function buildChannels(channels)
{
	let html = "";
	for(let channel of channels)
	{
		html += "<div>";
		html += '<label class="volume"><span>' + channel.label + '</span><input type="range" data-channel="' + channel.number + '" class="volumeInput" step="0.01" min="0" max="1" value="0" /></label>';
		html += '<label class="pan"><span>' + channel.label + '</span><input type="range" data-channel="' + channel.number + '" class="panInput" step="0.01" min="0" max="1" value="0.5" /></label>';
		html += '<label class="favourite starCheckbox"><input type="checkbox" name="fav[]" value="' + channel.number + '"/></label>';
		html += '</div>';
	}

	channelsDiv.innerHTML = html;

	for(let slider of document.querySelectorAll(".volumeInput, .panInput"))
	{
		slider.addEventListener("input", sliderChange);
		slider.addEventListener('touchstart', tapSlider);
		slider.addEventListener('dblclick', resetSlider);
	}
}

/**
 * When socket is connected
 */
function onOpen()
{
	document.body.classList.remove("disconnected");
}

/**
 * When a socket connection fails
 */
function noConnection()
{
	// connection closed, discard old websocket and create a new one in 2s
	if(ws)
	{
		ws.close();
	}
	clearTimeout(timeout);
	timeout = setTimeout(startWebsocket, 2000);
	document.body.classList.add("disconnected");
}

/**
 * Start the connection to the server
 */
function startWebsocket()
{
	ws = new WebSocket("ws://" + document.location.host);
	ws.onopen = onOpen;
	ws.onmessage = onMessage;
	ws.onclose = noConnection;
	ws.onerror = noConnection;
}

/**
 * When page has loaded
 */
document.addEventListener("DOMContentLoaded", function()
{
	//ensure the browser doesn't remember checked status
	panCheckbox.checked = false;

	startWebsocket();

	/**
	 * Handle Aux Select Changes
	 */
	auxSelect.addEventListener("change", function(e)
	{
		//save aux value so it can be restored
		localStorage.setItem("aux", this.value);

		//set the current page tint
		let colour = this.getElementsByTagName("option")[this.selectedIndex].dataset.colour;
		document.body.style.setProperty('--tint', colour);

		this.previousElementSibling.innerHTML = this.getElementsByTagName("option")[this.selectedIndex].text;

		//toggle visibility of the pan checkbox
		if(this.getElementsByTagName("option")[this.selectedIndex].dataset.stereo == "true")
		{
			panCheckbox.parentNode.style.display = "flex";
		}
		else
		{
			panCheckbox.parentNode.style.display = "none";
		}

		//disable panning if it was prevously selected
		panCheckbox.checked = false;
		panCheckbox.dispatchEvent(new Event("change"));

		//request all the channel values for the selected aux
		requestValues();
	});

	/**
	 * Handle Panning Checkbox changes
	 */
	panCheckbox.addEventListener("change", function(e)
	{
		if(this.checked)
		{
			document.body.classList.add("panning");
		}
		else
		{
			document.body.classList.remove("panning");
		}
	});

	/**
	 * iOS Safari doesn't calculate 100vh well so we do it with javascript. When saved to homescreen 100vh is fine.
	 */
	window.onresize = function()
	{
		if('standalone' in navigator && navigator.standalone)
		{
			return;
		}
		document.body.style.setProperty('--vh', window.innerHeight + "px");
	}
	window.onresize();


	/**
	 * When the Favourites checkbox has changed
	 */
	favourites.addEventListener("change", function(e)
	{
		//Force Momentum scrolling to stop on iOS.
		//This fixes an issue where channels might appear blank after tapping the favourites toggle.
		channelsDiv.style.overflow = 'hidden';
		channelsDiv.scrollTop = 0;
		setTimeout(function(){
		  channelsDiv.style.removeProperty("overflow");
		}, 10);

		localStorage.setItem("aux" + auxSelect.value + "favChecked", favourites.checked);

		for(let fav of document.querySelectorAll('input[name="fav[]"]'))
		{
			if(fav.checked || !favourites.checked)
			{
				fav.closest("div").style.removeProperty("display");
			}
			else
			{
				fav.closest("div").style.display = "none";
			}
		}

		if(favourites.checked)
		{
			document.body.classList.add("favourites");
		}
		else
		{
			document.body.classList.remove("favourites");
		}
	});

	/**
	 * Handle channel favourite change events
	 */
	channelsDiv.addEventListener("change", function(e)
	{
		if(e.target.name != "fav[]")
		{
			return;
		}

		let checkedfavs = [];
		for(let checked of document.querySelectorAll('input[name="fav[]"]:checked'))
		{
			checkedfavs.push(checked.value);
		}
		localStorage.setItem("aux" + auxSelect.value + "fav", checkedfavs.join(","));
	});
});
