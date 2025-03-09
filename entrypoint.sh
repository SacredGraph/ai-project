#!/bin/bash
set -e

# Default values
REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-main}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
SSH_PRIVATE_KEY="${SSH_PRIVATE_KEY:-}"
SSH_PUBLIC_KEY="${SSH_PUBLIC_KEY:-}"
GIT_USER_NAME="${GIT_USER_NAME:-AI}"
GIT_USER_EMAIL="${GIT_USER_EMAIL:-ai@example.com}"
CLAUDE_ARGS=()

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --repo=*)
      REPO_URL="${1#*=}"
      shift
      ;;
    --branch=*)
      BRANCH="${1#*=}"
      shift
      ;;
    --github-token=*)
      GITHUB_TOKEN="${1#*=}"
      shift
      ;;
    --ssh-private-key=*)
      SSH_PRIVATE_KEY="${1#*=}"
      shift
      ;;
    --ssh-public-key=*)
      SSH_PUBLIC_KEY="${1#*=}"
      shift
      ;;
    --git-user-name=*)
      GIT_USER_NAME="${1#*=}"
      shift
      ;;
    --git-user-email=*)
      GIT_USER_EMAIL="${1#*=}"
      shift
      ;;
    *)
      CLAUDE_ARGS+=("$1")
      shift
      ;;
  esac
done

# Configure Git user
git config --global user.name "$GIT_USER_NAME"
git config --global user.email "$GIT_USER_EMAIL"

# Set up SSH keys if provided
if [ -n "$SSH_PRIVATE_KEY" ]; then
  echo "$SSH_PRIVATE_KEY" > /home/node/.ssh/id_ed25519
  chmod 600 /home/node/.ssh/id_ed25519
  
  # Verify the key was created properly
  if [ ! -f /home/node/.ssh/id_ed25519 ]; then
    exit 1
  fi
fi

if [ -n "$SSH_PUBLIC_KEY" ]; then
  echo "$SSH_PUBLIC_KEY" > /home/node/.ssh/id_ed25519.pub
  chmod 644 /home/node/.ssh/id_ed25519.pub
  
  # Verify the key was created properly
  if [ ! -f /home/node/.ssh/id_ed25519.pub ]; then
    exit 1
  fi
fi

# Set up GitHub token if provided
if [ -n "$GITHUB_TOKEN" ]; then
  echo "$GITHUB_TOKEN" | gh auth login --with-token
fi

# Add GitHub to known hosts
ssh-keyscan github.com >> /home/node/.ssh/known_hosts 2>/dev/null

# Clone repository if URL is provided
if [ -n "$REPO_URL" ]; then
  
  # Clean app directory if it exists and has content
  if [ -d "/repos/cloned-repo" ] && [ "$(ls -A /repos/cloned-repo)" ]; then
    rm -rf /repos/cloned-repo/*
    rm -rf /repos/cloned-repo/.[!.]*
  fi
  
  # Clone the repository
  if [[ "$REPO_URL" == git@* ]]; then
    # SSH URL
    if [ ! -f /home/node/.ssh/id_ed25519 ]; then
      echo "SSH key not found"
      exit 1
    fi
    
    # Try to clone the repository
    GIT_SSH_COMMAND="ssh -i /home/node/.ssh/id_ed25519 -o IdentitiesOnly=yes -v" \
    git clone --branch "$BRANCH" "$REPO_URL" /repos/cloned-repo || {
      # If clone fails, check if it's because the repo is empty
      if [[ $? -eq 128 && $(GIT_SSH_COMMAND="ssh -i /home/node/.ssh/id_ed25519 -o IdentitiesOnly=yes" git ls-remote "$REPO_URL" 2>&1) == *"You do not have the initial commit yet"* ]]; then
        echo "Repository exists but is empty. Initializing it..."
        mkdir -p /repos/cloned-repo
        cd /repos/cloned-repo
        git init
        git remote add origin "$REPO_URL"
        echo "# Initial commit" > README.md
        git add README.md
        git commit -m "Initial commit"
        git branch -M "$BRANCH"
        GIT_SSH_COMMAND="ssh -i /home/node/.ssh/id_ed25519 -o IdentitiesOnly=yes" git push -u origin "$BRANCH"
      else
        echo "Failed to clone repository"
        exit 1
      fi
    }
  else
    # HTTPS URL
    git clone --branch "$BRANCH" "$REPO_URL" /repos/cloned-repo || {
      # If clone fails, check if it's because the repo is empty
      if [[ $? -eq 128 && $(git ls-remote "$REPO_URL" 2>&1) == *"You do not have the initial commit yet"* ]]; then
        echo "Repository exists but is empty. Initializing it..."
        mkdir -p /repos/cloned-repo
        cd /repos/cloned-repo
        git init
        git remote add origin "$REPO_URL"
        echo "# Initial commit" > README.md
        git add README.md
        git commit -m "Initial commit"
        git branch -M "$BRANCH"
        git push -u origin "$BRANCH"
      else
        echo "Failed to clone repository"
        exit 1
      fi
    }
  fi
  
  # Move repository contents to app directory if the clone was successful
  if [ -d "/repos/cloned-repo/.git" ]; then
    mv /repos/cloned-repo/* /repos/cloned-repo/.[!.]* /app 2>/dev/null || true
  fi
fi

# Navigate to the app directory
cd /app

# Check if we're in a git repository
if [ -d ".git" ]; then
  # Save any uncommitted changes if they exist
  if [[ -n $(git status --porcelain) ]]; then
    git stash
  fi
  
  # Get current branch
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  
  # Checkout specified branch
  git checkout "$BRANCH"
  
  # Pull latest changes
  git pull origin "$BRANCH"
  
  # If we were on a different branch, go back to it
  if [ "$CURRENT_BRANCH" != "$BRANCH" ] && [ "$CURRENT_BRANCH" != "HEAD" ]; then
    git checkout "$CURRENT_BRANCH"
    
    # Try to rebase with the specified branch if we're on a feature branch
    if [ "$CURRENT_BRANCH" != "HEAD" ]; then
      git rebase "$BRANCH"
    fi
  fi
  
  # Restore uncommitted changes if they were stashed
  if [[ -n $(git stash list) ]]; then
    git stash pop
  fi
fi

# Check if the CLI exists
if [ ! -f "/usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js" ]; then
  exit 1
fi

# Check if the CLI is executable
if [ ! -x "/usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js" ]; then
  chmod +x /usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js
fi

# Run the CLI with error handling
OUTPUT=$(/usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js --dangerously-skip-permissions --print "${CLAUDE_ARGS[@]}" 2>&1)
EXIT_CODE=$?

# Wrap the output in JSON
if [ $EXIT_CODE -eq 0 ]; then
  # Escape any special characters in the output for JSON
  ESCAPED_OUTPUT=$(echo "$OUTPUT" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed 's/\n/\\n/g' | sed 's/\r/\\r/g' | sed 's/\t/\\t/g')
  echo "$OUTPUT"
else
  # Escape any special characters in the error output for JSON
  ESCAPED_OUTPUT=$(echo "$OUTPUT" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed 's/\n/\\n/g' | sed 's/\r/\\r/g' | sed 's/\t/\\t/g')
  echo "{\"error\":\"Command failed with exit code $EXIT_CODE\"}"
fi

exit $EXIT_CODE