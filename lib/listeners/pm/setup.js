'use strict';

var util = require('../../utilities.js');

function usage(extraInfo){
  var message = '';
  if (extraInfo !== '') {
    message = 'Error: ' + extraInfo + '. ';
  }
  return message + 'Usage: @setup <email|sms|tz> <email@example.com|phone|code|olson-timezone>';
}
function isCode(code) {
  var match = /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.exec(code);
  if (match) {
    return true;
  } else {
    return false;
  }
}

function isValidOlsonTimezone(tz) {
  var match = /^\w+\/\w+$/.exec(tz);
  if (match) {
    return true;
  } else {
    return false;
  }
}
function updateDbSetup(db,from,command,verificationCode,argument) {
  db.setup = db.setup || {};
  db.setup[from] = db.setup[from] || {};
  db.setup[from][command] = db.setup[from][command] || {};
  db.setup[from][command].code = verificationCode;
  db.setup[from][command].info = argument;
}

function updateDbContactInfo(db,from,command,contactInfo) {
  db.contactinfo = db.contactinfo || {};
  db.contactinfo[from] = db.contactinfo[from] || {};
  db.contactinfo[from][command] = contactInfo;
}

function updateDbSettings(db,from,setting,value) {
  db.settings = db.settings || {};
  db.settings[from] = db.settings[from] || {}; 
  db.settings[from][setting] = value;
}


function pmListener(db, from, message, reply) {
  var match   = /^@setup\s*(\w+)\s*(\S+@\S+|\d{3}-?\d{3}-?\d{4}|\w{8}-\w{4}-\w{4}-\w{4}-\w{12}|.*)\s*(.*)$/.exec(message);
  var command = match && match[1] || '';
  var argument = match && match[2] || '';

  //matches first word, then either an 'email' (non-blank characters surrounding @), or a UUID
  var verificationCode = util.uuid();
  var verificationMessage =
    'This is your verification code: "' + verificationCode +
    '". Run the following command:\n/msg ' + util.bot() +
    ' @setup '+ command + ' ' + verificationCode;

  var validateCode = function() {
    var sentCode = db.setup[from][command].code || '';
    var contactInfo = db.setup[from][command].info || '';

    if (argument === sentCode) {
      updateDbContactInfo(db,from,command,contactInfo);
      delete db.setup[from];
      return from +', code validated.';
    } else {
      return from + ', code invalid. Please try again.';
    }
  };
  var validateSms = function () {
    if (isCode(argument)) {
      return validateCode();
    } else {
      updateDbSetup(db,from,command,verificationCode,argument);
      util.sms(db,argument, verificationMessage);
      return from + ', validation code sent! Check your texts.';
    }
  };
  var validateEmail = function () {
    if (isCode(argument)) {
      return validateCode();
    } else {
      updateDbSetup(db,from,command,verificationCode,argument);
      util.email(db, argument, 'email verification', verificationMessage);
      return from + ', validation code sent! Check your email.';
    }
  };

  var updateTimezone = function() {
    if (!isValidOlsonTimezone(argument)) {
      return from + ': please provide a valid Olson timezone. e.g. America/Phoenix';
    }
    updateDbSettings(db, from, command, argument);
    return from + ': timezone updated.';
  };

  var commands = {'email':validateEmail, 'sms':validateSms, 'tz':updateTimezone};
  if (/^@setup.*$/.exec(message)) {
    var msg = usage('');
    if (match && commands[command]) {
      msg = commands[command]();
    }
    reply({ to: from, message: msg });
  }
}

module.exports = pmListener;
