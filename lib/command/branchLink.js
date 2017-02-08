'use strict';

const logger = require('../logger')();

class BranchLink {

  constructor (jira, config) {
    this.jira = jira;
    this.config = config;
  }

  canHandleMessage (message) {
    return message.text.startsWith('branch');
  }

  handleMessage (talker) {
    const issueId = talker.message.text.split(' ')[1];
    var link = `${this.config.jira.protocol}://${this.config.jira.host}:${this.config.jira.port}/browse/${issueId}?devStatusDetailDialog=create-branch`;
    talker.sayText(link);
  }

  shortHelp() {
    return '*branch*: generates create branch link for issue\n';
  }
}
module.exports = BranchLink;
