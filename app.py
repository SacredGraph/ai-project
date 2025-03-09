import json
import os
import re
import subprocess
import sys
import time
import traceback
import signal
import threading
from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify
from flask_restful import Api, Resource
import shlex
import pathlib

# Create a dictionary to track running processes
running_processes = {}


# Signal handler for graceful shutdown
def handle_sigterm(signum, frame):
    print("Received SIGTERM signal. Starting graceful shutdown...")
    # Terminate any running subprocesses
    for pid, process in running_processes.items():
        try:
            print(f"Terminating subprocess with PID {pid}")
            process.terminate()
            # Give it some time to terminate gracefully
            process.wait(timeout=30)
        except subprocess.TimeoutExpired:
            print(f"Subprocess {pid} did not terminate in time, killing it")
            process.kill()
        except Exception as e:
            print(f"Error terminating subprocess {pid}: {e}")

    # Let the main process exit naturally
    print("Graceful shutdown complete")
    sys.exit(0)


# Register the signal handler
signal.signal(signal.SIGTERM, handle_sigterm)

app = Flask(__name__)
api = Api(app)


@app.route("/")
def index():
    """
    Root endpoint that displays API documentation
    """
    return jsonify(
        {
            "name": "Never Sleeps Persona API",
            "version": "1.0.0",
            "description": "API for running AI-powered code generation and repository management tasks",
            "endpoints": [
                {
                    "path": "/api/plan",
                    "method": "POST",
                    "description": "Generate implementation plans for user stories",
                },
                {
                    "path": "/api/act",
                    "method": "POST",
                    "description": "Execute implementation plans and create pull requests",
                },
                {
                    "path": "/api/feedback",
                    "method": "POST",
                    "description": "Address PR review feedback",
                },
                {
                    "path": "/api/epic",
                    "method": "POST",
                    "description": "Break down epics into user stories",
                },
            ],
        }
    )


@app.route("/health")
def health():
    """
    Health check endpoint
    """
    return jsonify({"status": "ok"})


@app.route("/test-claude", methods=["GET"])
def test_claude():
    """
    Test endpoint to directly test the Claude CLI
    """
    try:
        # Run a simple Claude CLI command
        result = subprocess.run(
            ["/usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js", "--help"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        return jsonify(
            {
                "success": result.returncode == 0,
                "returncode": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
            }
        )
    except subprocess.TimeoutExpired as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": f"Command timed out after {e.timeout} seconds",
                }
            ),
            500,
        )
    except Exception as e:
        return (
            jsonify(
                {"success": False, "error": str(e), "traceback": traceback.format_exc()}
            ),
            500,
        )


