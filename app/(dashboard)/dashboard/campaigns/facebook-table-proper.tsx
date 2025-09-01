"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Facebook,
  Instagram,
  Globe,
  Play,
  Image as ImageIcon,
  Layers,
  BarChart3,
  AlertCircle,
  CheckCircle,
  XCircle,
  Pause,
  Megaphone,
  FolderOpen,
  FileImage,
  ArrowUpDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getCreativeImageUrl, getCreativeFormat } from "@/lib/utils/creative-utils"
import { AdDetailDialogEnhanced } from "@/components/campaigns/ad-detail-dialog-enhanced"

// Platform icons component
const PlatformIcon = ({ platform }: { platform: string }) => {
  switch (platform?.toLowerCase()) {
    case 'facebook':
      return <Facebook className="h-4 w-4 text-blue-600" />
    case 'instagram':
      return <Instagram className="h-4 w-4 text-pink-600" />
    case 'meta':
      return (
        <div className="flex gap-0.5">
          <Facebook className="h-3 w-3 text-blue-600" />
          <Instagram className="h-3 w-3 text-pink-600" />
        </div>
      )
    case 'google':
      return (
        <div className="flex items-center">
          <div className="h-4 w-4 rounded-full bg-gradient-to-br from-blue-500 via-green-500 to-yellow-500 p-0.5">
            <div className="h-full w-full rounded-full bg-white flex items-center justify-center">
              <span className="text-[10px] font-bold">G</span>
            </div>
          </div>
        </div>
      )
    default:
      return <Globe className="h-4 w-4 text-gray-600" />
  }
}

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const getVariant = () => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'default'
      case 'PAUSED':
        return 'secondary'
      case 'DELETED':
      case 'ARCHIVED':
        return 'destructive'
      default:
        return 'outline'
    }
  }
  
  const getIcon = () => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return <CheckCircle className="h-3 w-3" />
      case 'PAUSED':
        return <Pause className="h-3 w-3" />
      case 'DELETED':
      case 'ARCHIVED':
        return <XCircle className="h-3 w-3" />
      default:
        return <AlertCircle className="h-3 w-3" />
    }
  }
  
  return (
    <Badge variant={getVariant()} className="text-xs gap-1 whitespace-nowrap">
      {getIcon()}
      {status}
    </Badge>
  )
}

// Format metric
const formatMetric = (value: number, type: string) => {
  switch (type) {
    case 'currency':
      return `$${value.toFixed(2)}`
    case 'percentage':
      return `${value.toFixed(2)}%`
    case 'decimal':
      return value.toFixed(2)
    case 'integer':
      return Math.round(value).toLocaleString()
    default:
      return value.toString()
  }
}

interface FacebookTableViewProps {
  campaigns: any[]
  searchQuery: string
  statusFilter: string
  platformFilter: string
}

