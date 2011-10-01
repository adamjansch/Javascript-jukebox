// Negative song queue codes
// ===========================
/*	
	-1 no songs remain in queue
	-2 5 minute break
	-3 10 minute break
*/


// Global variables
// ===========================
var songPlaying = false;			// Song playing flag
var songFiles = new Array();		// The song files grabbed by the <input> system
var songList = new Array();			// The details of all the songs loaded
var songQueue = new Array();		// Indexes of songList showing the order of tunes to be played
var songPlays = new Array();		// Keeps track of how many times songs have been played in the current session
var tags;

var mainTimer;						// Main timer reference
var jukeboxActive = null;			// Jukebox activation flag (undefined so as to trigger action on first change)
var startTime;						// Jukebox start time
var endTime;						// Jukebox end time

var Shadowbox = window.parent.Shadowbox;	// Set Shadowbox variable to allow for programmatic window closure

var breakRegularity = 0;			// The regularity of breaks, set in minutes. 0 means no breaks
var breakTimer;						// Reference for the break timer
var randomSongMinutes = 0;			// The number of minutes of inactivity before a song is played at random
var randomSongTimer;				// Reference for the random song timer


// Functions
// =================================================================
// Handler for change of window size
function viewportResize()
{
	var songListTitlebarElement = document.getElementById("song-list-titlebar");
	var currentSongElement = document.getElementById("current-song");
	var currentQueueTitlebarElement = document.getElementById("current-queue-titlebar");
	
	document.getElementById("song-list").style.height = (window.innerHeight - songListTitlebarElement.offsetHeight) + "px";
	document.getElementById("current-queue-list").style.height = (window.innerHeight - currentQueueTitlebarElement.offsetHeight - currentSongElement.offsetHeight - 1) + "px";
}


// Load the selected files into the song list
function loadFileList(evt)
{
	// Retrieved FileList object
	songFiles = evt.target.files;
	
	var j = 0;
	var songFilename;
	
	(function() {
		if(j < songFiles.length)
		{
			songFilename = "audio/" + songFiles[j].name;
			
			ID3.loadTags(songFilename, function() {
			    tags = ID3.getAllTags(songFilename);
			    
			    var singleSongObject = {
					"song":
					{
						"title": tags.title,
						"album": tags.album,
						"artist": tags.artist,
						"duration": tags.TLEN.data,
						"picture": tags.picture
					}
				};
				
				songList.push(singleSongObject);	// Add song to songList array
				songPlays.push(0);					// Add element to songPlays array (will be accumulated during use)
			}, {tags: ["title", "album", "artist", "TLEN", "picture"]});
		
			setTimeout(arguments.callee, 1000);
			
			j++;
			
			var songsToLoad = songFiles.length - j;
			var songsLoadingText = '<div id="song-loading">';
			songsLoadingText += '<p>' + ((breakRegularity > 0) ? ('Breaks set for ' + breakRegularity + ' minute intervals') : "Break regularity not specified, breaks disabled") + '</p>';
			songsLoadingText += '<p>' + ((randomSongMinutes > 0) ? ('Random song timer set to ' + randomSongMinutes + ' minutes') : "Random play duration not specified, random song playback disabled") + '</p>';
			songsLoadingText += '<p>Loading song data. Songs remaining: ' + songsToLoad + "</p>";
			songsLoadingText += "</div>";
			
			document.getElementById("song-list").innerHTML = songsLoadingText;
		}
		else if(j == songFiles.length)
		{
			// Print list of file array contents
			var list = "";
			
			for(var i = 0; i < songList.length; i++)
			{
				var alt = "";
				var currentSong = songList[i].song;
				
				if(i % 2)
					alt = ' class="sl-alt"';
				
				list += '<article' + alt + '>\n';
				list += '<img class="artwork" id="artwork-' + i + '" src="images/no-artwork.png" width="35%" />';
				list += '<div class="song-text">';
				list += '<p class="title">' + ((currentSong.title !== undefined) ? currentSong.title : '<span class="load-error">&lt;no title data&gt;</span>') + "</p>\n";
				list += '<p class="artist">' + ((currentSong.artist !== undefined) ? currentSong.artist : '<span class="load-error">&lt;no artist data&gt;</span>') + "</p>\n";
				list += '<p class="duration">' + ((currentSong.duration !== undefined) ? ms2minsec(currentSong.duration) : '<span class="load-error">&lt;duration data load failed&gt;</span>') + "</p>\n";
				list += '<p class="add-link" id="add-link-' + i + '" onclick="addSongToQueue(' + i + ');">add +</p>';
				list += '</div>';
				list += "</article>\n\n";
			}
			
			// HTML must be written before images can be placed
			document.getElementById("song-list").innerHTML = list;
			
			// This for loop goes back through the songList, placing images if it finds them
			for(var i = 0; i < songList.length; i++)
			{
				var currentSong = songList[i].song;
				var artworkID = document.getElementById("artwork-" + i);
				
				artworkID.style.display = "inline";
				
				if(currentSong.picture)
				    artworkID.src = "data:" + currentSong.picture.format + ";base64," + Base64.encodeBytes(currentSong.picture.data);
				else
					artworkID.src = "images/no-artwork.png";
			}
			
			viewportResize();
		}
	})();
	
	// Start main timer (set to run every second)
	checkJukeboxActivationWindow();
}


