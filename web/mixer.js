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
	const sliderValue = parseFloat(this.value);

	this.parentNode.style.setProperty('--value', (sliderValue * 100) + "%");

	if(!ws)
	{
		return;
	}

	let send = {
		aux: parseInt(auxSelect.options[auxSelect.selectedIndex].dataset.channel),
		channel: parseInt(this.dataset.channel)
	};

	let parameter = "level";
	if(this.classList.contains("panInput"))
	{
		parameter = "pan";
	}
	send[parameter] = sliderValue;

	ws.send(JSON.stringify(send));
}

/**
 * Request current AUX values from server
 */
function requestValues()
{
	ws.send(JSON.stringify({
		"aux?": auxSelect.options[auxSelect.selectedIndex].dataset.channel
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
	if(json.config)
	{
		buildAux(json.config.aux);
		buildChannels(json.config.channels);
		return;
	}

	//If the message is the response of a request for the current aux levels
	if(json["aux?"] &&  json["aux?"] == auxSelect.options[auxSelect.selectedIndex].dataset.channel)
	{
		for(let slider of document.getElementsByClassName("volumeInput"))
		{
			slider.value = json.channels[slider.dataset.channel].level;
			slider.parentNode.style.setProperty('--value', (slider.value * 100) + "%");
		}

		for(let slider of document.getElementsByClassName("panInput"))
		{
			slider.value = json.channels[slider.dataset.channel].pan;
			slider.parentNode.style.setProperty('--value', (slider.value * 100) + "%");
		}

		let checkedFavourites = localStorage.getItem("aux" + auxSelect.value  + "fav");
		if(checkedFavourites)
		{
			checkedFavourites = checkedFavourites.split(",");
		}
		else
		{
			checkedFavourites = [];
		}

		//restore whether or not favourites checkbox was ticked previously
		favourites.checked = localStorage.getItem("aux" + auxSelect.value  + "favChecked") == "true";

		//restore previously favourited channels
		for(let fav of document.querySelectorAll('input[name="fav[]"]'))
		{
			fav.checked = checkedFavourites.indexOf(fav.value) != -1;
		}

		//make sure channel visibility is correct
		favourites.dispatchEvent(new Event("change"));

		return;
	}

	if(json.name != undefined)
	{
		for(let slider of document.querySelectorAll('input[data-channel="' + json.channel + '"]'))
		{
			slider.previousElementSibling.innerHTML = json.name;
		}
	}

	if(json.auxname != undefined)
	{
		//update the select
		for(let option of auxSelect.options)
		{
			if(option.value == json.channel)
			{
				option.innerHTML = json.auxname;

				//make sure the aux span is correct
				auxSelect.previousElementSibling.innerHTML = auxSelect.getElementsByTagName("option")[auxSelect.selectedIndex].text;
			}
		}

		//update the buttons
		for(let button of auxiliaries.getElementsByTagName("button"))
		{
			if(button.value == json.channel)
			{
				button.innerText = json.auxname;
				return; //no need to update sliders if a button was changed
			}
		}
	}

	//update level and pan sliders if the current aux is visible
	if(json.aux == auxSelect.options[auxSelect.selectedIndex].dataset.channel)
	{
		if(json.level != undefined)
		{
			for(let slider of document.querySelectorAll('input[data-channel="' + json.channel + '"].volumeInput'))
			{
				slider.value = json.level;
				slider.parentNode.style.setProperty('--value', (slider.value * 100) + "%");
			}
			return;
		}

		if(json.pan != undefined)
		{
			for(let slider of document.querySelectorAll('input[data-channel="' + json.channel + '"].panInput'))
			{
				slider.value = json.pan;
				slider.parentNode.style.setProperty('--value', (slider.value * 100) + "%");
			}
			return;
		}
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
		selectHTML += '<option value="' + option.channel + '" data-channel="' + option.channel + '" data-colour="' + option.colour + '" data-stereo="' + option.stereo + '">' + option.label + '</option>';

		let button = document.createElement("button");
		button.value = option.channel;
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
function auxMouseDown(e)
{
	e.preventDefault();
	e.stopImmediatePropagation();
	document.body.classList.add("auxPicker");
}
auxSelect.addEventListener("mousedown", auxMouseDown);

/**
 * Select the Aux when a button is tapped
 * @param MouseEvent e - the mouse event
 */
function auxPickerClick(e)
{
	if(e.target.nodeName == "BUTTON")
	{
		auxSelect.value = e.target.value;
		auxSelect.dispatchEvent(new Event("change"));
		document.body.classList.remove("auxPicker");
	}
}
auxiliaries.addEventListener("click", auxPickerClick);

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
 - Pan sliders will be set to 0
 - Volume sliders will be set to 0
 * @param Event e - The Tap or Click Event
 */
function resetSlider(e)
{
	e.target.value = 0;
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
		html += '<label class="volume"><span>' + channel.label + '</span><input type="range" data-channel="' + channel.channel + '" class="volumeInput" step="0.01" min="0" max="1" value="0" /></label>';
		html += '<label class="pan"><span>' + channel.label + '</span><input type="range" data-channel="' + channel.channel + '" class="panInput" step="0.01" min="-1" max="1" value="0" /></label>';
		html += '<label class="favourite starCheckbox"><input type="checkbox" name="fav[]" value="' + channel.channel + '" title="Mark as Favourite" /></label>';
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

		//set the current aux text
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

		//disable panning if it was previously selected
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
