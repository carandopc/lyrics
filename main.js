const SPOTIFY_CLIENT_ID = "816a4aad8c8642ad955491880356a7d2";
const GENIUS_TOKEN = "EsRBIYmtHrceiEBfHtRfjr6hxL2GeKCSnv6Jv-lpUsGGoaLG5ZToNkoCLdKQkRou";

const LOCATION = window.location.protocol + "//" + window.location.host + window.location.pathname;
const REDIRECT_CALLBACK = LOCATION + "?mode=callback";

window.onload = () => {
	var url = new URL(window.location);
	var mode = url.searchParams.get("mode");

	if (mode === "callback") {
    doCallback(url);
	} else {
    doAuthorize();
	}
}

doCallback = (url) => {
  var hash = window.location.hash;

  if (hash) {
    var token = getAccessToken(hash);
    getPlaying(token);
    setInterval(() => getPlaying(token), 10000);
  } else {
    var error = url.searchParams.get("error")
    setLyrics(error);
  }
}

getAccessToken = (hash) => {
  var token = "";

  hash.substring(1).split("&").forEach(p => {
    if (p.indexOf("access_token") == 0) {
      token = p.substring(p.indexOf("=") + 1);
    }
  });

  return token;
}

doAuthorize = () => {
  var authorizeUrl = "https://accounts.spotify.com/authorize?";

  var params = encodeURI("client_id=" + SPOTIFY_CLIENT_ID +
    "&redirect_uri=" + REDIRECT_CALLBACK +
    "&response_type=token" +
    "&scope=user-read-currently-playing");

  window.location.replace(authorizeUrl + params);
}

setLyrics = (input) => {
  var lyrics = document.getElementById("lyrics");
  lyrics.innerHTML = input;
}

setLyricsHtml = (input) => {
  var lyrics = document.getElementById("lyrics");
  lyrics.innerHTML = "";
  lyrics.appendChild(input);
}

getPlaying = (token) => {
  var playingUrl = "https://api.spotify.com/v1/me/player/currently-playing";
  var accessToken = "Bearer "  + token;
  var options = {
    headers: {
			"Authorization": accessToken,
		}
  };

	fetch(playingUrl, options)
  .then(response => processPlaying(response))
  .catch(error => console.error(error));
}

processPlaying = (response) => {
  if (response.status == 200) {
    response.json()
    .then(response => checkTrack(response));
  } else if (response.status == 401) {
    doAuthorize();
  }			
}

checkTrack = (response) => {
  if (response.currently_playing_type == 'track') {
    var song = response.item.name;
    var artist = getArtists(response);
    // CALL GENIUS API
    getSong(song, artist);
  } else {
    // FOR NON SONGS
    setLyrics(response.currently_playing_type);
  }
}

getArtists = (response) => {
  var artist = "";

  response.item.artists.forEach(a => {
    artist += a.name + " ";
  });

  return artist;
}

getSong = (song, artist) => {
  var searchUrl = "https://api.genius.com/search?"; 
  var query = encodeURIComponent(song + " " + artist);
	var params = "q=" + query + 
		'&access_token=' + GENIUS_TOKEN;
		
	fetch(searchUrl + params)
	.then(response => response.json())
	.then(response => processSong(response))
	.catch(error => console.error(error));
}

processSong = (response) => {
  var hit;

  response.response.hits.forEach(h => {
    var artist = h.result.primary_artist.name.toLowerCase();
    var indexOfArtist = artist.toLowerCase().indexOf(artist) 
    
    if (hit == null && indexOfArtist > -1) {
      hit = h;
    }
  });
  
  if (hit != null) {
    getLyrics(hit);
  } else {
    setLyrics(hit);
  }
}

getLyrics = (hit) => {
  var lyricsUrl = "https://genius.com/songs/" + hit.result.id + "/embed.js";
  
  fetch(lyricsUrl)
	.then(response => response.text())
	.then(response => processLyrics(response, hit))
	.catch(error => console.error(error));
}

processLyrics = (response, hit) => {
  var start = response.indexOf("JSON.parse") + 12;
  var end = response.lastIndexOf("document.write") - 6;
  var raw = response.substring(start, end);

  var cleaned = raw
    .replace(/\\"/g, "\"")
    .replace(/\\\\n/g, "\\n")
    .replace(/\\\\"/g, "\\\"")
    .replace(/\\'/g, "\'")
    .replace(/<a /g, "<span ")
    .replace(/<\/a>/g, "</span>");

  var tempHtml = document.createElement('html');
  tempHtml.innerHTML = JSON.parse(cleaned);

  var lyrics = tempHtml.getElementsByClassName("rg_embed_body")[0];
  setLyricsHtml(lyrics);  

  setCover(hit);
  setTitle(hit);
}

setCover = (hit) => {
  var imageUrl = hit.result.header_image_url;
  var cover = document.getElementById("cover");
  cover.src = imageUrl;
}

setTitle = (hit) => {
  var fullTitle = hit.result.full_title;
  var title = document.getElementById("title");
  title.innerHTML = fullTitle;
}