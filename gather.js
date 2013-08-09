"use strict";

var twitter = require('ntwitter');
var when = require('when');
var _ = require('underscore');
var config = require('./config');
var processor = require('./process');

var TIME_BETWEEN_REQUESTS = 60*1000;
// var TIME_BETWEEN_REQUESTS = 300;//TODO: change to once a minute

var twit = new twitter(config.twitter);

//mockups for testing
// twit.getFriendsIds = function(id, cb){
//   id = id || '' + '';
//   setTimeout(function(){
//     cb(null, [id+1,id+2,id+3,id+4,id+5]);
//   }, 100);
// };
// twit.getFollowersIds = function(id, cb){
//   id = id || '' + '';
//   setTimeout(function(){
//     cb(null, [id+6,id+7,id+8,id+9]);
//   }, 100);
// };

// rate limit a function returning a promise. Calls are queued up and executed at the
// rate specified
function rateLimit(fn){
  var lastAPICall = 0;
  var q = [];
  var processing = false;
  
  function process(){
    processing = true;
    var timeout = Math.max(TIME_BETWEEN_REQUESTS - (Date.now() - lastAPICall), 0);
    setTimeout(function(){
      var p = q[0];
      if(p){
        p().then(function(){
          q.shift();
          lastAPICall = Date.now();
          process();
        });
      }else{
        processing = false;
      }
    }, timeout);
  }

  return function(){
    var args = Array.prototype.slice.call(arguments);
    var deferred = when.defer();
    q.push(function(){
      return fn.apply(null, args).then(function(result){
        deferred.resolve(result);
      });
    });
    !processing && process();
    return deferred.promise;
  };
}

//helper functions
function getFriendsIds(id){
  console.log('Getting friends of '+id);
  var deferred = when.defer();
  twit.getFriendsIds(id, function(err, friends){
    if(err){
      console.log(err);
      deferred.reject(err);
    }else{
      deferred.resolve(friends);
      // deferred.resolve(_.take(friends, 5));
    }
  });
  return deferred.promise;
}

function getFollowersIds(id){
  console.log('Getting followers of '+id);
  var deferred = when.defer();
  twit.getFollowersIds(id, function(err, followers){
    if(err){
      deferred.reject(err);
    }else{
      deferred.resolve(followers);
      // deferred.resolve(_.take(followers, 5));
    }
  });
  return deferred.promise;
}

getFollowersIds = rateLimit(getFollowersIds);
getFriendsIds = rateLimit(getFriendsIds);

function showUser(ids){
  var deferred = when.defer();
  twit.showUser(ids, function(err, users){
    if(err){
      deferred.reject(err);
    }else{
      deferred.resolve(users);
    }
  });
  return deferred.promise;
}

function follow(id){
  var deferred = when.defer();
  //reject if not suitable
  twit.createFriendship(id, {
    follow: true
  }, function(err, user){
    if(err) deferred.reject();
    else deferred.resolve(user);
  });
  return deferred.promise;
}

function unfollow(id){
  var deferred = when.defer();
  twit.createFriendship(id, function(err, user){
    if(err) deferred.reject();
    else deferred.resolve();
  });
  return deferred.promise;
}

var ids = {};
function addFollowers(followers){
  return processor.addFollowers(followers);
  // return when.map(followers, function(follower){
  //   ids[follower] = 'FolOfFr';
  //   return when.resolve(follower);
  // });
}

function gather(){
  return getFriendsIds().then(function(friends){
    console.log('Direct friends: '+friends.length);
    return when.map(friends, function(friend){
      return getFollowersIds(friend).then(function(followersOfFriend){
        return addFollowers(followersOfFriend);
      });
      /*
      // logic to get followers of friends of friends
      return getFriendsIds(friend).then(function(friendsOfFriend){
        console.log('friend: '+friend);
        console.log(friendsOfFriend.length);
        return when.map(friendsOfFriend, function(friendOfFriend){
          ids[friendOfFriend] = 'FoF';
          console.log(friendOfFriend);
          return getFollowersIds(friendOfFriend).then(function(followersOfFriendOfFriend){
            return when.map(followersOfFriendOfFriend, function(followerOfFriendOfFriend){
              ids[followerOfFriendOfFriend] = 'FoFF';
              return when.resolve();
            });
          });
        });
      });
      */
    });
  });
}

gather().then(function(){
  console.log('Gathering finished');
  console.log(ids);
  process.exit(0);
});
