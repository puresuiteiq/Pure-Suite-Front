import { useVerticalT } from '../../hooks/useVerticalT'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Button from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { useMerchantProfile } from '../../hooks/useMerchantProfile'
import { useMerchantOverview } from '../../hooks/useMerchantOverview'
import { formatCurrency } from '../../utils/format'
import MenuQrCard from '../../components/merchant/MenuQrCard'
import AnimatedSection from '../../components/ui/AnimatedSection'

export default function MerchantDashboard() {
  const { session } = useAuth()
  const { profile, loading: profileLoading } = useMerchantProfile()
  const { data, loading } = useMerchantOverview()
  const { t } = useVerticalT()
  // Prefer the readable slug (/r/mamo); fall back to the numeric id for a
  // merchant created before db:add-slug, whose link is still /r/<id>. Held
  // back until the profile has loaded so the QR code never renders — and gets
  // downloaded — with the numeric fallback of a merchant that has a slug.
  const storefrontId = profileLoading ? null : profile?.slug || session?.merchantId
  const storefrontUrl = storefrontId ? `/r/${encodeURIComponent(storefrontId)}` : null

  // Real stats from the DB (orders + reviews for this merchant).
  const stats = [
    {
      key: 'todaysOrders',
      value: data ? data.ordersToday.toLocaleString() : '—',
      icon: 'activity',
    },
    {
      key: 'revenueToday',
      value: data ? formatCurrency(data.revenueToday) : '—',
      icon: 'dashboard',
    },
    {
      key: 'avgRating',
      value: data && data.reviewsCount > 0 ? data.avgRating.toFixed(1) : '—',
      icon: 'star',
    },
  ]

  return (
    <div>
      <PageHeader
        title={
          profile?.businessName
            ? t('merchantDashboard.welcomeNamed', { name: profile.businessName })
            : t('merchantDashboard.welcome')
        }
        subtitle={t('merchantDashboard.subtitle')}
        actions={
          <div className="flex items-center gap-3">
            {storefrontUrl && (
              <a href={storefrontUrl} target="_blank" rel="noreferrer">
                <Button variant="secondary" icon="book">
                  {t('merchantDashboard.viewStorefront')}
                </Button>
              </a>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat, index) => (
          <AnimatedSection key={stat.key} delay={index * 0.06} className="rounded-2xl">
            <StatCard
              icon={stat.icon}
              value={loading ? '…' : stat.value}
              label={t(`merchantDashboard.${stat.key}`)}
            />
          </AnimatedSection>
        ))}
      </div>

      <AnimatedSection delay={0.2} className="mt-6 rounded-3xl">
        <MenuQrCard
          merchantId={storefrontId}
          title={t('merchantDashboard.menuQrTitle')}
          description={t('merchantDashboard.menuQrDescription')}
          downloadLabel={t('merchantDashboard.downloadQr')}
          logoSrc={profile?.logo || null}
        />
      </AnimatedSection>

    </div>
  )
}