export default function FacebookTableView({ 
  campaigns, 
  searchQuery, 
  statusFilter, 
  platformFilter 
}: FacebookTableViewProps) {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'adsets' | 'ads'>('campaigns')
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])
  const [selectedAdSets, setSelectedAdSets] = useState<string[]>([])
  const [selectedAdForPreview, setSelectedAdForPreview] = useState<any>(null)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null
      }
      return { key, direction: 'asc' }
    })
  }

  const filteredCampaigns = useMemo(() => {
    let filtered = [...campaigns]
    
    if (platformFilter !== 'all') {
      filtered = filtered.filter(campaign => {
        const campaignPlatform = campaign.provider || 'meta'
        return campaignPlatform.toLowerCase() === platformFilter.toLowerCase()
      })
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => 
        campaign.status?.toUpperCase() === statusFilter
      )
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(campaign =>
        campaign.name?.toLowerCase().includes(query)
      )
    }
    
    if (sortConfig) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key] || a.metrics?.[sortConfig.key] || 0
        let bValue = b[sortConfig.key] || b.metrics?.[sortConfig.key] || 0
        
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase()
          bValue = bValue.toLowerCase()
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    
    return filtered
  }, [campaigns, platformFilter, statusFilter, searchQuery, sortConfig])

  const availableAdSets = useMemo(() => {
    const targetCampaigns = selectedCampaigns.length > 0 
      ? filteredCampaigns.filter(c => selectedCampaigns.includes(c.id))
      : filteredCampaigns

    const adSets: any[] = []
    targetCampaigns.forEach(campaign => {
      campaign.adGroups?.forEach((adSet: any) => {
        adSets.push({
          ...adSet,
          campaign,
          campaignId: campaign.id,
          campaignName: campaign.name
        })
      })
    })

    return adSets
  }, [filteredCampaigns, selectedCampaigns])

  const availableAds = useMemo(() => {
    const targetAdSets = selectedAdSets.length > 0 
      ? availableAdSets.filter(as => selectedAdSets.includes(as.id))
      : availableAdSets

    const ads: any[] = []
    targetAdSets.forEach(adSet => {
      adSet.ads?.forEach((ad: any) => {
        ads.push({
          ...ad,
          adSet,
          campaign: adSet.campaign,
          campaignId: adSet.campaignId,
          campaignName: adSet.campaignName,
          adSetId: adSet.id,
          adSetName: adSet.name
        })
      })
    })

    return ads
  }, [availableAdSets, selectedAdSets])

  const handleSelectAllCampaigns = (checked: boolean) => {
    setSelectedCampaigns(checked ? filteredCampaigns.map(c => c.id) : [])
  }

  const handleSelectAllAdSets = (checked: boolean) => {
    setSelectedAdSets(checked ? availableAdSets.map(as => as.id) : [])
  }

  return (
    <>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Ads Manager View
        </h3>
        <p className="text-sm text-muted-foreground">
          Hierarchical view of campaigns, ad sets, and ads
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="campaigns">
            <Megaphone className="mr-2 h-4 w-4" />
            Campaigns ({filteredCampaigns.length})
          </TabsTrigger>
          <TabsTrigger value="adsets">
            <FolderOpen className="mr-2 h-4 w-4" />
            Ad Sets ({availableAdSets.length})
          </TabsTrigger>
          <TabsTrigger value="ads">
            <FileImage className="mr-2 h-4 w-4" />
            Ads ({availableAds.length})
          </TabsTrigger>
        </TabsList>

        {/* CAMPAIGNS TAB - Simple scrollable container */}
        <TabsContent value="campaigns" className="mt-4">
          <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto' }} className="rounded-md border">
            <table className="w-full text-sm" style={{ minWidth: '1000px' }}>
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-12">
                    <Checkbox
                      checked={filteredCampaigns.length > 0 && selectedCampaigns.length === filteredCampaigns.length}
                      onCheckedChange={handleSelectAllCampaigns}
                    />
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[250px]">
                    Campaign
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-24">Platform</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-28">Status</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-24">Spend</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-32">Impressions</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-24">Clicks</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-20">CTR</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-20">CPC</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-20">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((campaign) => (
                  <tr 
                    key={campaign.id}
                    className={cn(
                      "border-b cursor-pointer hover:bg-muted/50",
                      selectedCampaigns.includes(campaign.id) && "bg-muted"
                    )}
                    onClick={() => {
                      if (selectedCampaigns.includes(campaign.id)) {
                        setSelectedCampaigns(prev => prev.filter(id => id !== campaign.id))
                      } else {
                        setSelectedCampaigns(prev => [...prev, campaign.id])
                      }
                    }}
                  >
                    <td className="p-4 align-middle">
                      <Checkbox
                        checked={selectedCampaigns.includes(campaign.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="p-4 align-middle font-medium">
                      <div className="truncate max-w-[300px]" title={campaign.name}>
                        {campaign.name}
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <PlatformIcon platform={campaign.provider || 'meta'} />
                    </td>
                    <td className="p-4 align-middle">
                      <StatusBadge status={campaign.status} />
                    </td>
                    <td className="p-4 align-middle text-right tabular-nums">
                      {formatMetric(campaign.metrics?.spend || 0, 'currency')}
                    </td>
                    <td className="p-4 align-middle text-right tabular-nums">
                      {formatMetric(campaign.metrics?.impressions || 0, 'integer')}
                    </td>
                    <td className="p-4 align-middle text-right tabular-nums">
                      {formatMetric(campaign.metrics?.clicks || 0, 'integer')}
                    </td>
                    <td className="p-4 align-middle text-right tabular-nums">
                      {formatMetric(campaign.metrics?.ctr || 0, 'percentage')}
                    </td>
                    <td className="p-4 align-middle text-right tabular-nums">
                      {formatMetric(campaign.metrics?.cpc || 0, 'currency')}
                    </td>
                    <td className="p-4 align-middle text-right tabular-nums">
                      {formatMetric(campaign.metrics?.roas || 0, 'decimal')}x
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* AD SETS TAB */}
        <TabsContent value="adsets" className="mt-4">
          <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto' }} className="rounded-md border">
            <table className="w-full text-sm" style={{ minWidth: '1100px' }}>
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-12">
                    <Checkbox
                      checked={availableAdSets.length > 0 && selectedAdSets.length === availableAdSets.length}
                      onCheckedChange={handleSelectAllAdSets}
                    />
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[250px]">Ad Set</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[250px]">Campaign</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-28">Status</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-24">Spend</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-32">Impressions</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-24">Clicks</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-20">CTR</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-20">CPC</th>
                </tr>
              </thead>
              <tbody>
                {availableAdSets.map((adSet) => (
                  <tr 
                    key={adSet.id}
                    className={cn(
                      "border-b cursor-pointer hover:bg-muted/50",
                      selectedAdSets.includes(adSet.id) && "bg-muted"
                    )}
                    onClick={() => {
                      if (selectedAdSets.includes(adSet.id)) {
                        setSelectedAdSets(prev => prev.filter(id => id !== adSet.id))
                      } else {
                        setSelectedAdSets(prev => [...prev, adSet.id])
                      }
                    }}
                  >
                    <td className="p-4 align-middle">
                      <Checkbox
                        checked={selectedAdSets.includes(adSet.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="p-4 align-middle font-medium">
                      <div className="truncate max-w-[300px]" title={adSet.name}>
                        {adSet.name}
                      </div>
                    </td>
                    <td className="p-4 align-middle text-muted-foreground">
                      <div className="truncate max-w-[300px]" title={adSet.campaignName}>
                        {adSet.campaignName}
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <StatusBadge status={adSet.status} />
                    </td>
                    <td className="p-4 align-middle text-right tabular-nums">
                      {formatMetric(adSet.metadata?.insights?.spend || 0, 'currency')}
                    </td>
                    <td className="p-4 align-middle text-right tabular-nums">
                      {formatMetric(adSet.metadata?.insights?.impressions || 0, 'integer')}
                    </td>
                    <td className="p-4 align-middle text-right tabular-nums">
                      {formatMetric(adSet.metadata?.insights?.clicks || 0, 'integer')}
                    </td>
                    <td className="p-4 align-middle text-right tabular-nums">
                      {formatMetric(adSet.metadata?.insights?.ctr || 0, 'percentage')}
                    </td>
                    <td className="p-4 align-middle text-right tabular-nums">
                      {formatMetric(adSet.metadata?.insights?.cpc || 0, 'currency')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ADS TAB */}
        <TabsContent value="ads" className="mt-4">
          <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto' }} className="rounded-md border">
            <table className="w-full text-sm" style={{ minWidth: '1300px' }}>
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-20">Creative</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[200px]">Ad</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[180px]">Ad Set</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[180px]">Campaign</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-24">Format</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-28">Status</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-24">Spend</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-32">Impressions</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-24">Clicks</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-20">CTR</th>
                </tr>
              </thead>
              <tbody>
                {availableAds.map((ad) => {
                  const format = getCreativeFormat(ad.creative)
                  const FormatIcon = format === 'video' ? Play : 
                                   format === 'carousel' ? Layers : ImageIcon
                  
                  return (
                    <tr 
                      key={ad.id}
                      className="border-b cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedAdForPreview(ad)}
                    >
                      <td className="p-4 align-middle">
                        <div className="relative w-12 h-12 rounded overflow-hidden bg-muted">
                          {getCreativeImageUrl(ad.creative) ? (
                            <img 
                              src={getCreativeImageUrl(ad.creative) || ''} 
                              alt={ad.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FormatIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 align-middle font-medium">
                        <div className="truncate max-w-[250px]" title={ad.name}>
                          {ad.name}
                        </div>
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        <div className="truncate max-w-[200px]" title={ad.adSetName}>
                          {ad.adSetName}
                        </div>
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        <div className="truncate max-w-[200px]" title={ad.campaignName}>
                          {ad.campaignName}
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2">
                          <FormatIcon className="h-4 w-4 flex-shrink-0" />
                          <span className="capitalize truncate">{format}</span>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <StatusBadge status={ad.status} />
                      </td>
                      <td className="p-4 align-middle text-right tabular-nums">
                        {formatMetric(ad.metadata?.insights?.spend || 0, 'currency')}
                      </td>
                      <td className="p-4 align-middle text-right tabular-nums">
                        {formatMetric(ad.metadata?.insights?.impressions || 0, 'integer')}
                      </td>
                      <td className="p-4 align-middle text-right tabular-nums">
                        {formatMetric(ad.metadata?.insights?.clicks || 0, 'integer')}
                      </td>
                      <td className="p-4 align-middle text-right tabular-nums">
                        {formatMetric(ad.metadata?.insights?.ctr || 0, 'percentage')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Ad Preview Dialog */}
      <AdDetailDialogEnhanced 
        ad={selectedAdForPreview}
        campaign={selectedAdForPreview?.campaign}
        adSet={selectedAdForPreview?.adSet}
        open={!!selectedAdForPreview}
        onClose={() => setSelectedAdForPreview(null)}
      />
    </>
  )
}