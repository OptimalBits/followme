"use strict";

var twitter = require('ntwitter');
var when = require('when');
var _ = require('underscore');
var config = require('./config');
var processor = require('./process');

var FRIENDSHIP_INTERVAL = 10000;

var twit = new twitter(config.twitter);

function follow(id){
  var deferred = when.defer();
  //reject if not suitable
  console.log(id);
  twit.createFriendship(+id, {
    follow: true
  }, function(err, user){
    if(err) deferred.reject(err);
    else deferred.resolve(user);
  });
  return deferred.promise;
}

function unfollow(id){
  var deferred = when.defer();
  twit.createFriendship(+id, function(err, user){
    if(err) deferred.reject();
    else deferred.resolve();
  });
  return deferred.promise;
}

var week = 7*24*60*60*1000 / FRIENDSHIP_INTERVAL;
setInterval(function(){
  console.log('Processing follower');
  processor.processFollower(follow).then(function(){
    return processor.processingCount().then(function(count){
      console.log('Friends in queue: '+ count);
      if(count > week) processor.purgeFriend(unfollow);
    });
  }).otherwise(function(err) {
    console.log(err);
  });
}, FRIENDSHIP_INTERVAL);

// processor.processFollower(follow).otherwise(function(err) {
//   console.log(err);
// });