def parse_entrypoint_output(stdout):
    """
    Parse the output from entrypoint.sh:
    1. Try to parse as JSON directly
    2. If that fails, try to use ast.literal_eval to safely evaluate the string
    3. Return the parsed data if successful, otherwise return the original stdout
    """
    cleaned_stdout = f"{{{stdout.split('{', 1)[-1]}"

    # Try to parse as JSON directly first
    try:
        parsed_json = json.loads(cleaned_stdout)
        if isinstance(parsed_json, dict) and "resultText" in parsed_json:
            response_text = parsed_json["resultText"]

            # Check for JSON arrays in resultText
            import re

            # Look for code blocks with JSON arrays
            json_array_pattern = r"```json\s*(\[\s*\{.*?\}\s*\])\s*```"
            json_array_match = re.search(json_array_pattern, response_text, re.DOTALL)
            if json_array_match:
                json_array_str = json_array_match.group(1)
                try:
                    user_stories = json.loads(json_array_str)
                    parsed_json["user_stories"] = user_stories

                    print(f"Replacing JSON. Before: {response_text}")
                    parsed_json["resultText"] = re.sub(
                        r"```json.*```", "", response_text, flags=re.DOTALL
                    ).strip()
                    print(f"Replaced JSON. After: {parsed_json['resultText']}")
                except json.JSONDecodeError:
                    pass
            else:
                # Try a more lenient pattern - any array of objects
                array_pattern = r"\[\s*\{.*?\}\s*\]"
                array_match = re.search(array_pattern, response_text, re.DOTALL)
                if array_match:
                    array_str = array_match.group(0)
                    try:
                        user_stories = json.loads(array_str)
                        parsed_json["user_stories"] = user_stories
                    except json.JSONDecodeError:
                        pass
        return parsed_json
    except json.JSONDecodeError:
        # Try to extract just the JSON part if there's a clear JSON structure
        try:
            import re

            # Look for a complete JSON object
            json_pattern = r"(\{.*?\})"
            json_match = re.search(json_pattern, stdout, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
                try:
                    parsed_json = json.loads(json_str)
                    return parsed_json
                except json.JSONDecodeError:
                    pass
        except Exception:
            pass

        # Try ast.literal_eval as a last resort
        try:
            import ast

            # Only try this if the string looks like a Python dict
            if cleaned_stdout.strip().startswith(
                "{"
            ) and cleaned_stdout.strip().endswith("}"):
                parsed_data = ast.literal_eval(cleaned_stdout)
                return parsed_data
        except (SyntaxError, ValueError):
            pass

        return stdout


def inject_anthropic_api_key(api_key):
    """
    Inject the Anthropic API key into the Claude config file
    """
    if not api_key:
        return

    config_dir = pathlib.Path("/home/node/.claude")
    config_file = config_dir / "config.json"

    # Create directory if it doesn't exist
    config_dir.mkdir(parents=True, exist_ok=True)

    # Create or update config file
    config = {}
    if config_file.exists():
        try:
            with open(config_file, "r") as f:
                config = json.load(f)
        except json.JSONDecodeError:
            # If the file exists but is not valid JSON, start with an empty dict
            config = {}

    # Update the API key while preserving other settings
    config["primaryApiKey"] = api_key

    # Write the updated config
    with open(config_file, "w") as f:
        json.dump(config, f, indent=2)

    # Ensure proper permissions
    os.system(f"chown node:node {config_file}")
    os.system(f"chmod 600 {config_file}")


def run_entrypoint(args, api_key=None):
    """
    Run the entrypoint.sh script with the given arguments
    """
    try:
        # Inject the Anthropic API key if provided
        if api_key:
            inject_anthropic_api_key(api_key)

        # Create necessary directories with proper permissions
        os.makedirs("/home/node/.claude/statsig", exist_ok=True)
        os.makedirs("/home/node/.ssh", exist_ok=True)

        # Base command to run entrypoint.sh
        cmd = ["/entrypoint.sh"]

        # Add all arguments
        cmd.extend(args)

        # Run the command
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True,
        )

        # Track the process for graceful shutdown
        running_processes[process.pid] = process

        # Capture output
        stdout, stderr = process.communicate()

        # Remove from tracking once complete
        if process.pid in running_processes:
            del running_processes[process.pid]

        # Create a result object similar to subprocess.run
        class Result:
            def __init__(self, returncode, stdout, stderr):
                self.returncode = returncode
                self.stdout = stdout
                self.stderr = stderr

        result = Result(process.returncode, stdout, stderr)
        return result

    except Exception as e:
        # Create a fake result object to return
        class ErrorResult:
            def __init__(self, error):
                self.returncode = 1
                self.stdout = ""
                self.stderr = f"Exception: {error}\n{traceback.format_exc()}"

        return ErrorResult(str(e))


