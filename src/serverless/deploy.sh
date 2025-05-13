#!/bin/bash

set -e

if ! command -v serverless &> /dev/null
then
    echo "Serverless Framework not found. Installing..."
    npm install -g serverless
fi

serverless plugin install --name serverless-plugin-custom-runtime

echo "Deploying Rex-ORM Service to AWS Lambda..."
serverless deploy
echo "Deployment completed."
