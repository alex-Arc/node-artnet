var dgram = require('dgram');
var Buffer = require('buffer').Buffer;
var _ = require('underscore');

var ArtnetPacket = require('./lib/ArtnetPacket');
var ArtnetNode = require('./lib/ArtnetNode');

function ArtNetController(host, port) {
  this._host = host;
  this._port = port;
  this._socket = dgram.createSocket({type:"udp4", reuseAddr:true, });

  this.nodes = [];


  var me = this;
  this._socket.on('message', function(msg, rinfo) {
   // console.log('Received %d bytes from %s:%d\n',msg.length, rinfo.address, rinfo.port);

      ArtnetPacket.parse(msg).then(function(m){
        if(m.code == 'ArtPollReply'){
       //   console.log(m);

          var node = _.find(me.nodes, function(n) {
            return n.ip + n.BindIndex === m.IP.join('.') + m.BindIndex
          })

          if(!node){
            node = new ArtnetNode();
            //console.log(m)
            me.nodes.push(node);
          }

          node.ip = m.IP.join('.');
          node.mac = _.map(m.MAC, function(n){return n.toString(16)}).join(':');
          node.name = m.LongName;
          node.version = m.VersionInfoH+"."+m.VersionInfoL;
          node.numOutputs = m.NumPortsLo;
          node.universesOutput = m.SwOut;
          node.subnet = m.SubSwitch;
          node.net = m.NetSwitch;
          node.report = m.NodeReport;
          node.BindIndex = m.BindIndex;


          node._waitingForPollReply = false;
        }else if (m.code == 'ArtSync') {
          let currentSync = Date.now()
          if (me.lastSync === undefined) {
            me.lastSync = Date.now()
            me.fps = 0
          }
          me.fps = 1 / ((currentSync - me.lastSync)*0.001)
          me.lastSync = currentSync
        }
      })
  });

  this._socket.on('listening', function () {
    var address = me._socket.address();
  //  console.log('UDP Client listening on ' + address.address + ":" + address.port);
  });

  this._socket.bind({port:port}, function(){
    me._socket.setBroadcast(true)
   // me._socket.setMulticastTTL(128);
  //  me._socket.addMembership("255.255.255.255")


    me.refreshClients();
  });
}


ArtNetController.prototype.refreshClients = function(){
  //console.log("Frefresh.... Nodes: "+this.nodes.length);

  this.nodes = _.filter(this.nodes, function(node){
    return node._waitingForPollReply == false;
  })

  _.each(this.nodes, function(node){
    node._waitingForPollReply = true;
  });


  var buf = ArtnetPacket.createArtPoll();
  this._socket.send(buf,0, buf.length, this._port, "2.255.255.255")

  setTimeout(function(_this){
    _this.refreshClients()
  },4000, this);
}

ArtNetController.prototype.updateClient = function(ip, name, universes, locate){

  if(universes){
    var portOutput = [];
    for(var i=0;i<4;i++){
      portOutput[i] = universes[i] & 0xF;
    }

    var subSwitch = (universes[0] & 0xF0) >> 4;
    var netSwitch = (universes[0] & 0xF00) >> 8;
    if(portOutput[0]>12){
        console.error("INVALID PORTS - redo process");
        return;
    }

  } else {
    var portOutput = undefined;
    var netSwitch = undefined;
    var subSwitch = undefined;
  }

  var buf = ArtnetPacket.createProgramAddress({
    shortName: name,
    longName: name,
    portOutput: portOutput,
    subSwitch: subSwitch,
    netSwitch: netSwitch,
    command: locate?0x04:0x00
  });
  /*console.log({portOutput: portOutput,
    subSwitch: subSwitch,
    netSwitch: netSwitch})*/
  this._socket.send(buf,0, buf.length, this._port, ip);
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
