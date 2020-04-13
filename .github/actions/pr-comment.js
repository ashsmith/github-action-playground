const eventPayload = require(process.env.GITHUB_EVENT_PATH);
const { Octokit } = require("@octokit/action");
const core = require('@actions/core');
const fetch = require("node-fetch");

const octokit = new Octokit();
const ciBaseUrl = 'https://circleci.com/api/v2';


parseComment().catch(err => core.setFailed(`Action failed with error ${err}`));


async function parseComment() {
  const expression = new RegExp(/\/ci ([a-zA-Z]+(?:_[a-zA-Z]+)*)/, 'gm');
  const commandMatches = [ ...eventPayload.comment.body.matchAll(expression)];
  const commands = commandMatches.map((match) => match[1]);
  const promises = commands.map((command) => executeCommand(command));
  return Promise.all(promises);
}

async function executeCommand(command) {
  switch(command) {
    case "run_acceptance":
      return triggerAcceptanceSuite();
    case "help":
      return showHelp();
    default:
      return unknownCommand();
  }
}

async function triggerAcceptanceSuite() {
  const { data: { head: { ref: branch } } } = await octokit.request(
    'GET /repos/:repository/pulls/:pr_number',
    {
      pr_number: eventPayload.issue.number,
      repository: process.env.GITHUB_REPOSITORY,
    }
  );

  const triggerPipeline = await fetch(
    `https://circleci.com/api/v2/project/gh/${process.env.GITHUB_REPOSITORY}/pipeline`,
    {
      method: 'post',
      body: JSON.stringify({
        "branch": branch,
        "parameters": {
          "run_integration_tests": true
        }
      }),
      headers: {
        'Circle-Token': process.env.CIRCLE_TOKEN,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    }
  );

  console.log(triggerPipeline);

  return addCommentReaction("rocket");
}

async function unknownCommand() {
  return addComment("Sorry, I did not recognise that command.");
}

async function showHelp() {
  return addComment("Try running any of the following commands:\n\
  **Run acceptance tests:**\n\
  ```\n\
  /ci run_acceptance\n\
  ```");
}

async function addComment(message) {
  // See https://developer.github.com/v3/issues/comments/#create-a-comment
  return octokit.request(
    "POST /repos/:repository/issues/:pr_number/comments",
    {
      repository: process.env.GITHUB_REPOSITORY,
      pr_number: eventPayload.issue.number,
      body: message
    }
  );
}

async function addCommentReaction(reaction) {
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
  return octokit.reactions.createForIssueComment({
    owner,
    repo,
    comment_id: eventPayload.comment.id,
    content: reaction
  })
}