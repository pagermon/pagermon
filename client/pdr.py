'''
By S.Rees 2023 Python PDR Scraper.

For use on pager decoder devices running from a serial device

Edit as required'''

import sys
import os
sys.path.append(os.path.realpath('.'))
import serial
import time
Import requests
from datetime import datetime
import re
import inquirer
from serial.tools import list_ports
questions = [
    inquirer.List('device',
                  message="Please pick a device",
                  choices=[port.device+ ":"+ port.description 
                  for port in list_ports.comports()],
              ),
]
answers = inquirer.prompt(questions)
dev = answers["device"].split(":", 1)
ser = serial.Serial(dev[0], 19200, timeout=5)
from clint.textui import puts, colored

def post(flexcode, msg, when):
		headers = {
			'X-Requested-With': 'XMLHttpRequest',
			'apikey': "", #pagermon APIKey
			'User-Agent': 'PagerMon pdr.py',
		}
		params = {
			"address": flexcode,
			"message": msg,
			"datetime": when,
			"source": "",
			}
		requests.post('http://Your IP Address Here/api/messages', data=params, headers=headers)
print("feed is now starting \nThis may take some time whist the signal is found")
while 1:
	line = ser.readline()
	line = line.decode()
	when = int(time.time())
	if not line.strip():
		pass
	else:
		try:
			flexcode, sa, msg = line.split(' ', 2)
			flexcode = flexcode[2:]
			puts(colored.yellow(flexcode), newline=False)
			puts(" [", newline=False)
			puts(colored.green(when), newline=False)
			puts("] ", newline=False)
			if "CFSRES" in msg:
				puts(colored.red(msg.strip()))
			else:
				puts(msg.strip())
			post(flexcode, msg, when)
		except Exception as e:
			print(e)
