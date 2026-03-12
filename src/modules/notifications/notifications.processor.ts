import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationsService } from './notifications.service.js';
import {
  EMAIL_NOTIFICATION_JOB,
  EMAIL_NOTIFICATIONS_QUEUE,
} from './notifications.constants.js';

@Processor(EMAIL_NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== EMAIL_NOTIFICATION_JOB) {
      return;
    }

    const payload = job.data as {
      notificationId: string;
      emailTo: string;
      subject: string;
      templateCode: string;
      payloadJson: Record<string, unknown>;
    };
    await this.notificationsService.sendEmailNow(payload);
  }
}
