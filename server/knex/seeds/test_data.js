
exports.seed = function(db, Promise) {
  // Deletes ALL existing entries
  return db('messages').del() // Deletes ALL existing entries
    .then(function() { // Inserts seed entries one by one in series
      return db('messages').insert({
        address: '1234567',
        message: 'This is a Test Message to Address 1234567',
        source: 'Client 1',
        timestamp: '1529487722'
      });
    }).then(function () {
      return db('messages').insert({
        address: '1234567',
        message: 'This is another Test Message to Address 1234567',
        source: 'Client 2',
        timestamp: '1529488007'
      });
    }).then(function () {
      return db('messages').insert({
        address: '1234568',
        message: 'This is a Test Message to Address 1234568',
        source: 'Client 1',
        timestamp: '1529489509'
      });
    }).then(function () {
      return db('messages').insert({
        address: '1234569',
        message: 'This is a Test Message to Address 1234569',
        source: 'Client 3',
        timestamp: '1529495672'
      });
    }).then(function () {
      return db('messages').insert({
        address: '1234570',
        message: 'This is a Test Message to Address 1234570',
        source: 'Client 4',
        timestamp: '1529494321'
      });
    }).then(function () {
      return db('capcodes').del()
    }).then(function () {
      return db('capcodes').insert({
        address: '1234567',
        alias: 'Fire Brigade',
        agency: 'FIRE',
        icon: 'fire',
        color: 'red',
        ignore: '0',
      });
    }).then(function () {
      return db('capcodes').insert({
        address: '1234568',
        alias: 'Ambulance 1',
        agency: 'AMBULANCE',
        icon: 'ambulance',
        color: 'green',
        ignore: '0',
      });
    }).then(function () {
      return db('capcodes').insert({
        address: '1234569',
        alias: 'Police Station',
        agency: 'POLICE',
        icon: 'gavel',
        color: 'blue',
        ignore: '0',
      });
    }).then(function () {
      return db('capcodes').insert({
        address: '1234570',
        alias: 'Ignore Capcode',
        agency: 'IGNORE',
        icon: '',
        color: '',
        ignore: '1',
      });
    }).then(function () {
      return db('users').del()
    }).then(function () {
      return db('users').insert({
        givenname: 'Active',
        surname: 'User',
        username: 'useractive',
        password: '$2a$08$De/aXnQkZIEbQ9p8J22tHuzLltqIbsAxE2CGgRMPLaaIwwHmVrpsu',
        email: 'none1@none.com',
        role: 'user',
        status: 'active',
      });
    }).then(function () {
      return db('users').insert({
        givenname: 'Active',
        surname: 'Admin',
        username: 'adminactive',
        password: '$2a$08$De/aXnQkZIEbQ9p8J22tHuzLltqIbsAxE2CGgRMPLaaIwwHmVrpsu',
        email: 'none2@none.com',
        role: 'admin',
        status: 'active',
      });
    }).then(function () {
      return db('users').insert({
        givenname: 'Disabled',
        surname: 'Admin',
        username: 'admindisabled',
        password: '$2a$08$De/aXnQkZIEbQ9p8J22tHuzLltqIbsAxE2CGgRMPLaaIwwHmVrpsu',
        email: 'none3@none.com',
        role: 'admin',
        status: 'disabled',
      });
    })
};

