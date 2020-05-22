#!/bin/bash
set -e
docker-compose up -d --build migrations
status=$(docker wait test_migrations)
if [ $status -ne 0 ]; then
  docker logs test_migrations
  exit $status
fi
npm run test:e2e || status=$?
docker-compose down
exit $status
