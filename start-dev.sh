#!/bin/bash
npm run node > test.log 2>&1 &
NODE_PID=$!
echo "RPC online at ${NODE_PID} (http://localhost:8545)"
sleep 5
npm run deploy:local
read -p "Press any key to terminate RPC node"
kill ${NODE_PID}
