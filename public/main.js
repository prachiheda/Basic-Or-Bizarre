(function () {
  function generateRandomString(length) {
    let text = '';
    const possible =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  async function generateCodeChallenge(codeVerifier) {
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(codeVerifier),
    );

    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  function generateUrlWithSearchParams(url, params) {
    const urlObject = new URL(url);
    urlObject.search = new URLSearchParams(params).toString();

    return urlObject.toString();
  }

  function redirectToSpotifyAuthorizeEndpoint() {
    const codeVerifier = generateRandomString(64);

    generateCodeChallenge(codeVerifier).then((code_challenge) => {
      window.localStorage.setItem('code_verifier', codeVerifier);

      // Redirect to example:
      // GET https://accounts.spotify.com/authorize?response_type=code&client_id=77e602fc63fa4b96acff255ed33428d3&redirect_uri=http%3A%2F%2Flocalhost&scope=user-follow-modify&state=e21392da45dbf4&code_challenge=KADwyz1X~HIdcAG20lnXitK6k51xBP4pEMEZHmCneHD1JhrcHjE1P3yU_NjhBz4TdhV6acGo16PCd10xLwMJJ4uCutQZHw&code_challenge_method=S256

      window.location = generateUrlWithSearchParams(
        'https://accounts.spotify.com/authorize',
        {
          response_type: 'code',
          client_id,
          scope: 'user-read-private user-read-email',
          code_challenge_method: 'S256',
          code_challenge,
          redirect_uri,
        },
      );

      // If the user accepts spotify will come back to your application with the code in the response query string
      // Example: http://127.0.0.1:8080/?code=NApCCg..BkWtQ&state=profile%2Factivity
    });
  }

  function exchangeToken(code) {
    const code_verifier = localStorage.getItem('code_verifier');

    fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: new URLSearchParams({
        client_id,
        grant_type: 'authorization_code',
        code,
        redirect_uri,
        code_verifier,
      }),
    })
      .then(addThrowErrorToFetch)
      .then((data) => {
        processTokenResponse(data);

        // clear search query params in the url
        window.history.replaceState({}, document.title, '/');
      })
      .catch(handleError);
  }

  function refreshToken() {
    fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: new URLSearchParams({
        client_id,
        grant_type: 'refresh_token',
        refresh_token,
      }),
    })
      .then(addThrowErrorToFetch)
      .then(processTokenResponse)
      .catch(handleError);
  }

  function handleError(error) {
    console.error(error);
    // mainPlaceholder.innerHTML = errorTemplate({
    //   status: error.response.status,
    //   message: error.error.error_description,
    // });
  }

  async function addThrowErrorToFetch(response) {
    if (response.ok) {
      return response.json();
    } else {
      throw { response, error: await response.json() };
    }
  }

  function logout() {
    localStorage.clear();
    window.location.reload();
  }

  function processTokenResponse(data) {
    console.log(data);

    access_token = data.access_token;
    refresh_token = data.refresh_token;

    const t = new Date();
    expires_at = t.setSeconds(t.getSeconds() + data.expires_in);

    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('expires_at', expires_at);

    // oauthPlaceholder.innerHTML = oAuthTemplate({
    //   access_token,
    //   refresh_token,
    //   expires_at,
    // });

    // load data of logged in user
    getUserData();
    getPlaylistData()
    getPlaylistName();
    getPlaylistImage(); 
  }

  function getPlaylistData(url) {
    const playlistID = extractPlaylistId(url); 
    fetch(`https://api.spotify.com/v1/playlists/${playlistID}/tracks`, {
      headers: {
        Authorization: 'Bearer ' + access_token,
      },
    })
      .then(async (response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw await response.json();
        }
      })
      .then((data) => {
        console.log(data);
        console.log("hello")
        resultPlaceholder.innerHTML = PlaylistTemplate(data);
        localStorage.setItem('playlist_picture', data.images[0].url);
        console.log(data.images[0].url)
      })
      .catch((error) => {
        console.error(error);
        // mainPlaceholder.innerHTML = errorTemplate(error.error);
      });
  }

  function getPlaylistName(url) {
    const playlistID = extractPlaylistId(url); 
    fetch(`https://api.spotify.com/v1/playlists/${playlistID}`, {
      headers: {
        Authorization: 'Bearer ' + access_token,
      },
    })
      .then(async (response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw await response.json();
        }
      })
      .then((data) => {
        console.log(data.name);
        localStorage.setItem('playlist_name', data.name);
      })
      .catch((error) => {
        console.error(error);
        // mainPlaceholder.innerHTML = errorTemplate(error.error);
      });
  }



  function getUserData() {
    fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: 'Bearer ' + access_token,
      },
    })
      .then(async (response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw await response.json();
        }
      })
      .then((data) => {
        console.log(data);
        document.getElementById('login').style.display = 'none';
        document.getElementById('loggedin').style.display = 'unset';
        mainPlaceholder.innerHTML = userProfileTemplate(data);
      })
      .catch((error) => {
        console.error(error);
        // mainPlaceholder.innerHTML = errorTemplate(error.error);
      });
  }

  function convertSpotifyLink(link) {
  // Check if the input link is a valid Spotify playlist link
  const regex = /^https:\/\/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)\?si=([a-zA-Z0-9]+)$/;
  const match = link.match(regex);

  if (match) {
    // Extract the playlist ID
    const playlistId = match[1];
    
    // Create the converted link
    const convertedLink = `https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator`;

    return convertedLink;
  } else {
    // If the input link is not valid, return an error message
    return "Invalid Spotify playlist link";
  }
}

