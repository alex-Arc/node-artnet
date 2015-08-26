var dgram = require('dgram');
var Buffer = require('buffer').Buffer;
var _ = require('underscore');

var ArtnetPacket = require('./lib/ArtnetPacket');
var ArtnetNode = require('./lib/ArtnetNode');
/*
 var parser = require("packet").createParser();

 parser.packet("header", "b8 => type, b16 => length, b32 => extra");

var serializer = parser.createSerializer();
serializer.serialize("header","asd");
console.log(serializer.length);
var buf = new Buffer(4);
serializer.write(buf);
console.log(buf);*/




function ArtNetController(host, port) {
  this._host = host;
  this._port = port;
  this._socket = dgram.createSocket("udp4");

  this.nodes = [];


  var me = this;
  this._socket.on('message', function(msg, rinfo) {
    console.log('Received %d bytes from %s:%d\n',
      msg.length, rinfo.address, rinfo.port);

      ArtnetPacket.parse(msg).then(function(m){
        if(m.code == 'ArtPollReply'){
          //console.log(m);

          var node = _.find(me.nodes, function(n){
            return n.ip == m.IP.join('.');
          })


          if(!node){
            node = new ArtnetNode();
            node.ip = m.IP.join('.');
            node.mac = _.map(m.MAC, function(n){return n.toString(16)}).join(':');
            me.nodes.push(node);
          }

          node._waitingForPollReply = false;
        }
      })
  });

  this._socket.on('listening', function () {
    var address = me._socket.address();
    console.log('UDP Client listening on ' + address.address + ":" + address.port);
  });

  this._socket.bind({port:port}, function(){
    me._socket.setBroadcast(true)
   // me._socket.setMulticastTTL(128);
  //  me._socket.addMembership("255.255.255.255")


    me.refreshClients();
  });
}


ArtNetController.prototype.refreshClients = function(){
  console.log("Frefresh.... Nodes: "+this.nodes.length);

  this.nodes = _.filter(this.nodes, function(node){
    return node._waitingForPollReply == false;
  })

  _.each(this.nodes, function(node){
    node._waitingForPollReply = true;
  });


  var buf = ArtnetPacket.createArtPoll();
  this._socket.send(buf,0, buf.length, this._port, "10.255.255.255")

  setTimeout(function(_this){
    _this.refreshClients()
  },2500, this);
}


ArtNetController.prototype.send = function(data) {
  // Calcualte the length
  var length_upper = Math.floor(data.length / 256);
  var length_lower = data.length % 256;

  var data = this.HEADER.concat(this.SEQUENCE).concat(this.PHYSICAL).concat(this.UNIVERSE).concat([length_upper, length_lower]).concat(data);
  var buf = Buffer(data);
  this._socket.send(buf, 0, buf.length, this._port, this._host, function(){});
}

ArtNetController.prototype.close = function(){
  this._socket.close();
};

exports.ArtNetClient = ArtNetController;

exports.createController = function(port) {
  if(!port) port = '6454';
  return new ArtNetController("", port);
}