class PlanResource(Resource):
    def post(self):
        try:
            # Get the JSON data from the request
            data = request.get_json()

            # Validate the request
            if not data or "summary" not in data:
                return {"error": "Missing 'summary' field in request"}, 400

            summary = data["summary"]
            comment = data.get("comment", "")
            description = data.get("description", "")

            # Get optional repository parameters
            repo_url = data.get("repo_url", "")
            branch = data.get("branch", "main")
            github_token = data.get("github_token", "")
            ssh_private_key = data.get("ssh_private_key", "")
            ssh_public_key = data.get("ssh_public_key", "")
            git_user_name = data.get("git_user_name", "AI")
            git_user_email = data.get("git_user_email", "ai@example.com")

            # Get Anthropic API key
            anthropic_api_key = data.get(
                "anthropic_api_key", os.environ.get("ANTHROPIC_API_KEY", "")
            )

            # Prepare the prompt based on whether a comment and description are provided
            if comment:
                prompt = (
                    f"Take time to understand the existing codebase:\n"
                    f"1. Explore the directory structure\n"
                    f"2. For any files that seem relevant to this user story, read and understand them\n"
                    f"3. Look for related functionality, patterns, and conventions used in the project\n"
                    f"4. Identify which parts of the code will need to be modified or extended\n\n"
                    f"Now, think how you would handle the following user story:\n"
                    f"Summary: `{summary}`\n"
                    f"Description: `{description}`\n\n"
                    f"The user has commented on the initial plan: `{comment}`\n\n"
                    f"You MUST NOT perform the implementation of the user story just yet. You MUST only plan the implementation.\n\n"
                    f"In your response, please include:\n"
                    f"1. A summary of the relevant existing code you found\n"
                    f"2. Your plan for implementing the user story\n"
                    f"3. Any potential challenges or considerations\n\n"
                    f"IMPORTANT: Do not use any markdown styling (such as bold, italic, headers, bullet points) in your responses as they will be posted in Jira comments. Use plain text only."
                )
            else:
                prompt = (
                    f"Take time to understand the existing codebase:\n"
                    f"1. Explore the directory structure\n"
                    f"2. For any files that seem relevant to this user story, read and understand them\n"
                    f"3. Look for related functionality, patterns, and conventions used in the project\n"
                    f"4. Identify which parts of the code will need to be modified or extended\n\n"
                    f"Now, think how you would handle the following user story:\n"
                    f"Summary: `{summary}`\n"
                    f"Description: `{description}`\n\n"
                    f"You MUST NOT perform the implementation of the user story just yet. You MUST only plan the implementation.\n\n"
                    f"In your response, please include:\n"
                    f"1. A summary of the relevant existing code you found\n"
                    f"2. Your plan for implementing the user story\n"
                    f"3. Any potential challenges or considerations\n\n"
                    f"IMPORTANT: Do not use any markdown styling (such as bold, italic, headers, bullet points) in your responses as they will be posted in Jira comments. Use plain text only."
                )

            # Prepare arguments for entrypoint.sh
            args = []

            # Add repository parameters if provided
            if repo_url:
                args.append(f"--repo={repo_url}")
            if branch != "main":
                args.append(f"--branch={branch}")
            if github_token:
                args.append(f"--github-token={github_token}")
            if ssh_private_key:
                args.append(f"--ssh-private-key={ssh_private_key}")
            if ssh_public_key:
                args.append(f"--ssh-public-key={ssh_public_key}")
            if git_user_name != "AI":
                args.append(f"--git-user-name={git_user_name}")
            if git_user_email != "ai@example.com":
                args.append(f"--git-user-email={git_user_email}")

            # Add the prompt as the final argument
            args.append(prompt)

            # Execute the entrypoint script
            result = run_entrypoint(args, api_key=anthropic_api_key)

            # Check if the command was successful
            if result.returncode != 0:
                error_msg = f"Command failed with code {result.returncode}"
                # Check if the error is related to an empty repository
                if "You do not have the initial commit yet" in result.stderr:
                    return {
                        "error": "Repository exists but is empty. The system will attempt to initialize it with a README.md file.",
                        "details": result.stderr,
                    }, 500
                return {"error": error_msg, "details": result.stderr}, 500

            # Parse and return the response
            parsed_output = parse_entrypoint_output(result.stdout)

            # If the parsed output is already a dict, return it directly
            if isinstance(parsed_output, dict):
                return parsed_output
            else:
                return {"response": parsed_output}

        except Exception as e:
            return {"error": str(e), "traceback": traceback.format_exc()}, 500


