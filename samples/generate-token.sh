#!/bin/bash
# node.js deployment: generate a random token

echo "$(head -c 16 /dev/random | base64 | tr '[A-Z]' '[a-z]' | sed 's/\/\+//g' | head -c 16)"

