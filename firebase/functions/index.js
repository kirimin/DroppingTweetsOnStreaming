const functions = require('firebase-functions');
const request = require('request');
const {google} = require('googleapis');
require('date-utils');

const OAuth2 = google.auth.OAuth2;

exports.searchTweets = functions.https.onCall(async (data, context) => {
  return new Promise(function(resolve, reject) {
    const text = data.text;
    const since_id = data.since_id;
    const bearer = data.bearer;
    console.log(`searchRequest:${text}, ${since_id}`)
    request.get({
        uri: 'https://api.twitter.com/1.1/search/tweets.json',
        headers: {
          authorization: `Bearer ${bearer}`,
        },
        qs: {
          q: text,
          count: 10,
          since: new Date().toFormat("YYYY-MM-DD"),
          since_id: since_id,
        },
        json: true
      }, function(err, req, data) {
        if (err) {
          reject(err)
        } else {
          const result = {
                max_id : data.search_metadata.max_id_str,
                tweets : data.statuses
            }
          resolve(result)
        }
      }
    );
  });
});

exports.postToChat = functions.https.onCall(async (data, context) => {
  const credentials = data.credentials;
  const token = data.token;
  const message = data.message;
  return new Promise(function(resolve, reject) {
    authorize(credentials, token, function(auth) {
      const service = google.youtube('v3');
      service.liveBroadcasts.list({
          auth: auth,
          part: 'snippet',
          mine: true,
      }, function(err, response) {
          if (err) {
              console.log('The API returned an error: ' + err);
              return;
          }
          const liveChatId = response.data.items[0].snippet.liveChatId;
          service.liveChatMessages.insert({
            auth: auth,
            part: 'snippet',
            resource: {
              snippet: {
                  type: 'textMessageEvent',
                  liveChatId: liveChatId,
                  textMessageDetails: {
                    messageText: message
                  }
              }
            }
          }, function(err, response) {
            if (err) {
              return;
            }
          })
      });
    })
    resolve("success")
  })
});

function authorize(credentials, token, callback) {
  var clientId = credentials.client_id;
  var clientSecret = credentials.client_secret;
  var redirectUrl = credentials.redirect_uris[0];
  var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
  oauth2Client.credentials = token;
  callback(oauth2Client);
}