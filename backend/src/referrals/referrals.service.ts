import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const MILESTONES = [1, 3, 7, 15, 30, 50] as const;
const MILESTONE_BONUSES: Record<number, number> = {
  1: 5,
  3: 10,
  7: 20,
  15: 40,
  30: 75,
  50: 100,
};
const POST_MILESTONE_BONUS = 5;

function calculateBonus(oldCount: number, newCount: number): number {
  let bonus = 0;
  for (const milestone of MILESTONES) {
    if (oldCount < milestone && newCount >= milestone) {
      bonus += MILESTONE_BONUSES[milestone];
    }
  }
  // After 50: +5 per paying friend beyond milestone 6
  const postMilestoneStart = 50;
  if (newCount > postMilestoneStart) {
    const from = Math.max(oldCount, postMilestoneStart);
    bonus += (newCount - from) * POST_MILESTONE_BONUS;
  }
  return bonus;
}

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async processReferralBonus(refereeId: string): Promise<void> {
    const referee = await this.prisma.user.findUnique({
      where: { id: refereeId },
      select: { referredByCode: true },
    });

    if (!referee?.referredByCode) return;

    // Check if this referee already triggered a bonus (idempotency)
    const existing = await this.prisma.referralBonus.findUnique({
      where: { refereeId },
    });
    if (existing) return;

    const referrer = await this.prisma.user.findUnique({
      where: { referralCode: referee.referredByCode },
      select: { id: true },
    });
    if (!referrer) return;

    const payingCount = await this.prisma.referralBonus.count({
      where: { referrerId: referrer.id },
    });

    const newCount = payingCount + 1;
    const checksAwarded = calculateBonus(payingCount, newCount);

    if (checksAwarded <= 0) return;

    await this.prisma.$transaction([
      this.prisma.referralBonus.create({
        data: {
          referrerId: referrer.id,
          refereeId,
          checksAwarded,
        },
      }),
      this.prisma.user.update({
        where: { id: referrer.id },
        data: { freeChecksLeft: { increment: checksAwarded } },
      }),
    ]);

    this.logger.log(
      `Referral bonus: +${checksAwarded} checks to user ${referrer.id} (paying referrals: ${newCount})`,
    );
  }

  async getMyStats(userId: string) {
    let user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    // Auto-generate referral code for existing users who don't have one
    if (user && !user.referralCode) {
      const newCode = crypto.randomBytes(5).toString('hex');
      user = await this.prisma.user.update({
        where: { id: userId },
        data: { referralCode: newCode },
        select: { referralCode: true },
      });
    }

    const referralCode = user?.referralCode ?? null;
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const referralLink = referralCode ? `${frontendUrl}/register?ref=${referralCode}` : null;

    const [totalReferrals, bonuses] = await Promise.all([
      this.prisma.user.count({ where: { referredByCode: referralCode ?? undefined } }),
      this.prisma.referralBonus.findMany({
        where: { referrerId: userId },
        select: { checksAwarded: true },
      }),
    ]);

    const payingReferrals = bonuses.length;
    const totalChecksEarned = bonuses.reduce((sum, b) => sum + b.checksAwarded, 0);

    // Determine next milestone
    const milestoneList = [...MILESTONES];
    const nextMilestoneTarget = milestoneList.find((m) => m > payingReferrals) ?? null;
    const nextMilestone = nextMilestoneTarget !== null ? nextMilestoneTarget - payingReferrals : null;
    const nextMilestoneBonus =
      nextMilestoneTarget !== null ? MILESTONE_BONUSES[nextMilestoneTarget] ?? POST_MILESTONE_BONUS : null;

    return {
      referralCode,
      referralLink,
      totalReferrals: referralCode ? totalReferrals : 0,
      payingReferrals,
      totalChecksEarned,
      nextMilestone,
      nextMilestoneBonus,
    };
  }
}
