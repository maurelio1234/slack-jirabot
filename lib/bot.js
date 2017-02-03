'use strict';

const JiraApi = require('jira-client');
const Botkit = require('botkit');
const logger = require('./logger')();
const Status = require('./command/status.js')

/**
 * @module Bot
 */
class Bot {
  /**
   * Constructor.
   *
   * @constructor
   * @param {Config} config The final configuration for the bot
   */
  constructor (config) {
    this.config = config;
    this.controller = Botkit.slackbot({
      stats_optout: true,
      logger
    });

    this.ticketRegExp = new RegExp(config.jira.regex, 'g');
    logger.info(`Ticket Matching Regexp: ${this.ticketRegExp}`);

    this.jira = new JiraApi({
      protocol: config.jira.protocol,
      host: config.jira.host,
      port: config.jira.port,
      username: config.jira.user,
      password: config.jira.pass,
      apiVersion: config.jira.apiVersion,
      strictSSL: config.jira.strictSSL,
      base: config.jira.base
    });

    this.commands = [];
    this.commands.push(new Status(this.jira, this.config))
  }

  /**
   * Parse out JIRA tickets from a message.
   * This will return unique tickets that haven't been
   * responded with recently.
   *
   * @param {string} channel the channel the message came from
   * @param {string} message the message to search in
   * @return {string[]} an array of tickets, empty if none found
   */
  parseTickets (channel, message) {
    const retVal = [];
    if (!channel || !message) {
      return retVal;
    }
    const uniques = {};
    const found = message.match(this.ticketRegExp);
    const now = Date.now();
    let ticketHash;
    if (found && found.length) {
      found.forEach((ticket) => { retVal.push(ticket); });
    }
    return retVal;
  }

  /**
   * Function to be called on slack open
   *
   * @param {object} payload Connection payload
   * @return {Bot} returns itself
   */
  slackOpen (payload) {
    const channels = [];
    const groups = [];
    const mpims = [];

    logger.info(`Welcome to Slack. You are @${payload.self.name} of ${payload.team.name}`);

    if (payload.channels) {
      payload.channels.forEach((channel) => {
        if (channel.is_member) {
          channels.push(`#${channel.name}`);
        }
      });

      logger.info(`You are in: ${channels.join(', ')}`);
    }

    if (payload.groups) {
      payload.groups.forEach((group) => {
        groups.push(`${group.name}`);
      });

      logger.info(`Groups: ${groups.join(', ')}`);
    }

    if (payload.mpims) {
      payload.mpims.forEach((mpim) => {
        mpims.push(`${mpim.name}`);
      });

      logger.info(`Multi-person IMs: ${mpims.join(', ')}`);
    }

    return this;
  }

  /**
   * Handle an incoming message
   * @param {object} message The incoming message from Slack
   * @returns {null} nada
   */
  handleMessage (message) {
    const response = {
      as_user: true,
      attachments: []
    };

    logger.info(message);
    if (message.type === 'message' && message.text) {
      const found = this.parseTickets(message.channel, message.text);
      if (found && found.length) {
        logger.info(`Detected ${found.join(',')}`);
        found.forEach((issueId) => {
          this.commands[0].handleMessage(this.bot, message, response, issueId);
        });
      } else {
        response.text = "I don't get your meaning.";
        this.bot.reply(message, response, (err) => {});
      }
    } else {
      logger.info(`@${this.bot.identity.name} could not respond.`);
    }
  }

  /**
   * Start the bot
   *
   * @return {Bot} returns itself
   */
  start () {
    this.controller.on(
      'direct_mention,mention,ambient,direct_message',
      (bot, message) => {
        this.handleMessage(message);
      }
    );

    this.controller.on('rtm_close', () => {
      logger.info('The RTM api just closed');

      if (this.config.slack.autoReconnect) {
        this.connect();
      }
    });

    this.connect();

    return this;
  }

  /**
   * Connect to the RTM
   * @return {Bot} this
   */
  connect () {
    this.bot = this.controller.spawn({
      token: this.config.slack.token,
      retry: this.config.slack.autoReconnect ? Infinity : 0
    }).startRTM((err, bot, payload) => {
      if (err) {
        logger.error('Error starting bot!', err);
      }

      this.slackOpen(payload);
    });

    return this;
  }
}

module.exports = Bot;
