#!/bin/bash
# Example script to run the Claude-Yolo container

# Build the container
docker build -t claude-yolo .

# Example 1: Using command-line arguments with SSH
echo "Example 1: Using SSH with command-line arguments"
echo "This will also display usage information after completion"
docker run -it --rm claude-yolo \
  --repo=git@github.com:username/repository.git \
  --branch=main \
  --ssh-private-key="$(cat ~/.ssh/id_ed25519)" \
  --ssh-public-key="$(cat ~/.ssh/id_ed25519.pub)" \
  --git-user-name="Claude AI" \
  --git-user-email="claude@example.com" \
  --prompt "Analyze the codebase and suggest improvements"

# Example 2: Using environment variables with HTTPS
echo "Example 2: Using environment variables with HTTPS"
docker run -it --rm \
  -e REPO_URL=https://github.com/username/repository.git \
  -e BRANCH=develop \
  -e GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx \
  -e GIT_USER_NAME="Claude AI" \
  -e GIT_USER_EMAIL="claude@example.com" \
  claude-yolo \
  --prompt "Implement a new feature based on the requirements"

# Example 3: Using volume mounts for local development
echo "Example 3: Using volume mounts for local development"
docker run -it --rm \
  -v $(pwd):/app \
  claude-yolo \
  --git-user-name="Claude AI" \
  --git-user-email="claude@example.com" \
  --prompt "Analyze the current directory and suggest improvements"

# Example 4: Using SSH keys from files for better security
echo "Example 4: Using SSH keys from files (more secure approach)"
# Create temporary files for the keys
PRIVATE_KEY_FILE=$(mktemp)
PUBLIC_KEY_FILE=$(mktemp)

# Write the keys to the temporary files
cat ~/.ssh/id_ed25519 > "$PRIVATE_KEY_FILE"
cat ~/.ssh/id_ed25519.pub > "$PUBLIC_KEY_FILE"

# Run the container with the key files
docker run -it --rm \
  --mount type=bind,source="$PRIVATE_KEY_FILE",target=/tmp/id_ed25519,readonly \
  --mount type=bind,source="$PUBLIC_KEY_FILE",target=/tmp/id_ed25519.pub,readonly \
  claude-yolo \
  --repo=git@github.com:username/repository.git \
  --branch=main \
  --ssh-private-key="$(cat /tmp/id_ed25519)" \
  --ssh-public-key="$(cat /tmp/id_ed25519.pub)" \
  --git-user-name="Claude AI" \
  --git-user-email="claude@example.com" \
  --prompt "Review the codebase for security issues"

# Clean up the temporary files
rm "$PRIVATE_KEY_FILE" "$PUBLIC_KEY_FILE" 