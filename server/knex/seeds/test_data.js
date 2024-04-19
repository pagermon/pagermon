exports.seed = function (db, Promise) {
        // Deletes ALL existing entries
        return db('messages')
                .del() // Deletes ALL existing entries
                .then(() => db('capcodes').del())
                .then(() =>
                        db('capcodes').insert({
                                address: '1234567',
                                alias: 'Fire Brigade',
                                agency: 'FIRE',
                                icon: 'fire',
                                color: 'red',
                                ignore: '0',
                        })
                )
                .then(() =>
                        db('capcodes').insert({
                                address: '1234568',
                                alias: 'Ambulance 1',
                                agency: 'AMBULANCE',
                                icon: 'ambulance',
                                color: 'green',
                                ignore: '0',
                        })
                )
                .then(() =>
                        db('capcodes').insert({
                                address: '1234569',
                                alias: 'Police Station',
                                agency: 'POLICE',
                                icon: 'gavel',
                                color: 'blue',
                                ignore: '0',
                        })
                )
                .then(() =>
                        db('capcodes').insert({
                                address: '1234570',
                                alias: 'Ignore Capcode',
                                agency: 'IGNORE',
                                icon: '',
                                color: '',
                                ignore: '1',
                        })
                )
                .then(() =>
                        db('capcodes').insert({
                                address: '12345790',
                                alias: 'Capcode with no messages',
                                agency: 'EMPTY',
                                icon: '',
                                color: '',
                                ignore: '0',
                        })
                )
                .then(() =>
                        // Inserts seed entries one by one in series
                        db('messages').insert({
                                address: '1234567',
                                message: 'This is a Test Message to Address 1234567',
                                source: 'Client 1',
                                timestamp: '1529487722',
                                alias_id: '1'
                        })
                )
                .then(() =>
                        db('messages').insert({
                                address: '1234567',
                                message: 'This is another Test Message to Address 1234567',
                                source: 'Client 2',
                                timestamp: '1529488007',
                                alias_id: '1'
                        })
                )
                .then(() =>
                        db('messages').insert({
                                address: '1234568',
                                message: 'This is a Test Message to Address 1234568',
                                source: 'Client 1',
                                timestamp: '1529489509',
                                alias_id: '2'
                        })
                )
                .then(() =>
                        db('messages').insert({
                                address: '1234569',
                                message: 'This is a Test Message to Address 1234569',
                                source: 'Client 3',
                                timestamp: '1529495672',
                                alias_id: '3'
                        })
                )
                .then(() =>
                        db('messages').insert({
                                address: '1234570',
                                message: 'This is a Test Message to Address 1234570',
                                source: 'Client 4',
                                timestamp: '1529494321',
                                alias_id: '4'
                        })
                )
                .then(() =>
                        db('messages').insert({
                                address: '1234572',
                                message: 'This is a Test Message to non-stored Address 1234572',
                                source: 'Client 5',
                                timestamp: '1529494322',
                                alias_id: undefined
                        })
                )
                .then(() => db('users').del())
                .then(() =>
                        db('users').insert({
                                givenname: 'Active',
                                surname: 'User',
                                username: 'useractive',
                                password: '$2a$08$De/aXnQkZIEbQ9p8J22tHuzLltqIbsAxE2CGgRMPLaaIwwHmVrpsu',
                                email: 'none1@none.com',
                                role: 'user',
                                status: 'active',
                        })
                )
                .then(() =>
                        db('users').insert({
                                givenname: 'Active',
                                surname: 'Admin',
                                username: 'adminactive',
                                password: '$2a$08$De/aXnQkZIEbQ9p8J22tHuzLltqIbsAxE2CGgRMPLaaIwwHmVrpsu',
                                email: 'none2@none.com',
                                role: 'admin',
                                status: 'active',
                        })
                )
                .then(() =>
                        db('users').insert({
                                givenname: 'Disabled',
                                surname: 'Admin',
                                username: 'admindisabled',
                                password: '$2a$08$De/aXnQkZIEbQ9p8J22tHuzLltqIbsAxE2CGgRMPLaaIwwHmVrpsu',
                                email: 'none3@none.com',
                                role: 'admin',
                                status: 'disabled',
                        })
                );
};
