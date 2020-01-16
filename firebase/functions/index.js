const functions = require('firebase-functions');
const request = require('request');
require('date-utils');

exports.searchTweets = functions.https.onCall(async (data, context) => {
  return new Promise(function(resolve, reject) {
    const text = data.text;
    const bearer = data.bearer;
    request.get({
        uri: 'https://api.twitter.com/1.1/search/tweets.json',
        headers: {
          authorization: `Bearer ${bearer}`,
        },
        qs: {
          q: text,
          count: 5,
          since: new Date().toFormat("YYYY-MM-DD"),
        },
        json: true
      }, function(err, req, data) {
        if (err) {
          reject(err)
        } else {
          const result = {
                max_id : data.search_metadata.max_id,
                tweets : data.statuses.map(tweet => tweet.text)
                .map(str => str.replace("#きりみんちゃんねる", "")),
            }
          resolve(result)
        }
      }
    );
  });
});