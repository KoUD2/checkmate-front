import api from '@/shared/utils/api'

export interface ReferralStats {
  referralCode: string | null
  referralLink: string | null
  totalReferrals: number
  payingReferrals: number
  totalChecksEarned: number
  nextMilestone: number | null
  nextMilestoneBonus: number | null
}

const referralService = {
  async getMyStats(): Promise<ReferralStats> {
    const res = await api.get<{ data: ReferralStats }>('/referrals/me')
    return res.data.data
  },
}

export default referralService
