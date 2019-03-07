const SPOTIFY_CLIENT_ID = '816a4aad8c8642ad955491880356a7d2';
const GENIUS_TOKEN = 'EsRBIYmtHrceiEBfHtRfjr6hxL2GeKCSnv6Jv-lpUsGGoaLG5ZToNkoCLdKQkRou';

const LOCATION = window.location.protocol + '//' + window.location.host + window.location.pathname;

const REDIRECT_CALLBACK = LOCATION + '?mode=callback';
const REDIRECT_LOGIN =  LOCATION + '?mode=logged_in';

window.onload = () => {
	var url = new URL(window.location);
	var mode = url.searchParams.get('mode');

	if (mode == 'callback') {
		var hash = window.location.hash;

		if (hash) {
			var access_token = '';

			hash.substring(1).split('&').forEach(p => {
				if (p.indexOf('access_token') == 0) {
					access_token = p.substring(p.indexOf('=') + 1);
				}
			});

			getPlaying(access_token);
			setInterval(() => getPlaying(access_token), 10000);
		} else {
			document.getElementById('lyrics').innerHTML = url.searchParams.get('error');
		}
	} else {
		var params = encodeURI('client_id=' + SPOTIFY_CLIENT_ID +
			'&response_type=token' +
			'&redirect_uri=' + REDIRECT_CALLBACK +
			'&scope=user-read-currently-playing');

		window.location.replace('https://accounts.spotify.com/authorize?' + params);
	}
}

function getPlaying(access_token) {
	fetch('https://api.spotify.com/v1/me/player/currently-playing', {
		method: 'GET', 
		headers: {
			'Authorization': 'Bearer ' + access_token,
		},
	})
	.then(response => {
		if (response.status == 200) {
			response.json()
			.then(response => {
				if (response.currently_playing_type == 'track') {
					var song = response.item.name;
					var artist = '';
	
					response.item.artists.forEach(a => {
						artist += a.name + ' ';
					});

					getSong(song, artist);
				} else {
					document.getElementById('lyrics').innerHTML = response.currently_playing_type;
				}
			});
		} else {
			window.location.replace(LOCATION);
		}					
	})
	.catch(error => console.error(error));
}

function getSong(song, artist) {
	var params = 'q=' + encodeURIComponent(song + ' ' + artist) + 
		'&access_token=' + GENIUS_TOKEN;
		
	fetch('https://api.genius.com/search?' + params)
	.then(response => response.json())
	.then(response => {
		var hit;

		response.response.hits.forEach(h => {
			if (hit == null && artist.toLowerCase().indexOf(h.result.primary_artist.name.toLowerCase()) > -1) {
				hit = h;
			}
		});
		
		if (hit != null) {
			getLyrics(hit);
		} else {
			document.getElementById('lyrics').innerHTML = hit;
		}
	})
	.catch(error => console.error(error));
}

function getLyrics(hit) {
	fetch('https://genius.com/songs/' + hit.result.id + '/embed.js')
	.then(response => response.text())
	.then(response => {
		var substring = response.substring(response.indexOf('JSON.parse') + 12, response.lastIndexOf('document.write') - 6);

		var replace = substring
			.replace(/\\"/g, '"')
			.replace(/\\\\n/g, '\\n')
			.replace(/\\\\"/g, '\\"')
			.replace(/\\'/g, '\'')
			.replace(/<a /g, '<span ')
			.replace(/<\/a>/g, '</span>');

		var tempHtml = document.createElement('html');
		tempHtml.innerHTML = JSON.parse(replace);

		document.getElementById('background').style.backgroundImage = "url(" + hit.result.header_image_url + ")";

		var title = document.createElement('div');
		title.innerHTML = hit.result.full_title;

		var lyrics = document.getElementById('lyrics');
		lyrics.innerHTML = '';
		lyrics.appendChild(title);
		lyrics.appendChild(tempHtml.getElementsByClassName('rg_embed_body')[0]);
	})
	.catch(error => console.error(error));
}