// Add a song to the end of queue (invoked on clicking a song's add link in the song list)
function addSongToQueue(index)
{
	// Change the tune's add link to an 'in queue' link
	var addLinkID = document.getElementById("add-link-" + index);
	addLinkID.onclick = "";
	addLinkID.className = "non-add-link";
	addLinkID.innerHTML = "in queue";
	
	songQueue.push(index);				// Add song index to end of queue
	updateSongQueueDisplay();			// Refresh the song queue display
		
	if(!songPlaying)
		playNextSongInQueue();			// Start the queue if it has stopped
	
	// If the queue is already playing then the next tune will be handled by the onfinish: function
}


// Remove a song from the queue (invoked by clicking a song's remove link in the queue)
function removeSongFromQueue(index)
{
	inQueueLinkToAddLink(songQueue[index]);		// Change the tune's in queue link to an add link
	songQueue.splice(index, 1);					// Remove item from array
	updateSongQueueDisplay();					// Refresh the song queue display
}


// Update the contents of the current song pane
function updateCurrentSongDisplay(songIndex)
{
	var details = "";
	
	if(songIndex >= 0)
	{
		var currentSong = songList[songIndex].song;
		
		// What to do if passed a song index
		details += '<img class="artwork" id="current-song-artwork" src="images/no-artwork.png" width="70%" />';
		details += '<div id="current-song-text">';
		details += '<p id="title"><span class="label">' + currentSong.title + "</span></p>\n";
		details += '<p id="artist"><span class="label">' + currentSong.artist + "</span></p>\n";
		details += '<p id="duration"><span class="label">' + ms2minsec(currentSong.duration) + "</span></p>\n";
		details += '</div>';
		
		// Replace HTML in id="current-song-details"
		document.getElementById("current-song-details").innerHTML = details;
		
		var artworkID = document.getElementById("current-song-artwork");	
		artworkID.style.display = "inline";
				
		if(currentSong.picture)
		    artworkID.src = "data:" + currentSong.picture.format + ";base64," + Base64.encodeBytes(currentSong.picture.data);
		else
			artworkID.src = "images/no-artwork.png";
	}
	else
	{
		if(songIndex == -1)
		{
			// -1 means that there is no song playing, so update with a default message
			details += '<p><img src="images/wink.png" alt="winking face" id="current-song-artwork" /></p>';			
			details += '<p>Add a song from the<br /> song list to play</p>';
			
			// Replace HTML in id="current-song-details"
			document.getElementById("current-song-details").innerHTML = details;
		}
		else if(songIndex == -2)
		{
			// -2 relates to a 5 minute break, so update with relevant message
			details += '<p><img src="images/rest.png" alt="resting face" id="current-song-artwork" /></p>';			
			details += '<p>Five minute break in progress</p>';
			
			// Replace HTML in id="current-song-details"
			document.getElementById("current-song-details").innerHTML = details;
		}
	}
	
	// Reset the height of the current queue list
	viewportResize();
}


// Update the song queue display
function updateSongQueueDisplay()
{
	var list = "";
	
	// Run through songQueue generating a <p> line for each element
	for(var i = 0; i < songQueue.length; i++)
	{
		// If songQueue index relates to a song in the song list...
		if(songQueue[i] >= 0)
		{
			var currentSong = songList[songQueue[i]].song;
			
			list += '<article>\n';
			list += '<p class="queue-number">' + (i + 1) + '<p/>\n';
			list += '<p class="title-artist"><span class="artist">' + currentSong.artist + '</span> ' + currentSong.title + '</p>';
			list += '<p class="duration">' + ms2minsec(currentSong.duration) + "</p>\n";
			list += '<p class="remove-link" onclick="removeSongFromQueue(' + i + ')">remove -</p>\n';
			
			list += "</article>\n";
		}
		else if(songQueue[i] == -2)		// -2 is the five min break code
		{
			list += '<article>\n';
			list += '<p class="queue-number">' + (i + 1) + '<p/>\n';
			list += '<p class="title">break <span class="artist">-_- zzz...</span></p>';
			list += '<p class="duration">5:00</p>';
			list += "</article>\n";
		}
	}
	
	// Replace HTML in id="current-queue-list"
	document.getElementById("current-queue-list").innerHTML = list;
}