const statements = {
  100: [
    "Getting this score is pretty much impossible"
  ],
  90: [
    "You're on a musical journey that no one else has embarked on.",
    "You find music that's so obscure, even Shazam can't identify it.",
    "You're the reason they invented the 'skip' button.",
  ],
  80: [
    "You're on a musical journey that no one else has embarked on.",
    "You find music that's so obscure, even Shazam can't identify it."
  ],
  70: [
    "Your playlist is pretty niche, congratulations!",
    "Wow, look at your cool music taste!",
    "You put all your friends on the music you discover."
  ],
  60: [
    "Your playlist is pretty niche, but still has some hits",
    "You aren't like other listeners.",
    "You got some funky tracks in there, don't you?"
  ],
  50: [
    "Your music taste is like a buffet: a little bit of everything.",
    "Your playlist is the 'safe zone' for group road trips."
  ],
  40: [
    "You're the proud owner of the world's most generic playlist!",
    "You've got the top 40 on repeat... since the '90s."
  ],
  30: [
    "You know the lyrics to every song on every radio station.",
    "Your music taste is like vanilla ice cream: reliable but not exciting.",
    "When your playlist plays, even elevators get jealous."
  ],
  20: [
    "You know every hit, before it's even a hit.",
    "You're the living, breathing Spotify algorithm!",
    "Your playlist is a 'Greatest Hits' compilation of the obvious.",
    "You know the lyrics to every song on every radio station."
  ],
  10: [
    "Wow, you must listen to only the top charts",
    "You've got the hits, but don't forget the underground!",
    "You're drowning in a sea of radio hits, and you love it!"
  ],
  0: [
    "Your music taste is so basic, it's legendary!",
    "Your playlist is a 'Greatest Hits' compilation of the obvious.",
    "You're the proud owner of the world's most generic playlist."
  ]
};

// You can use these humorous statements based on the user's music taste score.


