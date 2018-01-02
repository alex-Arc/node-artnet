var packet = require("packet");
var Q = require("q");

var OpCodes = {
  OpPoll: 0x2000,
  OpPollReply: 0x2100,
  OpAddress: 0x6000,
  OpSync: 0x5200
}

var ArtnetPackets =  {
  //ArtPoll
  createArtPoll: function(){
// Define packet structure or use existing from parser object.
    var buf = new Buffer(14);

// Enter data with a JS object
    ArtnetPackets.serializer.serialize("Header",{
      ID: 'Art-Net',
      OpCode: OpCodes.OpPoll
    });

    ArtnetPackets.serializer.write(buf);

    ArtnetPackets.serializer.serialize("ArtPoll",{
      ProtVerHi:0x00, ProtVerLo:14,
      ArtPollReplyChanges: false,
      UnicastDiagnostics: false,
      SendDiagnostics: false,
      Priority: 0x0a
    });
    ArtnetPackets.serializer.write(buf,10);

    return buf;
  },

  //ArtAddress
  createProgramAddress: function(obj){
// Define packet structure or use existing from parser object.
    var buf = new Buffer(107);

// Enter data with a JS object
    ArtnetPackets.serializer.serialize("Header",{
      ID: 'Art-Net',
      OpCode: OpCodes.OpAddress
    });

    ArtnetPackets.serializer.write(buf);
    ArtnetPackets.serializer.serialize("ArtAddress",{
      ProtVerHi:0x00, ProtVerLo:14,
      NetSwitch: obj.netSwitch | 0x80  || 0x7F, // No change
      ShortName: obj.shortName || 0,
      LongName: obj.longName|| 0,
      SwIn: [0,0,0,0],
      SwOut: typeof obj.portOutput != 'undefined'? [obj.portOutput[0] | 0x80, obj.portOutput[1] | 0x80, obj.portOutput[2] | 0x80, obj.portOutput[3] | 0x80]:[0x7F,0x7F,0x7F,0x7F],
      SubSwitch: obj.subSwitch | 0x80   || 0x7F,
      Command: obj.command || 0x00

    });
    console.log(obj)
    ArtnetPackets.serializer.write(buf,10);

    return buf;
  },

  parse: function(msg){
    var deferred = Q.defer();
    ArtnetPackets.parser.parse(msg);
    ArtnetPackets.parser.extract('Header', function(fn){
      if(fn.ID == 'Art-Net') {
        switch(fn.OpCode) {
          case OpCodes.OpPoll:
            // console.log("Poll")
            ArtnetPackets.parser.extract('ArtPoll', function (m) {
              m.code = 'ArtPoll'
              deferred.resolve(m)
            })
            break
          case OpCodes.OpPollReply:
            //console.log("Poll reply")
            //ArtnetPackets.parser.parse(msg);
            ArtnetPackets.parser.extract('ArtPollReply', function(m){
              m.code = 'ArtPollReply';
              deferred.resolve(m);
            })
            break;
          case OpCodes.OpSync:
            deferred.resolve({code: 'ArtSync'});
            break;
          default :
            console.log("Unkown OpCode "+fn.OpCode.toString(16))
            deferred.reject(new Error("Unkown OpCode "+fn.OpCode.toString(16)));

        }
      }
    });

    return deferred.promise;
  }
};

ArtnetPackets.parser = packet.createParser();

ArtnetPackets.parser.packet("Header", "b8[8]z|ascii() => ID, l16 => OpCode");

ArtnetPackets.parser.packet("ArtPoll", "\
 b8 => ProtVerHi, \
 b8 => ProtVerLo, \
 b8{x4, b1=>UnicastDiagnostics, b1=>SendDiagnostics, b1 => ArtPollReplyChanges, x1} , \
 b8 => Priority \
 ");

ArtnetPackets.parser.packet("ArtAddress", "\
 b8 => ProtVerHi, \
 b8 => ProtVerLo, \
 b8 => NetSwitch, \
 b8 => BindIndex,\
 b8[18]z|ascii() => ShortName,\
 b8[64]z|ascii() => LongName,\
 b8[4] => SwIn,\
 b8[4] => SwOut,\
 b8 => SubSwitch, \
 x8,\
 b8 => Command");



ArtnetPackets.parser.packet("ArtPollReply", "\
 b8[4] => IP,\
 b16 => Port, \
 b8 => VersionInfoH,\
 b8 => VersionInfoL, \
 b8 => NetSwitch, \
 b8 => SubSwitch, \
 b8 => OemHi, \
 b8 => Oem, \
 b8 => UbeaVersion, \
 b8 => Status1,\
 b8 => EstaManLo,\
 b8 => EstaManHi,\
 b8[18]z|ascii() => ShortName,\
 b8[64]z|ascii() => LongName,\
 b8[64]|ascii() => NodeReport,\
 b8 => NumPortsHi,\
 b8 => NumPortsLo,\
 b8[4] => PortTypes,\
 b8[4] => GoodInput,\
 b8[4] => GoodOutput,\
 b8[4] => SwIn,\
 b8[4] => SwOut,\
 b8 => SwVideo,\
 b8 => SwMacro,\
 b8 => SwRemote,\
 x8, x8, x8,\
 b8 => Style,\
 b8[6] => MAC,\
 b8[4] => BindIp,\
 b8 => BindIndex,\
 b8 => Status2");


ArtnetPackets.serializer = ArtnetPackets.parser.createSerializer();


module.exports = ArtnetPackets;