// Play next song in the queue
function playNextSongInQueue()
{
	// Get the first element of the songQueue array
	var nextSongIndexInQueue = songQueue.shift();
	
	if(nextSongIndexInQueue >= 0)
	{
		// Start playback from the queue
		var jukeboxTune = soundManager.createSound({
			id: 'currentTune',
			url: 'audio/' + songFiles[nextSongIndexInQueue].name,
			onfinish: function() {
				this.destruct();						// Destroy this sound on finish
				songFinish(nextSongIndexInQueue);		// Run the songFinish() function, to decide what to do next
			}
		});
		
		//console.log('Previous play count: ' + songPlays[nextSongIndexInQueue]);
		songPlays[nextSongIndexInQueue]++;	// Increment the song play value of this song index
		
		//console.log('Random song play timer cancelled');
		clearTimeout(randomSongTimer);		// Cancel the random song timer
	}
	else
	{
		if(nextSongIndexInQueue == -2)
		{
			// Start playback of five minute break mp3
			var jukeboxTune = soundManager.createSound({
				id: 'currentTune',
				url: 'break/break-5.mp3',
				onfinish: function() {
					this.destruct();						// Destroy this sound on finish
					songFinish(nextSongIndexInQueue);		// Run the songFinish() function, to decide what to do next
				}
			});
		}
	}

	jukeboxTune.play();			// The jukebox running!
	
	songPlaying = true;									// Set songPlaying flag
	updateCurrentSongDisplay(nextSongIndexInQueue);		// Refresh the contents of the current song pane
	updateSongQueueDisplay();							// Refresh the song queue display
	
	return nextSongIndexInQueue;
}


// Handler for song finish
function songFinish(index)
{
	if(index >= 0)
	{
		inQueueLinkToAddLink(index);		// Change the tune's in queue link to an add link
	}
	else
	{			
		// Set break to add in <breakRegularity> minutes
		if(index == -2 && breakRegularity > 0)
		{
			//console.log('Break function set');
			breakTimer = setTimeout("addBreakToQueueStart()", (breakRegularity * 60000));
		}
	}
	
	
	// Check to see if there are any songs left in the queue
	if(songQueue.length != 0)
	{
		// If there are then play the next one
		playNextSongInQueue();
	}
	else
	{
		// Otherwise switch the song play flag to false
		songPlaying = false;
		updateCurrentSongDisplay(-1);
		
		// Re-set the random song timer
		if(randomSongMinutes > 0)
		{
			//console.log('Random song timer set');
			randomSongTimer = setTimeout("playRandomSong()", (randomSongMinutes * 60000));
		}
	}
}


// Millisecond to mm:ss converter
function ms2minsec(milliseconds)
{
	var seconds = milliseconds / 1000;
	var seconds_sixty = parseInt(seconds % 60);
	
	// Return time in the format (m)m:ss (seconds leading zero included)
	return parseInt(seconds / 60) + ":" + ((seconds_sixty < 10) ? ("0" + seconds_sixty) : seconds_sixty);
}


// Change the tune's in queue link to an add link
function inQueueLinkToAddLink(index)
{
	if(index >= 0)
	{
		// Change the tune's in queue link to an add link
		var addLinkID = document.getElementById("add-link-" + index);
		addLinkID.onclick = function() {addSongToQueue(index)};
		addLinkID.className = "add-link";
		addLinkID.innerHTML = "add +";
	}
	else
	{
		// Otherwise cycle through them all!
		for(var i = 0; i < songList.length; i++)
		{
			var addLinkID = document.getElementById("add-link-" + i);
			addLinkID.onclick = function() {addSongToQueue(i)};
			addLinkID.className = "add-link";
			addLinkID.innerHTML = "add +";
		}
	}
}



