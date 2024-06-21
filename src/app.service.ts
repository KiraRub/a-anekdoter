import axios from 'axios';
import { parse } from 'node-html-parser';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { URLS } from './app.constants';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private links = new Set();

  constructor(private readonly config: ConfigService) {}

  @Cron('* */30 * * * *')
  async handleCron() {
    
  const now = new Date();
  const permTime = now.toLocaleString('en-US', { timeZone: 'Europe/Perm' });
  const hours = new Date(permTime).getHours();
  if (hours > 12 || hours < 9) {
    return;
  }
    
    const page = await this.getMemDayPage();
    const mem = this.getRandomMemFromPage(page);
    await this.sendMessageToTelegram(encodeURIComponent(mem));
  }

  getRandomMemFromPage(page: string): string {
    const root = parse(page);

    const images = root
      .querySelectorAll('img')
      .filter((img) => img.rawAttrs.toLowerCase().includes('мем'))
      .map((img) => img.attributes.src);

    const random = images[Math.floor(Math.random() * images.length)];

    if (this.links.has(random)) {
      return this.getRandomMemFromPage(page);
    }

    this.links.add(random);

    return random;
  }

  async getMemDayPage(): Promise<string> {
    const url = URLS.AnekdotRuMemDay;
    try {
      const result = await axios.get(url);
      return result.data;
    } catch (e) {
      this.logger.error(e);
    }
  }

  private async sendMessageToTelegram(message: string): Promise<void> {
    const baseUrl = this.config.get('TELEGRAM_URL');
    const token = this.config.get('TELEGRAM_TOKEN');
    const chatId = this.config.get('TELEGRAM_CHAT_ID');

    const url = `${baseUrl}/bot${token}/sendMessage?parse_mode=html&chat_id=${chatId}&text=${message}`;

    await axios.get(url).catch((e) => {
      this.logger.error(e);
    });
  }
}
