#!/bin/bash

rtl_fm -d 0101 -E dc -F 0 -l 15 -A fast -f 148.5875M -s22050 - | 
multimon-ng -q -b1 -c -a POCSAG512 -f alpha -t raw /dev/stdin | 
node reader.js
