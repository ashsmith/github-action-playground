const eventPayload = require(process.env.GITHUB_EVENT_PATH);
const { Octokit } = require("@octokit/action");
const octokit = new Octokit();
parseComment();

async function parseComment() {

  console.log(eventPayload.comment.body);

  const expression = new RegExp(/\/ci ([a-zA-Z]+(?:_[a-zA-Z]+)*)/, 'gm');
  const commandMatches = [ ...eventPayload.comment.body.matchAll(expression)];
  console.log(commandMatches);
  const commands = commandMatches.map((match) => match[1]);
  commands.forEach((command) => executeCommand(command));
}

async function executeCommand(command) {
  switch(command) {
    case "run_acceptance":
      await triggerAcceptanceSuite();
      break;
    case "help":
      await showHelp();
      break;
    default:
      await unknownCommand();
      break;
  }
}

async function triggerAcceptanceSuite() {
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