    $ cat samples/filters.ini | node ./import.js

Should provide output similar to:

	Sending capcode: 1511024 RFS CAN - Molong darkred fire
	Sending capcode: 1511 RFS Canobolas - Cabonne Group darkred fire
	Sending capcode: 1512 RFS Canobolas - Unidentified darkred fire
	Sending capcode: 1519000 SES CWR Canowindra darkorange medkit
	Sending capcode: 1519008 SES Eugowra darkorange medkit
	Sending capcode: 1519072 SES CWR Molong darkorange medkit
	Sending capcode: 1519080 SES CWR Orange darkorange medkit
	Sending capcode: 1519 SES Central West Region - West darkorange medkit
	End of input
	Success! 1511024
	Success! 1511
	Success! 1512
	Success! 1519000
	Success! 1519008
	Success! 1519072
	Success! 1519
	Success! 1519080

    $ multimon-ng -b2 -q -c -t wav -a POCSAG512 -f alpha samples/sample-2017-06-01.wav | node ./reader.js

Should provide output similar to:

	2017-06-11 19:37:44: 449000: COWRA : DAILY TEST -  09:05
	2017-06-11 19:37:44: 1042072: TRUNDLE : DAILY TEST - 09:27
	2017-06-11 19:37:44: 1042064: PARKES : DAILY TEST - 09:29
	2017-06-11 19:37:44: POCSAG512: Address:       5  Function: 0
	2017-06-11 19:37:44: 1049000: PEAK HILL : DAILY TEST - 09:30
	2017-06-11 19:37:44: 1049000: PEAK HILL : DAILY TEST - 09:30
	2017-06-11 19:37:44: 549016: GOOLOOGONG : DAILY TEST -  09:31
	Input died!