// JUKEBOX ACTIVATION/DEACTIVATION FUNCTIONS
// ---------------------------------------------------------------------------------------------
// Get time value for jukebox activation (runs in the background)
function checkJukeboxActivationWindow()
{
	// If either start or end time have not been entered just set the jukebox to be always active
	if(startTime == undefined || endTime == undefined)
	{
		jukeboxActive = true;
		
		//console.log('Start or end time not supplied: jukebox activated permanently');
		
		// Set break
		if(breakRegularity > 0)
			breakTimer = setTimeout("addBreakToQueueStart()", (breakRegularity * 60000));
		
		// Set random song timer
		if(randomSongMinutes > 0)
			randomSongTimer = setTimeout("playRandomSong()", (randomSongMinutes * 60000));
	}
	else
	{
		// Otherwise set up the activation window, checking it every second
		
		var currentDate = new Date();
		currentDate.setUTCSeconds(0);
		currentDate.setUTCMilliseconds(0);
		
		var newStartTime = new Date(startTime);
		newStartTime.setUTCMinutes(newStartTime.getUTCMinutes() - 1);
				
		// Test currentTime against time boundary, fire activation/deactivation functions on change
		if(currentDate >= startTime && currentDate < endTime)
		{
			if(jukeboxActive === false)
			{
				jukeboxActive = true;
				//console.log('Jukebox activated!');
				
				// Activation function
				Shadowbox.close();
				
				// Set break
				if(breakRegularity > 0)
					breakTimer = setTimeout("addBreakToQueueStart()", (breakRegularity * 60000));

				// Set random song timer
				if(randomSongMinutes > 0)
					randomSongTimer = setTimeout("playRandomSong()", (randomSongMinutes * 60000));
			}
			
			// Do nothing if the jukebox is already active
		}
		else
		{	
			// If the jukebox is moving from activation to deactivation
			if(jukeboxActive === true || jukeboxActive === null)
			{
				if(songPlaying)
				{
					var currentTune = soundManager.getSoundById('currentTune');
					
					currentTune.stop();
					currentTune.destruct();
				
					inQueueLinkToAddLink(-1);		// Update add links en masse (as I can't be bothered to figure out how to do it selectively)
					songPlaying = false;
					updateCurrentSongDisplay(-1);
				}
				
				// Go through remaining jukebox deactivation tasks
				jukeboxActive = false;
				clearTimeout(breakTimer);		// Clear break timer
				clearTimeout(randomSongTimer);	// Clear random play timer
				songQueue.length = 0;			// Empty song queue array
				updateSongQueueDisplay();		// Refresh the song queue display
				//console.log('Jukebox deactivated!');
				
				// Open box over page to deactivate controls
				Shadowbox.open({
			        content:    '<div id="sb-deactivated-msg"></div>',
			        player:     "html",
			        title:      "",
			        height:     400,
			        width:      800,
			        options:	{ 	
			        				modal: true,
			        				enableKeys: false,
			        				overlayOpacity: 0.9
			        			}
			    });
			    
			    // Zero songPlays array for next session
			    for(var i = 0; i < songPlays.length; i++)
			    {
			    	songPlays[i] = 0;
			    }
			}
			else
			{
				// Run countdown timer for shadowbox
				if(document.getElementById('sb-deactivated-msg') != null)
				{
					var countdownText = "";
					var timeDifference = new Date();
					timeDifference.setTime(startTime - currentDate);
					
					if(timeDifference.getUTCHours() < 2)
						countdownText = '<p>This jukebox will activate in</p><p id="countdown">' + getCountdownTimerText(timeDifference) + '</p>';
					else if(timeDifference.getUTCHours() < 6)
						countdownText = '<p>This jukebox will activate at</p><p id="countdown">' + addLeadingZero(startTime.getUTCHours()) + ":" + addLeadingZero(startTime.getUTCMinutes()) + '</p>';
					else
						countdownText = '<p>This jukebox has finished its timed cycle and has been deactivated</p>';
						
					document.getElementById("sb-deactivated-msg").innerHTML = countdownText;
				}
			}
		}
		
		// Continue timing
		mainTimer = setTimeout("checkJukeboxActivationWindow()", 1000);
	}
}


// Convert boundary times to array: hour, minute
function convertTimeToArray(time)
{
	// This code is from the jquery Calendrical time text parser
	var match = match = /(\d+)\s*[:\-\.,]\s*(\d+)\s*(am|pm)?/i.exec(time);
        
    if(match && match.length >= 3)
    {
        var hour = Number(match[1]);
        var minute = Number(match[2]);
        
        if(hour == 12 && match[3])
        	hour -= 12;
        	
        if(match[3] && match[3].toLowerCase() == 'pm')
        	hour += 12;
        
        return {
			hour:   hour,
			minute: minute
		};
    }
    else
        return null;
}


