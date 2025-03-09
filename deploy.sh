#!/bin/bash
set -e

# Enable required APIs if not already enabled
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Check if ANTHROPIC_API_KEY is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "ANTHROPIC_API_KEY environment variable is not set."
  echo -n "Please enter your Anthropic API key (starts with sk-ant-): "
  read -s ANTHROPIC_API_KEY
  echo
  
  if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Error: Anthropic API key is required."
    exit 1
  fi
fi

# Build and deploy using Cloud Build with the API key
gcloud builds submit --config cloudbuild.yaml --substitutions=_ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"

echo "Deployment completed successfully!"
echo "Your service is available at: $(gcloud run services describe never-sleeps-persona --platform managed --region europe-west1 --format 'value(status.url)')" 