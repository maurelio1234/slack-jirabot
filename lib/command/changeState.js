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

  shortHelp() {
    var text =
      '*start*: changes the state from ToDo to In progress\n' +
      '*review*: changes the state from In progress to In review\n' +
      '*done*: changes the state from In review to Done';
    return text;
  }
}
module.exports = ChangeState;