// Set the global start time variable
function setStartTime()
{
	if(document.getElementById("time_start").value != null)
	{
		var startTimeArray = convertTimeToArray(document.getElementById("time_start").value);
		
		startTime = new Date();
		startTime.setUTCHours(startTimeArray.hour);
		startTime.setUTCMinutes(startTimeArray.minute);
		startTime.setUTCSeconds(0);
		startTime.setUTCMilliseconds(0);
	}
}


// Set the global end time variable
function setEndTime()
{
	if(document.getElementById("time_end").value != null)
	{
		var endTimeArray = convertTimeToArray(document.getElementById("time_end").value);
		
		endTime = new Date();
		endTime.setUTCHours(endTimeArray.hour);
		endTime.setUTCMinutes(endTimeArray.minute);
		endTime.setUTCSeconds(0);
		endTime.setUTCMilliseconds(0);
	}
}


// Countdown timer formatting
function getCountdownTimerText(timeDifference)
{
	var formattedTime = '';
	
	// Display hours, set correct label, don't add if 0
	if(timeDifference.getUTCHours() > 1)
		formattedTime += timeDifference.getUTCHours() + " hours";
	else if(timeDifference.getUTCHours() == 1)
		formattedTime += timeDifference.getUTCHours() + " hour";
	
	
	// Add separating comma if required
	formattedTime += (timeDifference.getUTCMinutes() != 0 && timeDifference.getUTCHours() > 0) ? ", " : "";
	
	
	// Display minutes, set correct label, don't add if 0
	if(timeDifference.getUTCMinutes() > 1)
		formattedTime += timeDifference.getUTCMinutes() + " minutes";
	else if(timeDifference.getUTCMinutes() == 1)
		formattedTime += timeDifference.getUTCMinutes() + " minute";
	
	return formattedTime;
}


// Add leading zero to necessary numbers (for time)
function addLeadingZero(numberValue)
{
	if(numberValue < 10)
		return "0" + numberValue;
	else
		return numberValue;
}


// JUKEBOX BREAK FUNCTIONS
// ---------------------------------------------------------------------------------------------
// Set break regularity variable
function setBreakRegularity()
{
	if(document.getElementById("break-period").value != '')
		breakRegularity = document.getElementById("break-period").value;
	else
		breakRegularity = 0;
		
	//console.log("breakRegularity: " + breakRegularity);
}


function addBreakToQueueStart(duration)
{
	//console.log('Break added');
	
	var breakCode = -2;		// Default breakCode to -2 (5 min)
	
	if(duration == 10)
		breakCode = -3;
		
	songQueue.unshift(breakCode);		// Add break code to end of queue
	
	if(!songPlaying)
		playNextSongInQueue();			// Start the queue if it has stopped
	else
		updateSongQueueDisplay();		// Refresh the song queue display (no need if queue empty)
}


// JUKEBOX RANDOM SONG FUNCTIONS
// ---------------------------------------------------------------------------------------------
// Set random song time variable
function setRandomSongTime()
{
	if(document.getElementById("random-song-time").value !== '')
		randomSongMinutes = document.getElementById("random-song-time").value;
	else
		randomSongMinutes = 0;
	
	//console.log("randomSongMinutes: " + randomSongMinutes);
}

// Select a random song to play
function playRandomSong()
{
	var lowestSongPlays = 999;
	var lowestSongPlaysArray = new Array();
	var randomSongIndex;
	
	// Iterate through song plays array, find lowest value in elements - this must be run before collection
	for(var i = 0; i < songPlays.length; i++)
	{
		if(songPlays[i] < lowestSongPlays)
			lowestSongPlays = songPlays[i];
	}
	
	// Now run through and collect all of the lowest value song play array elements together
	for(var k = 0; k < songPlays.length; k++)
	{
		if(songPlays[k] == lowestSongPlays)
			lowestSongPlaysArray.push(k);
	}
	
	if(lowestSongPlaysArray.length > 1)
		randomSongIndex = lowestSongPlaysArray[Math.floor(Math.random() * lowestSongPlaysArray.length)]; 	// Generate random index for lowest song plays array, to get index for random song selection
	else
		randomSongIndex = lowestSongPlaysArray[0];
			
	addSongToQueue(randomSongIndex);
	
	return randomSongIndex;
}