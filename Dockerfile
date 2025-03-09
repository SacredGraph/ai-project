FROM node:20-slim

# Install required dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    python3 \
    python3-pip \
    python3-venv \
    ssh \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code via npm
RUN npm install -g @anthropic-ai/claude-code@0.2.35

# Verify Claude CLI installation
RUN ls -la /usr/local/lib/node_modules/@anthropic-ai/claude-code/ || echo "Claude Code not found"
RUN chmod +x /usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js
RUN /usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js --version || echo "Claude CLI version check failed"

# Install claude-yolo
RUN npm install -g claude-yolo

# Modify claude-yolo.js to bypass consent check
RUN sed -i 's/if (consentNeeded)/if (false \&\& consentNeeded)/g' /usr/local/lib/node_modules/claude-yolo/bin/claude-yolo.js
# RUN sed -i 's|let{resultText:m}|let m|g' /usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js
RUN sed -i 's|console.log(m.resultText)|console.log(JSON.stringify(m))|g' /usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js
RUN sed -i 's|getIsDocker:tR4,hasInternetAccess:Iv4|getIsDocker:function(){return true},hasInternetAccess:function(){return false}|g' /usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js

# Set up Python virtual environment and install dependencies
WORKDIR /app
COPY requirements.txt /app/
RUN python3 -m venv /venv
ENV PATH="/venv/bin:$PATH"
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Set up git autoSetupRemote (Git user name and email will be set at runtime)
RUN git config --global --type bool push.autoSetupRemote true

# Create necessary directories
USER root
RUN mkdir -p /home/node/.ssh && \
    chown -R node:node /home/node/.ssh && \
    chmod 700 /home/node/.ssh

RUN mkdir -p /home/node/.cache/claude-cli-nodejs/-app/messages/
RUN chown -R node:node /home/node/.cache/claude-cli-nodejs/-app/messages/
RUN chown -R node:node /usr/local/lib/node_modules

# Create GitHub CLI config directory
RUN mkdir -p /home/node/.config/gh && \
    chown -R node:node /home/node/.config/gh && \
    chmod 700 /home/node/.config/gh

# Create Claude config directory and copy any existing config files
RUN mkdir -p /home/node/.claude && \
    chmod 700 /home/node/.claude

# Copy the .claude directory if it exists (will be overridden by the API key injection)
COPY .claude/ /home/node/.claude/
RUN chown -R node:node /home/node/.claude && \
    chmod -R 600 /home/node/.claude/* 2>/dev/null || true

# Ensure proper ownership
RUN chown -R node:node /app
RUN chown -R node:node /venv

RUN mkdir /repos && chown -R node:node /repos
RUN echo "Host *\n\t StrictHostKeyChecking no" >> /etc/ssh/ssh_config

# Copy the entrypoint script and application files
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
RUN chown node:node /entrypoint.sh

# Copy the application code
COPY . /app/

# Fix permissions for .claude and .ssh directories
RUN mkdir -p /app/.claude/statsig && \
    mkdir -p /app/.ssh && \
    chown -R node:node /app/.claude && \
    chown -R node:node /app/.ssh && \
    chmod -R 700 /app/.claude && \
    chmod -R 700 /app/.ssh

# Switch to node user for running the application
USER node
ENV CLAUDE_CONFIG_DIR=/home/node/.claude
ENV PATH="/venv/bin:$PATH"

# Set the command to run the Flask app
CMD ["python", "app.py"]