function getRandomStatement(score) {
  const keys = Object.keys(statements);
  const scoreRange = keys.find(range => score <= parseInt(range));
  const randomIndex = Math.floor(Math.random() * statements[scoreRange].length);
  return statements[scoreRange][randomIndex];
}


  function PlaylistTemplate(data){
    const playlist_name = localStorage.getItem('playlist_name');
    const playlist_image = localStorage.getItem('playlist_picture');
    const playlistURL = inputField.value;
    const playlistEmbed = convertSpotifyLink(playlistURL);
    console.log(playlist_image);

    var totalScore = 0; 
    var totalTracks = 0; 

    data.tracks.items.forEach(track=> {
        totalScore += track.track.popularity;
        totalTracks++; 
        //console.log(track); 
    })
    var playlistPop = 100 - (totalScore/totalTracks);
    playlistPop = parseFloat(playlistPop.toFixed(2));
    const statement = getRandomStatement(playlistPop); 
    //return `<div><<h1>Your playlist ${playlist_name} is ${playlistPop}% unique`;
    return `<h3>Your playlist <a href= ${playlistURL}>${playlist_name}</a> is ${playlistPop}% unique...${statement}</h3>
      <iframe style="border-radius:12px" src=${playlistEmbed} width="100%" height="352" 
      frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; 
      fullscreen; picture-in-picture" loading="lazy"></iframe>`;
  }

  function extractPlaylistId(url) {
    const parts = url.split('/');
    const playlistIndex = parts.indexOf('playlist');
    
    if (playlistIndex !== -1 && playlistIndex < parts.length - 1) {
      return parts[playlistIndex + 1];
    } else {
      return null;
    }
  } 


  function userProfileTemplate(data) {
    return `<h1>Hello ${data.display_name}!</h1>`;
  }

  // function oAuthTemplate(data) {
  //   return `<h3>This page will expire at: ${new Date(parseInt(data.expires_at, 10)).toLocaleString()}. Click refresh to continue.</h3>`;

  // }

  // function errorTemplate(data) {
  //   return `<h2>Error info</h2>
  //     <table>
  //       <tr>
  //           <td>Status</td>
  //           <td>${data.status}</td>
  //       </tr>
  //       <tr>
  //           <td>Message</td>
  //           <td>${data.message}</td>
  //       </tr>
  //     </table>`;
  // }

  // Your client id from your app in the spotify dashboard:
  // https://developer.spotify.com/dashboard/applications
  const client_id = 'beaa990bacba48fb9f2891ceb5599c61';
  const redirect_uri = 'http://127.0.0.1:8000'; // Your redirect uri

  // Restore tokens from localStorage
  let access_token = localStorage.getItem('access_token') || null;
  let refresh_token = localStorage.getItem('refresh_token') || null;
  let expires_at = localStorage.getItem('expires_at') || null;

  // References for HTML rendering
  const mainPlaceholder = document.getElementById('main');
  const oauthPlaceholder = document.getElementById('oauth');
  const resultPlaceholder = document.getElementById('result');
  const inputField = document.getElementById("input-field");
  const submitButton = document.getElementById("submit-button");

  // If the user has accepted the authorize request spotify will come back to your application with the code in the response query string
  // Example: http://127.0.0.1:8080/?code=NApCCg..BkWtQ&state=profile%2Factivity
  const args = new URLSearchParams(window.location.search);
  const code = args.get('code');

  if (code) {
    // we have received the code from spotify and will exchange it for a access_token
    exchangeToken(code);
  } else if (access_token && refresh_token && expires_at) {
    // we are already authorized and reload our tokens from localStorage
    document.getElementById('loggedin').style.display = 'unset';

    // oauthPlaceholder.innerHTML = oAuthTemplate({
    //   access_token,
    //   refresh_token,
    //   expires_at,
    // });

    getUserData();
  } else {
    // we are not logged in so show the login button
    document.getElementById('login').style.display = 'unset';
  }

  submitButton.addEventListener("click", async function () {
    // Get the value of the input field
    const inputValue = inputField.value;

    // Call a function with the input value
    //getPlaylistImage(inputValue); 
    getPlaylistName(inputValue); 
    getPlaylistData(inputValue);
  });

  document
    .getElementById('login-button')
    .addEventListener('click', redirectToSpotifyAuthorizeEndpoint, false);

  // document
  //   .getElementById('refresh-button')
  //   .addEventListener('click', refreshToken, false);
  

  document
    .getElementById('logout-button')
    .addEventListener('click', logout, false);
})();
