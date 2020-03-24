import { Injectable, Logger } from '@nestjs/common';
import { MailerService, ISendMailOptions } from '@nestjs-modules/mailer';

interface IIndividualMandrillMailSendStatus {
    email: string;
    status: 'sent';
    _id: string;
    reject_reason: string;
}

interface IMandrillMailSendStatus {
    messageId: string;
    accepted: IIndividualMandrillMailSendStatus[];
    rejected: IIndividualMandrillMailSendStatus[];
}

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);

    constructor(private readonly mailerService: MailerService) {}

    async send(sendMailOptions: ISendMailOptions) {
        try {
            const result: IMandrillMailSendStatus = await this.mailerService.sendMail(
                sendMailOptions
            );

            if (result.messageId) {
                const allSucceeded = result.accepted.reduce(
                    (a, b) => a && b.status === 'sent',
                    true
                );

                if (allSucceeded) {
                    this.logger.log(`Sent email with id: ${result.messageId}. `);
                    this.logger.log(result);
                    return true;
                }

                this.logger.error(`Error when sending email.`);
                this.logger.error(result);

                return false;
            }

            return true;
        } catch (error) {
            this.logger.error(`Error when sending email.`);
            this.logger.error(error);
        }

        return false;
    }
}