class ActResource(Resource):
    def post(self):
        try:
            # Get the JSON data from the request
            data = request.get_json()

            # Validate the request
            if not data or "plan" not in data:
                return {"error": "Missing 'plan' field in request"}, 400

            if "issue_key" not in data:
                return {"error": "Missing 'issue_key' field in request"}, 400

            plan = data["plan"]
            issue_key = data["issue_key"]

            # Get optional repository parameters
            repo_url = data.get("repo_url", "")
            branch = data.get("branch", "main")
            github_token = data.get("github_token", "")
            ssh_private_key = data.get("ssh_private_key", "")
            ssh_public_key = data.get("ssh_public_key", "")
            git_user_name = data.get("git_user_name", "AI")
            git_user_email = data.get("git_user_email", "ai@example.com")

            # Get Anthropic API key
            anthropic_api_key = data.get(
                "anthropic_api_key", os.environ.get("ANTHROPIC_API_KEY", "")
            )

            # Prepare the prompt for executing the plan with git operations
            prompt = (
                f"Execute the following plan: `{plan}`\n\n"
                f"Please follow these steps to implement the changes:\n"
                f"1. Make sure you're in the repository directory (/app)\n"
                f"2. Run 'git status' to verify the repository state\n"
                f"3. Create a new branch with 'git checkout -b {issue_key}' (note: the code is already checked out by the container, you just need to create a new branch)\n"
                f"4. Make all the necessary modifications according to the plan\n"
                f"5. Run 'npm run build' to check for any build errors\n"
                f"6. Run appropriate tests to ensure your changes work correctly\n"
                f"7. Fix any build errors or test failures before proceeding\n"
                f"8. Add all changes with 'git add .'\n"
                f"9. Write a descriptive commit message that explains WHAT changes were made and WHY. The message should start with '{issue_key}:' followed by a concise summary of the implementation. Run: git commit -m \"{issue_key}: [Write a meaningful description of your changes here]\"\n"
                f"10. Push your branch with 'git push -u origin {issue_key}'\n"
                f'11. Create a pull request using GitHub CLI with the command: \'gh pr create --title "{issue_key}: [Write a clear, specific title describing the feature or fix]" --body "[Write a detailed description that explains:\n- What changes were made\n- Why these changes were necessary\n- How the implementation works\n- Any testing performed\n- Any additional notes for reviewers]" --base main\'\n'
                f"12. Exit only after all these steps are completed\n\n"
                f"IMPORTANT: For both the commit message and pull request, replace the placeholder text in brackets with actual meaningful content. Do not include the brackets in your final messages. The descriptions should be specific to the actual changes you made, not generic placeholders.\n\n"
                f"IMPORTANT: Do not use any markdown styling (such as bold, italic, headers, bullet points) in your responses as they will be posted in Jira comments. Use plain text only.\n\n"
            )

            # Prepare arguments for entrypoint.sh
            args = []

            # Add repository parameters if provided
            if repo_url:
                args.append(f"--repo={repo_url}")
            if branch != "main":
                args.append(f"--branch={branch}")
            if github_token:
                args.append(f"--github-token={github_token}")
            if ssh_private_key:
                args.append(f"--ssh-private-key={ssh_private_key}")
            if ssh_public_key:
                args.append(f"--ssh-public-key={ssh_public_key}")
            if git_user_name != "AI":
                args.append(f"--git-user-name={git_user_name}")
            if git_user_email != "ai@example.com":
                args.append(f"--git-user-email={git_user_email}")

            # Add the prompt as the final argument
            args.append(prompt)

            # Execute the entrypoint script
            result = run_entrypoint(args, api_key=anthropic_api_key)

            # Check if the command was successful
            if result.returncode != 0:
                return {"error": "Command failed", "details": result.stderr}, 500

            # Parse and return the response
            parsed_output = parse_entrypoint_output(result.stdout)

            # If the parsed output is already a dict, return it directly
            if isinstance(parsed_output, dict):
                return parsed_output
            else:
                return {"response": parsed_output}

        except Exception as e:
            return {"error": str(e)}, 500


