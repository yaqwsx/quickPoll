#!/usr/bin/env bash

set -e

trap 'kill $(jobs -p); sleep 1' EXIT

mkdir -p run

export CWD=$(pwd)

envsubst '$CWD' < nginx.conf > ${CWD}/run/nginx.conf
envsubst < server/wsgi.ini > ${CWD}/run/wsgi.ini

cd server
uwsgi --ini ${CWD}/run/wsgi.ini &

sleep 3

nginx -c ${CWD}/run/nginx.conf -p ${CWD} -g "daemon off; pid ${CWD}/run/nginx.pid;"
