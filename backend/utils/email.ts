import { EmailParams, MailerSend, Recipient, Sender } from "mailersend";

const mailerSend = new MailerSend({
    apiKey: process.env.MAILERSEND_API_TOKEN!,
});

const from = new Sender(
    "noreply@test-3m5jgrooepdgdpyo.mlsender.net",
    "ShipLog",
);

export const sendVerificationEmail = async (toEmail: string, token: string) => {
    const recipients = [new Recipient(toEmail, toEmail)];

    const verificationLink =
        `http://localhost:3000/verify-email?token=${token}`;

    const emailParams = new EmailParams()
        .setFrom(from)
        .setTo(recipients)
        .setSubject("Verify your email for ShipLog")
        .setHtml(`
            <h1>Welcome to ShipLog!</h1>
            <p>Click the link below to verify your email:</p>
            <a href="${verificationLink}">Verify Email</a>
        `);

    await mailerSend.email.send(emailParams);
};

export const sendForgotPasswordEmail = async (
    toEmail: string,
    token: string,
) => {
    const recipients = [new Recipient(toEmail, toEmail)];

    const resetLink = `http://localhost:3000/reset-password?token=${token}`;

    const emailParams = new EmailParams()
        .setFrom(from)
        .setTo(recipients)
        .setSubject("Reset your ShipLog password")
        .setHtml(`
            <h1>Password Reset Request</h1>
            <p>You requested to reset your password for ShipLog. Click the link below to proceed:</p>
            <a href="${resetLink}" style="color: #2563eb;">Reset Password</a>
            <p>If you did not request this, you can safely ignore this email.</p>
        `);

    await mailerSend.email.send(emailParams);
};
