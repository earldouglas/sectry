'use strict';

var curl        = require('../../curl');
var parseString = require('xml2js').parseString;

function showBands(solardata, show) {
  var conds = parseConds(solardata);
  var bands = parseBands(solardata);
  show([
         'Bands as of ',
         solardata.updated[0].trim(),
         ': SFI=',
         solardata.solarflux[0].trim(),
         ' SN=',
         solardata.sunspots[0].trim(),
         ' A=',
         solardata.aindex[0].trim(),
         ' K=',
         solardata.kindex[0].trim(),
       ].join('')
  );
  for (var k = 0; k < bands.length; k++) {
    var band = bands[k];
    show([
           '| ',
           band,
           ' | day: ',
           conds[band].day,
           ' | night: ',
           conds[band].night,
           ' |',
         ].join('')
    );
  }
}

function parseConds(solardata) {
  var conds = {};
  for (var i = 0; i < solardata.calculatedconditions[0].band.length; i++) {
    var value = solardata.calculatedconditions[0].band[i];
    var band = value.$.name;
    conds[band] = conds[band] || {};
    var time = value.$.time;
    var cond = value._;
    conds[band][time] = cond;
  }
  return conds;
}

function parseBands(solardata) {
  var conds = parseConds(solardata);
  var bands = [];
  for (var j in conds) {
    if (conds.hasOwnProperty(j)) {
      bands.push(j);
    }
  }
  bands.sort();
  return bands;
}

function messageListener(db, from, channel, message, reply) {
  if ('@bands' === message) {
    curl('http://www.hamqsl.com/solarxml.php', function (resp) {
      parseString(resp, function (err, result) {
        var solardata = result.solar.solardata[0];
        showBands(solardata, function(message) {
          reply({ to: channel, message: [ message ]});
        });
      });
    });
  }
}

module.exports = messageListener;
