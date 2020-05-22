#!/bin/sh
n=0
until pg_isready -h $DB_HOST -p $DB_PORT -U test
do
  n=$((n+1)) 
  if [ "$n" -ge 10 ]
  then
    echo "Too many retries. Exiting."
    exit 1
  fi
  echo "Database not accepting connections yet. Retrying..."
  sleep 1;
done

npx knex migrate:latest