class FeedbackResource(Resource):
    def post(self):
        try:
            # Get the JSON data from the request
            data = request.get_json()

            # Validate the request
            if not data or "issue_key" not in data:
                return {"error": "Missing 'issue_key' field in request"}, 400

            if "comments" not in data:
                return {"error": "Missing 'comments' field in request"}, 400

            issue_key = data["issue_key"]
            comments = data["comments"]

            # Get optional repository parameters
            repo_url = data.get("repo_url", "")
            branch = data.get("branch", "main")
            github_token = data.get("github_token", "")
            ssh_private_key = data.get("ssh_private_key", "")
            ssh_public_key = data.get("ssh_public_key", "")
            git_user_name = data.get("git_user_name", "AI")
            git_user_email = data.get("git_user_email", "ai@example.com")

            # Get Anthropic API key
            anthropic_api_key = data.get(
                "anthropic_api_key", os.environ.get("ANTHROPIC_API_KEY", "")
            )

            # Prepare the prompt for addressing PR review comments
            prompt = (
                f"You need to address the following PR review comments for issue '{issue_key}':\n\n"
                f"```\n{json.dumps(comments, indent=2)}\n```\n\n"
                f"Please follow these steps to implement the requested changes:\n"
                f"1. Make sure you're in the repository directory (/app)\n"
                f"2. Run 'git status' to verify the repository state\n"
                f"3. Run 'git checkout {issue_key}' to switch to the branch for this issue\n"
                f"4. Carefully review each comment and make all necessary changes to address them\n"
                f"5. For file-specific comments, locate the exact files and line numbers mentioned\n"
                f"6. For general PR comments, consider how they apply to the overall implementation\n"
                f"7. Run 'npm run build' to check for any build errors\n"
                f"8. Run appropriate tests to ensure your changes work correctly\n"
                f"9. Fix any build errors or test failures before proceeding\n"
                f"10. Add all changes with 'git add .'\n"
                f'11. Commit your changes with a descriptive message: git commit -m "{issue_key}: Address PR feedback - [brief description of changes]"\n'
                f"12. Push your changes with 'git push origin {issue_key}'\n"
                f"13. Exit only after all these steps are completed\n\n"
                f"IMPORTANT: Make sure to address ALL comments thoroughly. If any comment is unclear or you're unsure how to address it, explain your understanding and approach in your response.\n\n"
                f"CRITICAL: NEVER create a new branch. ALWAYS use the existing branch '{issue_key}' for all your changes. Do NOT use 'git checkout -b' or any command that would create a new branch.\n\n"
                f"IMPORTANT: Do not use any markdown styling (such as bold, italic, headers, bullet points) in your responses as they will be posted in Jira comments. Use plain text only.\n\n"
            )

            # Prepare arguments for entrypoint.sh
            args = []

            # Add repository parameters if provided
            if repo_url:
                args.append(f"--repo={repo_url}")
            if branch != "main":
                args.append(f"--branch={branch}")
            if github_token:
                args.append(f"--github-token={github_token}")
            if ssh_private_key:
                args.append(f"--ssh-private-key={ssh_private_key}")
            if ssh_public_key:
                args.append(f"--ssh-public-key={ssh_public_key}")
            if git_user_name != "AI":
                args.append(f"--git-user-name={git_user_name}")
            if git_user_email != "ai@example.com":
                args.append(f"--git-user-email={git_user_email}")

            # Add the prompt as the final argument
            args.append(prompt)

            # Execute the entrypoint script
            result = run_entrypoint(args, api_key=anthropic_api_key)

            # Check if the command was successful
            if result.returncode != 0:
                return {"error": "Command failed", "details": result.stderr}, 500

            # Parse and return the response
            parsed_output = parse_entrypoint_output(result.stdout)

            # If the parsed output is already a dict, return it directly
            if isinstance(parsed_output, dict):
                return parsed_output
            else:
                return {"response": parsed_output}

        except Exception as e:
            return {"error": str(e)}, 500


