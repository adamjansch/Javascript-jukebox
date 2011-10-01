Javascript jukebox
==================

**Javascript jukebox** is a mouse-driven, browser-based music player designed using HTML5 and Javascript. It was created specifically for Adam Jansch's sound art performance *[Human jukebox x n](http://adamjansch.co.uk/works/human-jukebox-x-n/)*, and features functionality more associated with classic hardware jukeboxes. To see Javascript jukebox in action take a look at the [Human jukebox x n premiere video](http://www.vimeo.com/24568191).

Here is a summary of the functionality of the Javascript jukebox:

* Triple-view UI: the UI shows a list of available tracks, the currently programmed playlist, and the currently playing track.
* Classic jukebox playback: tracks selected to play are added to a playlist which runs automatically, and only stops when the playlist is emptied. Tracks are played back in the order they are selected.
* Random song selection: if no tracks have been programmed for a specified period a lesser-played track will be selected automatically and added to the playlist. This functionality is optional, and the period definable.
* Selectable activation: the jukebox can optionally be set to activate and deactivate at specified times.


Installation
------------

Javascript jukebox is designed for local browser use, so its files can be installed on your local web server. It has been tested on Chrome and Firefox, and relies on a number of third party Javascript libraries. These should be downloaded and installed into the `scripts` folder in the following structure:

* [aadsm](https://github.com/aadsm/JavaScript-ID3-Reader) - install `id3-minimized.js` into `scripts`
* [jquery](http://jquery.com/) - install JQuery file into `scripts`, update relevant `<script>` tag in `index.html` to JQuery file name
* [jquery-calendrical](http://plugins.jquery.com/project/calendrical) - install contents into `scripts`
* [shadowbox-3.0.3](http://www.shadowbox-js.com/) - download version 3.0.3,  install contents into `scripts`
* [soundmanager](https://github.com/scottschiller/SoundManager2) - install `soundmanager2.js` into `scripts`, and contents of `swf` folder into `swf`


Other preparation
-----------------

Javascript jukebox was tested with MP3 audio files. Any tunes you would like to have loaded should be copied into a folder named 'audio', located in the main directory of Javascript jukebox.

For the correct metadata to be displayed your MP3s will need a valid 'TLEN' (track length) tag (iTunes doesn't add a TLEN tag to its MP3s, and other applications do not put a valid value in the tag). To add or edit MP3 tags I would recommend [Kid3 for Mac OS X](http://kid3.sourceforge.net/). TLEN is measured in milliseconds.


Setting up Javascript jukebox
-----------------------------

 1 Load Javascript jukebox in your browser
 2 Select audio directory
 3 Set optional functions - leave boxes empty to disable
 4 Load audio


Known issues
------------

An issue with activation/deactivation times relating to summer time adjustments has yet to be resolved.


License
-------

Javascript jukebox is released under a New BSD license.