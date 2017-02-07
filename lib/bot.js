'use strict';

const JiraApi = require('jira-client');
const Botkit = require('botkit');
const logger = require('./logger')();
const Talker = require('./talker');
const ChangeState = require('./command/changeState');
const MyIssues = require('./command/myIssues');
const OpenIssues = require('./command/openIssues');
const Status = require('./command/status');

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
    this.commands.push(new Status(this.jira, this.config));
    this.commands.push(new ChangeState(this.jira, this.config));
    this.commands.push(new MyIssues(this.jira, this.config));
    this.commands.push(new OpenIssues(this.jira, this.config));
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
    logger.info(message);
    var talker = new Talker(this.bot, message);
    if (message.type === 'message' && message.text) {
      var found = false;
      var command;
      for (command of this.commands) {
        if (command.canHandleMessage(message)) {
          command.handleMessage(talker);
          found = true;
          break;
        }
      }
      if (!found) {
        talker.sayText(this.getHelpMessage());
      }
    } else {
      logger.info(`@${this.bot.identity.name} could not respond.`);
    }
  }

  getHelpMessage() {
    var res = '*Help:*\n\n';
    var command;
    for(command of this.commands) {
      res += command.shortHelp() + '\n';
    }
    return res;
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
