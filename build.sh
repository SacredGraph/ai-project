#!/bin/bash
set -e

echo "Building Docker image with updated entrypoint..."
docker build -t claude-yolo-code .

echo "Docker image built successfully!"
echo "You can now use the API with the updated Docker image that pulls the latest code from main branch before running." 