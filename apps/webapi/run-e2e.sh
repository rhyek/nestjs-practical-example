#!/bin/bash
set -e
docker-compose -f ./test/docker-compose.yaml up -d --build migrations > /dev/null
status=$(docker wait test_migrations)
if [ $status -ne 0 ]; then
  docker logs test_migrations
  exit $status
fi
jest --verbose --config ./test/jest-e2e.json || status=$?
docker-compose -f ./test/docker-compose.yaml down
exit $status
