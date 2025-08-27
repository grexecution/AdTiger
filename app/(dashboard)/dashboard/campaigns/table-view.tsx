"use client"

import { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Facebook,
  Instagram,
  Globe,
  Play,
  Image as ImageIcon,
  Layers,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointerClick,
  DollarSign,
  Target,
  BarChart3,
  AlertCircle,
  CheckCircle,
  XCircle,
  Pause,
  ExternalLink,
  MoreVertical,
  Copy,
  Edit,
  Trash2
} from "lucide-react"
import { getCurrencySymbol } from "@/lib/currency"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// Platform icons
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
        <div className="flex items-center gap-1">
          <div className="h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">G</div>
        </div>
      )
    default:
      return <Globe className="h-4 w-4 text-gray-600" />
  }
}

// Status icon
const StatusIcon = ({ status }: { status: string }) => {
  switch (status?.toUpperCase()) {
    case 'ACTIVE':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'PAUSED':
      return <Pause className="h-4 w-4 text-yellow-500" />
    case 'DELETED':
    case 'ARCHIVED':
      return <XCircle className="h-4 w-4 text-red-500" />
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />
  }
}

// Format metric values
const formatMetric = (value: number, type: 'currency' | 'number' | 'percent' = 'number', currency: string = 'USD') => {
  if (value === null || value === undefined) return '-'
  
  switch (type) {
    case 'currency':
      const symbol = getCurrencySymbol(currency)
      return `${symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    case 'percent':
      return `${value.toFixed(2)}%`
    default:
      return value.toLocaleString('en-US')
  }
}

// Performance indicator
const PerformanceIndicator = ({ value, threshold, inverse = false }: { 
  value: number
  threshold: number
  inverse?: boolean 
}) => {
  const isGood = inverse ? value < threshold : value > threshold
  return (
    <div className="flex items-center gap-1">
      <span>{value.toFixed(2)}</span>
      {isGood ? (
        <TrendingUp className="h-3 w-3 text-green-500" />
      ) : (
        <TrendingDown className="h-3 w-3 text-red-500" />
      )}
    </div>
  )
}

interface TableViewProps {
  campaigns: any[]
  searchQuery: string
  statusFilter: string
  platformFilter: string
  adAccounts?: any[]
}

export default function TableView({ 
  campaigns, 
  searchQuery, 
  statusFilter,
  platformFilter,
  adAccounts = [] 
}: TableViewProps) {
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())
  const [expandedAdGroups, setExpandedAdGroups] = useState<Set<string>>(new Set())
  
  // Helper to get currency for a campaign
  const getCampaignCurrency = (campaign: any) => {
    const adAccount = adAccounts.find(acc => acc.id === campaign.adAccountId)
    return adAccount?.currency || campaign.budgetCurrency || 'USD'
  }
  
  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    let filtered = [...campaigns]
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(campaign => 
        campaign.name?.toLowerCase().includes(query) ||
        campaign.objective?.toLowerCase().includes(query)
      )
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => 
        campaign.status?.toUpperCase() === statusFilter
      )
    }
    
    if (platformFilter !== 'all') {
      filtered = filtered.filter(campaign => 
        campaign.provider?.toLowerCase() === platformFilter.toLowerCase()
      )
    }
    
    return filtered
  }, [campaigns, searchQuery, statusFilter, platformFilter])
  
  const toggleCampaign = (campaignId: string) => {
    const newExpanded = new Set(expandedCampaigns)
    if (newExpanded.has(campaignId)) {
      newExpanded.delete(campaignId)
    } else {
      newExpanded.add(campaignId)
    }
    setExpandedCampaigns(newExpanded)
  }
  
  const toggleAdGroup = (adGroupId: string) => {
    const newExpanded = new Set(expandedAdGroups)
    if (newExpanded.has(adGroupId)) {
      newExpanded.delete(adGroupId)
    } else {
      newExpanded.add(adGroupId)
    }
    setExpandedAdGroups(newExpanded)
  }
  
  const expandAll = () => {
    const allCampaignIds = filteredCampaigns.map(c => c.id)
    const allAdGroupIds = filteredCampaigns.flatMap(c => 
      c.adGroups?.map((ag: any) => ag.id) || []
    )
    setExpandedCampaigns(new Set(allCampaignIds))
    setExpandedAdGroups(new Set(allAdGroupIds))
  }
  
  const collapseAll = () => {
    setExpandedCampaigns(new Set())
    setExpandedAdGroups(new Set())
  }
  
  return (
    <div className="space-y-4">
      {/* Table Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            <ChevronDown className="h-4 w-4 mr-1" />
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            <ChevronRight className="h-4 w-4 mr-1" />
            Collapse All
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredCampaigns.length} campaigns
        </div>
      </div>
      
      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[30px]"></TableHead>
              <TableHead className="min-w-[250px]">Name</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-right">Impressions</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">CPC</TableHead>
              <TableHead className="text-right">Likes</TableHead>
              <TableHead className="text-right">Comments</TableHead>
              <TableHead className="text-right">Shares</TableHead>
              <TableHead className="text-right">ROAS</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                  No campaigns found
                </TableCell>
              </TableRow>
            ) : (
              filteredCampaigns.map((campaign) => (
                <Collapsible 
                  key={campaign.id}
                  open={expandedCampaigns.has(campaign.id)}
                  onOpenChange={() => toggleCampaign(campaign.id)}
                >
                  <>
                    {/* Campaign Row */}
                    <TableRow className="font-medium hover:bg-muted/50">
                      <TableCell>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            {expandedCampaigns.has(campaign.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="font-semibold">{campaign.name}</div>
                          <Badge variant="outline" className="text-xs">
                            {campaign.objective}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <PlatformIcon platform={campaign.provider} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <StatusIcon status={campaign.status} />
                          <span className="text-sm">{campaign.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMetric(campaign.budgetAmount, 'currency', getCampaignCurrency(campaign))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMetric(campaign.metrics?.spend, 'currency', getCampaignCurrency(campaign))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMetric(campaign.metrics?.impressions)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMetric(campaign.metrics?.clicks)}
                      </TableCell>
                      <TableCell className="text-right">
                        <PerformanceIndicator 
                          value={campaign.metrics?.ctr || 0} 
                          threshold={2}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMetric(campaign.metrics?.cpc, 'currency', getCampaignCurrency(campaign))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMetric(campaign.metadata?.insights?.likes || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMetric(campaign.metadata?.insights?.comments || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMetric(campaign.metadata?.insights?.shares || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <PerformanceIndicator 
                          value={campaign.metrics?.roas || 0} 
                          threshold={3}
                        />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View in {campaign.provider === 'meta' ? 'Meta' : 'Google'}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    
                    {/* Ad Groups */}
                    <CollapsibleContent asChild>
                      <>
                        {campaign.adGroups?.map((adGroup: any) => (
                          <Collapsible
                            key={adGroup.id}
                            open={expandedAdGroups.has(adGroup.id)}
                            onOpenChange={() => toggleAdGroup(adGroup.id)}
                          >
                            <>
                              {/* Ad Group Row */}
                              <TableRow className="bg-muted/20 hover:bg-muted/30">
                                <TableCell className="pl-8">
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                      {expandedAdGroups.has(adGroup.id) ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </CollapsibleTrigger>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2 pl-4">
                                    <div className="h-px w-4 bg-border" />
                                    <span className="font-medium">{adGroup.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell>-</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <StatusIcon status={adGroup.status} />
                                    <span className="text-sm">{adGroup.status}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatMetric(adGroup.budgetAmount, 'currency', getCampaignCurrency(campaign))}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatMetric(adGroup.metrics?.spend, 'currency', getCampaignCurrency(campaign))}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatMetric(adGroup.metrics?.impressions)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatMetric(adGroup.metrics?.clicks)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatMetric(adGroup.metrics?.ctr, 'percent')}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatMetric(adGroup.metrics?.cpc, 'currency', getCampaignCurrency(campaign))}
                                </TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-right">
                                  {formatMetric(adGroup.metrics?.roas)}x
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                              
                              {/* Ads */}
                              <CollapsibleContent asChild>
                                <>
                                  {adGroup.ads?.map((ad: any) => (
                                    <TableRow key={ad.id} className="hover:bg-muted/10">
                                      <TableCell></TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2 pl-12">
                                          <div className="h-px w-4 bg-border" />
                                          <div className="flex items-center gap-2">
                                            {ad.name?.toLowerCase().includes('video') ? (
                                              <Play className="h-4 w-4 text-muted-foreground" />
                                            ) : ad.name?.toLowerCase().includes('carousel') ? (
                                              <Layers className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                            )}
                                            <span className="text-sm">{ad.name}</span>
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="secondary" className="text-xs">
                                          {ad.type || 'display'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-1">
                                          <StatusIcon status={ad.status} />
                                          <span className="text-sm">{ad.status}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right">-</TableCell>
                                      <TableCell className="text-right">
                                        {formatMetric(ad.metadata?.insights?.spend || 0, 'currency', getCampaignCurrency(campaign))}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {formatMetric(ad.metadata?.insights?.impressions || 0)}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {formatMetric(ad.metadata?.insights?.clicks || 0)}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {formatMetric(ad.metadata?.insights?.ctr || 0, 'percent')}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {formatMetric(ad.metadata?.insights?.cpc || 0, 'currency', getCampaignCurrency(campaign))}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {formatMetric(ad.metadata?.insights?.likes || 0)}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {formatMetric(ad.metadata?.insights?.comments || 0)}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {formatMetric(ad.metadata?.insights?.shares || 0)}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {formatMetric(ad.metadata?.insights?.purchaseRoas || 0)}x
                                      </TableCell>
                                      <TableCell>
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <ExternalLink className="h-4 w-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>View Ad</TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </>
                              </CollapsibleContent>
                            </>
                          </Collapsible>
                        ))}
                      </>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Summary Row */}
      <div className="border rounded-lg p-4 bg-muted/30">
        <div className="grid grid-cols-6 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Spend</p>
            <p className="text-xl font-bold">
              {formatMetric(
                filteredCampaigns.reduce((sum, c) => sum + (c.metrics?.spend || 0), 0),
                'currency',
                'USD' // Total uses account base currency
              )}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Impressions</p>
            <p className="text-xl font-bold">
              {formatMetric(
                filteredCampaigns.reduce((sum, c) => sum + (c.metrics?.impressions || 0), 0)
              )}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Clicks</p>
            <p className="text-xl font-bold">
              {formatMetric(
                filteredCampaigns.reduce((sum, c) => sum + (c.metrics?.clicks || 0), 0)
              )}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Avg CTR</p>
            <p className="text-xl font-bold">
              {formatMetric(
                filteredCampaigns.reduce((sum, c) => sum + (c.metrics?.ctr || 0), 0) / 
                (filteredCampaigns.length || 1),
                'percent'
              )}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Conversions</p>
            <p className="text-xl font-bold">
              {formatMetric(
                filteredCampaigns.reduce((sum, c) => sum + (c.metrics?.conversions || 0), 0)
              )}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Avg ROAS</p>
            <p className="text-xl font-bold">
              {formatMetric(
                filteredCampaigns.reduce((sum, c) => sum + (c.metrics?.roas || 0), 0) / 
                (filteredCampaigns.length || 1)
              )}x
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}