#!/usr/bin/env node

const readline = require('readline');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const db = require('../knex/knex');

const prompt = (query, { masked = false } = {}) => {
        const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
                terminal: true,
        });

        if (masked) {
                rl.stdoutMuted = true;
                rl._writeToOutput = function _writeToOutput(stringToWrite) {
                        if (this.stdoutMuted) {
                                rl.output.write('*');
                        } else {
                                rl.output.write(stringToWrite);
                        }
                };
        }

        return new Promise(resolve => {
                rl.question(query, answer => {
                        rl.close();
                        if (masked) {
                                rl.output.write('\n');
                        }
                        resolve(answer);
                });
        });
};

const exitWith = async (message, code = 1) => {
        if (message) {
                console.error(message);
        }
        await db.destroy();
        process.exit(code);
};

const generateTempPassword = () =>
        crypto
                .randomBytes(9)
                .toString('base64')
                .replace(/[+/=]/g, '')
                .slice(0, 12);

const loadSmtpConfig = () => {
        const {
                SMTP_HOST,
                SMTP_PORT,
                SMTP_USER,
                SMTP_PASS,
                SMTP_SECURE,
                SMTP_FROM,
                SMTP_FROM_NAME,
        } = process.env;

        if (!SMTP_HOST || !SMTP_PORT || !SMTP_FROM) {
                return null;
        }

        const baseConfig = {
                host: SMTP_HOST,
                port: Number(SMTP_PORT),
                secure: String(SMTP_SECURE).toLowerCase() === 'true',
                tls: {
                        rejectUnauthorized: false,
                },
        };

        if (SMTP_USER && SMTP_PASS) {
                baseConfig.auth = {
                        user: SMTP_USER,
                        pass: SMTP_PASS,
                };
        }

        return {
                transport: baseConfig,
                from: SMTP_FROM_NAME ? `${SMTP_FROM_NAME} <${SMTP_FROM}>` : SMTP_FROM,
        };
};

const sendTempPasswordEmail = async (user, tempPassword) => {
        const smtpConfig = loadSmtpConfig();

        if (!smtpConfig) {
                await exitWith(
                        'SMTP is not configured. Please set SMTP_HOST, SMTP_PORT and SMTP_FROM environment variables.',
                );
        }

        const transporter = nodemailer.createTransport(smtpConfig.transport, []);

        await transporter.sendMail({
                from: smtpConfig.from,
                to: user.email,
                subject: 'Your PagerMon temporary password',
                text: `Hi ${user.username},\n\nYour password has been reset. Use the temporary password below to sign in and update your credentials.\n\nTemporary password: ${tempPassword}\n\nFor security, please log in and change this password immediately.`,
        });
};

const main = async () => {
        const username = (await prompt('Username: ')).trim();
        if (!username) {
                await exitWith('Username is required');
        }

        const user = await db('users').where({ username }).first();
        if (!user) {
                await exitWith('User not found');
        }

        if (!user.email) {
                await exitWith('User does not have an email address configured');
        }

        const confirm = (await prompt(`Reset password for ${user.username} and email a temporary password to ${user.email}? (y/N): `)).trim().toLowerCase();

        if (confirm !== 'y' && confirm !== 'yes') {
                await exitWith('Aborted by user', 0);
        }

        const tempPassword = generateTempPassword();

        const salt = bcrypt.genSaltSync();
        const hash = bcrypt.hashSync(tempPassword, salt);

        await db('users').where({ id: user.id }).update({ password: hash });
        await sendTempPasswordEmail(user, tempPassword);
        console.log('Password reset. Temporary password emailed to user.');
        await db.destroy();
};

main().catch(async err => {
        console.error('Unexpected error:', err.message || err);
        await db.destroy();
        process.exit(1);
});
