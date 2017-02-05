'use strict';

const logger = require('../logger')();

/**
 * @module Review
 */
class Review {

  constructor (jira, config) {
    this.jira = jira;
    this.config = config;
  }

  canHandleMessage (message) {
    return message.text.startsWith('review');
  }

  handleMessage (talker) {
    const issueId = talker.message.text.split(' ')[1];
    this.jira.transitionIssue(issueId, {transition: {id: 71 }})
        .then((r) => {
          talker.sayText('Done');
        })
        .catch((error) => {
          talker.sayText(error);
        });
  }
}
module.exports = Review;
