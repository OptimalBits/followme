var when = require('when');
var process = require('./process');
var expect = require('expect.js');

describe("Follow Me", function(){

  it('Add followers', function(done){
    process.addFollowers('1').then(function(){
      process.processFollower(function(followerId){
        expect(followerId).to.be.equal('1');
        return when.resolve();
      }).then(function(){
        done();
      }
      , function(err){
        console.log(err);
      });
    });
  });

  it('Follow followers', function(done){
    done();
  });

  it('Purge friends', function(done){
    process.purgeFriend(function(followerId){
      expect(followerId).to.be.equal('1');
      return when.resolve();
    }).then(done);
  });

});
