var ArtnetNode = function(){
  this.ip = undefined;
  this.mac = undefined;
  this.name = undefined;
  this.version = '0.0';
  this.numOutputs = 0;
  this.universesOutput = [0,0,0,0];
  this.report = undefined;
  this._waitingForPollReply = false;
  this.BindIndex = 0;
}

//ArtnetNode.prototype.

module.exports = ArtnetNode;
