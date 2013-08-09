"use strict";

var redis = require("redis");
var client = redis.createClient(6379, "127.0.0.1");
var when = require('when');

var unprocessedSet = 'FOLLOWME_UNPROCESSED';
var processingList = 'FOLLOWME_PROCESSING';
var processedSet = 'FOLLOWME_PROCESSED';

/**
  Adds potential followers to the unprocessed set.
*/
module.exports.addFollowers = function addFollowers(followerIds){
  var deferred = when.defer();

  client.sadd(unprocessedSet, followerIds, function(err){
    if(err) deferred.reject(err);
    else deferred.resolve();
  });

  return deferred.promise;
}

/**
  Process one follower. Starts following a potential follower,
  and updates the sets and lists in the database correctly.
*/
module.exports.processFollower = function processFollower(followFn){
  return getFollower().then(function(followerId){
    if(followerId){
      return followFn(followerId).then(function(){
        var defer = when.defer();
      
        var multi = client.multi();
        multi
          .lpush(processingList, followerId)
          .sadd(processedSet, followerId)
          .exec(function(err, count){
            if(err) defer.reject();
            else defer.resolve(count);
          });
      
          return defer.promise;
      });
    }
  });
}

/**
  Removes oldest friend in the processingList
*/
module.exports.purgeFriend = function purgeFriend(unfollowFn){
  var defer = when.defer();
  
  client.rpop(processingList, function(err, followerId){
    if(err) defer.reject(err);
    else defer.resolve(followerId);
  });
  
  return defer.promise.then(function(followerId){
    if(followerId){
      return unfollowFn(followerId);
    }
  });
}

/**
  Gets a random unprocessed follower.
*/
function getFollower(){
  var defer = when.defer();
  client.spop(unprocessedSet, function(err, followerId){
    if(err) defer.reject(err);
    else defer.resolve(followerId);
  })
  return defer.promise;
}


