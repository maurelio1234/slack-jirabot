'use strict';

const logger = require('../logger')();
const J2S = require('jira2slack');
const moment = require('moment');
const PACKAGE = require('../../package');

const RESPONSE_FULL = 'full';

/**
 * @module Status
 */
class Status {

    constructor(jira, config) {
        this.jira = jira;
        this.config = config;
    }

    canHandleMessage(message) {
      return message.text.startsWith('status');
    }

    handleMessage(bot, message, response) {
        const issueId = message.text.split(' ')[1];
        this.jira.findIssue(issueId)
            .then((issue) => {
                // If direct mention, use full format
                const responseFormat = message.event === 'direct_mention' ? RESPONSE_FULL : null;
                response.attachments = [this.issueResponse(issue, responseFormat)];
                bot.reply(message, response, (err) => {
                if (err) {
                    logger.error('Unable to respond', err);
                } else {
                    logger.info(`@${bot.identity.name} responded with`, response);
                }
            });
        })
        .catch((error) => {
            logger.error(`Got an error trying to find ${issueId}`, error);
        });
    }

  /**
   * Build a response string about an issue.
   *
   * @param {Issue}  issue     the issue object returned by JIRA
   * @param {string} usrFormat the format to respond with
   * @return {Attachment} The response attachment.
   */
  issueResponse (issue, usrFormat) {
    const format = usrFormat || this.config.jira.response;
    const response = {
      fallback: `No summary found for ${issue.key}`
    };
    const created = moment(issue.fields.created);
    const updated = moment(issue.fields.updated);

    response.text = this.formatIssueDescription(issue.fields.description);
    response.mrkdwn_in = ['text']; // Parse text as markdown
    response.fallback = issue.fields.summary;
    response.pretext = `Here is some information on ${issue.key}`;
    response.title = issue.fields.summary;
    response.title_link = this.buildIssueLink(issue.key);
    response.footer = `Slack Jira ${PACKAGE.version} - ${PACKAGE.homepage}`;
    response.fields = [];
    if (format === RESPONSE_FULL) {
      response.fields.push({
        title: 'Created',
        value: created.calendar(),
        short: true
      });
      response.fields.push({
        title: 'Updated',
        value: updated.calendar(),
        short: true
      });
      response.fields.push({
        title: 'Status',
        value: issue.fields.status.name,
        short: true
      });
      response.fields.push({
        title: 'Priority',
        value: issue.fields.priority.name,
        short: true
      });
      response.fields.push({
        title: 'Reporter',
        value: (this.jira2Slack(issue.fields.reporter.name) || issue.fields.reporter.displayName),
        short: true
      });
      let assignee = 'Unassigned';
      if (issue.fields.assignee) {
        assignee = (this.jira2Slack(issue.fields.assignee.name) ||
          issue.fields.assignee.displayName);
      }
      response.fields.push({
        title: 'Assignee',
        value: assignee,
        short: true
      });
      // Sprint fields
      if (this.config.jira.sprintField) {
        response.fields.push({
          title: 'Sprint',
          value: (this.parseSprint(issue.fields[this.config.jira.sprintField]) || 'Not Assigned'),
          short: false
        });
      }
      // Custom fields
      if (this.config.jira.customFields && Object.keys(this.config.jira.customFields).length) {
        Object.keys(this.config.jira.customFields).map((customField) => {
          let fieldVal = null;
          // Do some simple guarding before eval
          if (!/[;&\|\(\)]/.test(customField)) {
            try {
              /* eslint no-eval: 0*/
              fieldVal = eval(`issue.fields.${customField}`);
            } catch (e) {
              fieldVal = `Error while reading ${customField}`;
            }
          } else {
            fieldVal = `Invalid characters in ${customField}`;
          }
          fieldVal = fieldVal || `Unable to read ${customField}`;
          return response.fields.push({
            title: this.config.jira.customFields[customField],
            value: fieldVal,
            short: false
          });
        });
      }
    }

    return response;
  }

  /**
   * Format a ticket description for display.
   * * Truncate to 1000 characters
   * * Replace any {quote} with ```
   * * If there is no description, add a default value
   *
   * @param {string} description The raw description
   * @return {string} the formatted description
   */
  formatIssueDescription (description) {
    const desc = description || 'Ticket does not contain a description';
    return J2S.toSlack(desc);
  }

  /**
   * Construct a link to an issue based on the issueKey and config
   *
   * @param {string} issueKey The issueKey for the issue
   * @return {string} The constructed link
   */
  buildIssueLink (issueKey) {
    let base = '/browse/';
    if (this.config.jira.base) {
      // Strip preceeding and trailing forward slash
      base = `/${this.config.jira.base.replace(/^\/|\/$/g, '')}${base}`;
    }
    return `${this.config.jira.protocol}://${this.config.jira.host}:${this.config.jira.port}${base}${issueKey}`;
  }

  /**
   * Parses the sprint name of a ticket.
   * If the ticket is in more than one sprint
   * A. Shame on you
   * B. This will take the last one
   *
   * @param {string[]} customField The contents of the greenhopper custom field
   * @return {string} The name of the sprint or ''
   */
  parseSprint (customField) {
    let retVal = '';
    if (customField && customField.length > 0) {
      const sprintString = customField.pop();
      const matches = sprintString.match(/,name=([^,]+),/);
      if (matches && matches[1]) {
        retVal = matches[1];
      }
    }
    return retVal;
  }

  /**
   * Lookup a JIRA username and return their Slack username
   * Meh... Trying to come up with a better system for this feature
   *
   * @param {string} username the JIRA username
   * @return {string} The slack username or ''
   */
  jira2Slack (username) {
    let retVal = '';
    if (this.config.usermap[username]) {
      retVal = `@${this.config.usermap[username]}`;
    }
    return retVal;
  }


}
module.exports = Status;