class EpicResource(Resource):
    def post(self):
        try:
            # Get the JSON data from the request
            data = request.get_json()

            # Validate the request
            if not data or "summary" not in data:
                return {"error": "Missing 'summary' field in request"}, 400

            if "description" not in data:
                return {"error": "Missing 'description' field in request"}, 400

            if "issue_key" not in data:
                return {"error": "Missing 'issue_key' field in request"}, 400

            summary = data["summary"]
            description = data["description"]
            issue_key = data["issue_key"]

            # Get optional repository parameters
            repo_url = data.get("repo_url", "")
            branch = data.get("branch", "main")
            github_token = data.get("github_token", "")
            ssh_private_key = data.get("ssh_private_key", "")
            ssh_public_key = data.get("ssh_public_key", "")
            git_user_name = data.get("git_user_name", "AI")
            git_user_email = data.get("git_user_email", "ai@example.com")

            # Get Anthropic API key
            anthropic_api_key = data.get(
                "anthropic_api_key", os.environ.get("ANTHROPIC_API_KEY", "")
            )

            # Prepare the prompt for generating user stories from an epic
            prompt = (
                f"You are tasked with breaking down the following epic into user stories:\n\n"
                f"Epic Summary: `{summary}`\n"
                f"Epic Description: `{description}`\n"
                f"Epic Issue Key: `{issue_key}`\n\n"
                f"Take time to understand the existing codebase:\n"
                f"1. Explore the directory structure\n"
                f"2. For any files that seem relevant to this epic, read and understand them\n"
                f"3. Look for related functionality, patterns, and conventions used in the project\n\n"
                f"Now, generate a list of user stories that would be needed to implement this epic. For each user story:\n"
                f"1. Create a title in the format: 'As <role> I should (not) be able to <action> on <subject>' or similar\n"
                f"2. Write a detailed description that references specific code files and components that would need to be modified\n"
                f"3. Ensure each user story is focused, implementable, and testable\n\n"
                f"Your response should include:\n"
                f"1. A brief overview of the epic and how you understand it\n"
                f"2. A list of user stories with titles and descriptions\n"
                f"3. Any dependencies between user stories\n\n"
                f"IMPORTANT: At the end of your response, include a JSON array of the user stories in the following format:\n"
                f"```json\n"
                f"[\n"
                f"  {{\n"
                f'    "id": "US-1",\n'
                f'    "title": "As a <role> I should be able to <action> on <subject>",\n'
                f'    "description": "Detailed description...",\n'
                f'    "depends_on": null\n'
                f"  }},\n"
                f"  {{\n"
                f'    "id": "US-2",\n'
                f'    "title": "As a <role> I should be able to <action> on <subject>",\n'
                f'    "description": "Detailed description...",\n'
                f'    "depends_on": "US-1"\n'
                f"  }},\n"
                f"  ...\n"
                f"]\n"
                f"```\n"
                f"Make sure the JSON is valid and properly formatted. Each user story must have a unique 'id' field (format: 'US-n' where n is a number). If a story depends on another story, include the 'depends_on' field with the id of the dependency. If there's no dependency, set 'depends_on' to null."
                f"\n\nIMPORTANT: Do not use any markdown styling (such as bold, italic, headers, bullet points) in your responses as they will be posted in Jira comments. Use plain text only."
            )

            # Prepare arguments for entrypoint.sh
            args = []

            # Add repository parameters if provided
            if repo_url:
                args.append(f"--repo={repo_url}")
            if branch != "main":
                args.append(f"--branch={branch}")
            if github_token:
                args.append(f"--github-token={github_token}")
            if ssh_private_key:
                args.append(f"--ssh-private-key={ssh_private_key}")
            if ssh_public_key:
                args.append(f"--ssh-public-key={ssh_public_key}")
            if git_user_name != "AI":
                args.append(f"--git-user-name={git_user_name}")
            if git_user_email != "ai@example.com":
                args.append(f"--git-user-email={git_user_email}")

            # Add the prompt as the final argument
            args.append(prompt)

            # Execute the entrypoint script
            result = run_entrypoint(args, api_key=anthropic_api_key)

            # Check if the command was successful
            if result.returncode != 0:
                return {"error": "Command failed", "details": result.stderr}, 500

            # Parse the stdout
            parsed_output = parse_entrypoint_output(result.stdout)

            # If the parsed output is already a dict and contains user_stories, return it directly
            if isinstance(parsed_output, dict) and "user_stories" in parsed_output:
                return parsed_output

            # Check if parsed_output is a dict and contains resultText
            if isinstance(parsed_output, dict) and "resultText" in parsed_output:
                response_text = parsed_output["resultText"]
                json_str = ""

                # Extract the JSON array of user stories from the resultText
                user_stories = []
                try:
                    # Look for JSON array in the response
                    json_match = re.search(r"(\{.*?\})", response_text, re.DOTALL)
                    if json_match:
                        json_str = json_match.group(1)
                        user_stories = json.loads(json_str)
                except Exception as e:
                    # If JSON extraction fails, continue with empty user_stories
                    pass

                print(f"Replacing JSON. Before: {response_text}")
                # Add the extracted user stories to the parsed_output
                parsed_output["resultText"] = re.sub(
                    r"```json.*```", "", response_text, flags=re.DOTALL
                )
                print(f"Replaced JSON. After: {parsed_output['resultText']}")
                parsed_output["user_stories"] = user_stories
                return parsed_output

            return parsed_output

        except Exception as e:
            return {"error": str(e)}, 500


# Register the resources
api.add_resource(PlanResource, "/api/plan")
api.add_resource(ActResource, "/api/act")
api.add_resource(FeedbackResource, "/api/feedback")
api.add_resource(EpicResource, "/api/epic")

if __name__ == "__main__":
    # Get port from environment variable (Cloud Run sets PORT)
    port = int(os.environ.get("PORT", 8080))

    # Print a warning about using the development server
    print(
        "WARNING: This is a development server. Do not use it in a production deployment."
    )
    print("Use a production WSGI server like Gunicorn instead.")

    # Run the Flask development server
    # Note: The use_reloader=False parameter helps with signal handling
    app.run(debug=False, host="0.0.0.0", port=port, use_reloader=False, threaded=True)
