'use strict';

const logger = require('../logger')();

class ChangeState {

  constructor (jira, config) {
    this.jira = jira;
    this.config = config;
    this.states = { 
      'done': 91,
      'review':  71,
      'start': 11
    };
  }

  canHandleMessage (message) {
    return Object.keys(this.states).some(cmd => message.text.startsWith(cmd));
  }

  handleMessage (talker) {
    const parsed = talker.message.text.split(' ');
    const cmd = parsed[0];
    const issueId = parsed[1];
    this.jira.transitionIssue(issueId, {transition: {id: this.states[cmd] }})
        .then((r) => {
          talker.sayText('Done');
        })
        .catch((error) => {
          talker.sayText(error);
        });
  }
}
module.exports = ChangeState;
