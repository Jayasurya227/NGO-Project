# Copy and paste this entire script into PowerShell in your NGO_IMPACT directory

# Day 12 Installation Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Day 12 Installation - Match Results UI" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Create matches folder
Write-Host "`n[1/4] Creating matches folder..." -ForegroundColor Green
$matchesDir = "apps\web-admin\app\dashboard\matches"
if (!(Test-Path $matchesDir)) {
    New-Item -Path $matchesDir -ItemType Directory -Force | Out-Null
    Write-Host "✅ Matches folder created" -ForegroundColor Green
} else {
    Write-Host "✅ Matches folder already exists" -ForegroundColor Green
}

# 2. Create components folder if needed
Write-Host "`n[2/4] Creating components folder..." -ForegroundColor Green
$componentsDir = "apps\web-admin\components"
if (!(Test-Path $componentsDir)) {
    New-Item -Path $componentsDir -ItemType Directory -Force | Out-Null
    Write-Host "✅ Components folder created" -ForegroundColor Green
} else {
    Write-Host "✅ Components folder already exists" -ForegroundColor Green
}

# 3. Create matches page
Write-Host "`n[3/4] Installing matches page..." -ForegroundColor Green
$matchesPagePath = "$matchesDir\page.tsx"

$matchesCode = @'
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SubScoreChart from '../../components/SubScoreChart'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface SubScore {
  strategicAlignment: number
  budgetFit: number
  geographicMatch: number
  impactPotential: number
  timelineAlignment: number
}

interface MatchResult {
  id: string
  donorId: string
  initiativeId: string
  overallScore: number
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  aiReasoning: string
  subScores: SubScore
  donorName: string
  initiativeName: string
  matchDate: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
}

interface DetailModalProps {
  match: MatchResult
  onClose: () => void
}

const DetailModal = ({ match, onClose }: DetailModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Match Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-600">Donor</h3>
              <p className="text-lg text-gray-900">{match.donorName}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-600">Initiative</h3>
              <p className="text-lg text-gray-900">{match.initiativeName}</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overall Match Score</p>
                <p className="text-3xl font-bold text-green-600">
                  {match.overallScore.toFixed(1)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Confidence</p>
                <p
                  className={`text-lg font-semibold ${
                    match.confidence === 'HIGH'
                      ? 'text-green-600'
                      : match.confidence === 'MEDIUM'
                        ? 'text-yellow-600'
                        : 'text-orange-600'
                  }`}
                >
                  {match.confidence}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">AI Reasoning</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-gray-700 text-sm leading-relaxed">
                {match.aiReasoning}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-4">Score Breakdown</h3>
            <SubScoreChart scores={match.subScores} />
          </div>

          <div className="text-xs text-gray-500">
            Matched on {new Date(match.matchDate).toLocaleDateString()}
          </div>
        </div>

        <div className="border-t bg-gray-50 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Close
          </button>
          <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
            Accept Match
          </button>
          <button className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MatchResultsPage() {
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [filteredMatches, setFilteredMatches] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null)
  const [sortBy, setSortBy] = useState<'score' | 'confidence' | 'date'>('score')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchMatches()
  }, [])

  const fetchMatches = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/agents/jobs`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch matches')

      const data = await response.json()
      const formattedMatches = data.matches || []
      setMatches(formattedMatches)
      applyFiltersAndSort(formattedMatches, sortBy, filterStatus, searchQuery)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matches')
    } finally {
      setLoading(false)
    }
  }

  const applyFiltersAndSort = (
    data: MatchResult[],
    sort: typeof sortBy,
    status: typeof filterStatus,
    search: string
  ) => {
    let filtered = data

    if (status !== 'ALL') {
      filtered = filtered.filter((m) => m.status === status)
    }

    if (search) {
      filtered = filtered.filter(
        (m) =>
          m.donorName.toLowerCase().includes(search.toLowerCase()) ||
          m.initiativeName.toLowerCase().includes(search.toLowerCase())
      )
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sort === 'score') {
        return b.overallScore - a.overallScore
      } else if (sort === 'confidence') {
        const confidenceOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
        return confidenceOrder[b.confidence] - confidenceOrder[a.confidence]
      } else {
        return new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime()
      }
    })

    setFilteredMatches(sorted)
  }

  const handleSortChange = (newSort: typeof sortBy) => {
    setSortBy(newSort)
    applyFiltersAndSort(matches, newSort, filterStatus, searchQuery)
  }

  const handleStatusChange = (newStatus: typeof filterStatus) => {
    setFilterStatus(newStatus)
    applyFiltersAndSort(matches, sortBy, newStatus, searchQuery)
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    applyFiltersAndSort(matches, sortBy, filterStatus, query)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-700'
    if (score >= 60) return 'bg-yellow-100 text-yellow-700'
    return 'bg-orange-100 text-orange-700'
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'HIGH':
        return 'bg-green-100 text-green-700'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-700'
      case 'LOW':
        return 'bg-orange-100 text-orange-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading match results...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Match Results</h1>
          <p className="text-gray-600">
            AI-generated donor-initiative matches with confidence scores
          </p>
        </div>

        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Donor or initiative name..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => handleStatusChange(e.target.value as typeof filterStatus)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Review</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as typeof sortBy)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="score">Highest Score</option>
                <option value="confidence">Confidence Level</option>
                <option value="date">Most Recent</option>
              </select>
            </div>

            <div className="flex items-end">
              <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-600">
                  <span className="font-bold text-lg">{filteredMatches.length}</span> matches found
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {filteredMatches.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-500 text-lg">No matches found</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredMatches.map((match) => (
              <div
                key={match.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer border-l-4 border-blue-500"
                onClick={() => setSelectedMatch(match)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {match.donorName} ↔ {match.initiativeName}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600">{match.aiReasoning}</p>
                  </div>

                  <div
                    className={`${getScoreColor(
                      match.overallScore
                    )} px-4 py-2 rounded-lg text-center min-w-[100px]`}
                  >
                    <div className="text-2xl font-bold">
                      {match.overallScore.toFixed(0)}%
                    </div>
                    <div className="text-xs font-medium">Overall Score</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="grid grid-cols-5 gap-2">
                    <div className="text-center">
                      <div className="w-full bg-gray-200 rounded h-2 mb-1 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full"
                          style={{
                            width: `${match.subScores.strategicAlignment}%`,
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600">Strategic</p>
                    </div>
                    <div className="text-center">
                      <div className="w-full bg-gray-200 rounded h-2 mb-1 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full"
                          style={{ width: `${match.subScores.budgetFit}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600">Budget</p>
                    </div>
                    <div className="text-center">
                      <div className="w-full bg-gray-200 rounded h-2 mb-1 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full"
                          style={{
                            width: `${match.subScores.geographicMatch}%`,
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600">Geographic</p>
                    </div>
                    <div className="text-center">
                      <div className="w-full bg-gray-200 rounded h-2 mb-1 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full"
                          style={{
                            width: `${match.subScores.impactPotential}%`,
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600">Impact</p>
                    </div>
                    <div className="text-center">
                      <div className="w-full bg-gray-200 rounded h-2 mb-1 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full"
                          style={{
                            width: `${match.subScores.timelineAlignment}%`,
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600">Timeline</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getConfidenceColor(match.confidence)}`}>
                      {match.confidence} Confidence
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        match.status === 'PENDING'
                          ? 'bg-gray-100 text-gray-700'
                          : match.status === 'ACCEPTED'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {match.status}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(match.matchDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedMatch && (
        <DetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      )}
    </div>
  )
}
'@

$matchesCode | Out-File -Encoding UTF8 -FilePath $matchesPagePath
Write-Host "✅ Matches page installed" -ForegroundColor Green

# 4. Create SubScoreChart
Write-Host "`n[4/4] Installing SubScoreChart component..." -ForegroundColor Green
$subScoreChartPath = "$componentsDir\SubScoreChart.tsx"

$subScoreCode = @'
'use client'

interface SubScore {
  strategicAlignment: number
  budgetFit: number
  geographicMatch: number
  impactPotential: number
  timelineAlignment: number
}

interface SubScoreChartProps {
  scores: SubScore
}

const criteria = [
  {
    key: 'strategicAlignment' as const,
    label: 'Strategic Alignment',
    weight: 30,
    description: 'How well does the donor align with the initiative\'s goals?',
  },
  {
    key: 'budgetFit' as const,
    label: 'Budget Fit',
    weight: 25,
    description: 'Does the donor\'s funding capacity match the initiative\'s budget?',
  },
  {
    key: 'geographicMatch' as const,
    label: 'Geographic Match',
    weight: 15,
    description: 'Are donor and initiative in the same or nearby geographic regions?',
  },
  {
    key: 'impactPotential' as const,
    label: 'Impact Potential',
    weight: 20,
    description: 'Can the partnership create significant social impact?',
  },
  {
    key: 'timelineAlignment' as const,
    label: 'Timeline Alignment',
    weight: 10,
    description: 'Do the initiative and donor timelines align?',
  },
]

const getBarColor = (score: number): string => {
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-yellow-500'
  return 'bg-orange-500'
}

const getScoreLabel = (score: number): string => {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Poor'
}

export default function SubScoreChart({ scores }: SubScoreChartProps) {
  return (
    <div className="w-full space-y-6">
      <div className="space-y-4">
        {criteria.map((criterion) => {
          const score = scores[criterion.key]

          return (
            <div key={criterion.key} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">
                    {criterion.label}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    {criterion.description}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {score.toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-600">
                    Weight: {criterion.weight}%
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getBarColor(
                      score
                    )}`}
                    style={{ width: `${score}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="mt-2 text-xs font-medium text-gray-700">
                Status: <span className="text-gray-900">{getScoreLabel(score)}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Score Summary</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-600">Average Score</p>
            <p className="text-xl font-bold text-gray-900">
              {(
                (scores.strategicAlignment +
                  scores.budgetFit +
                  scores.geographicMatch +
                  scores.impactPotential +
                  scores.timelineAlignment) /
                5
              ).toFixed(0)}
              %
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Highest Score</p>
            <p className="text-xl font-bold text-gray-900">
              {Math.max(
                scores.strategicAlignment,
                scores.budgetFit,
                scores.geographicMatch,
                scores.impactPotential,
                scores.timelineAlignment
              ).toFixed(0)}
              %
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Lowest Score</p>
            <p className="text-xl font-bold text-gray-900">
              {Math.min(
                scores.strategicAlignment,
                scores.budgetFit,
                scores.geographicMatch,
                scores.impactPotential,
                scores.timelineAlignment
              ).toFixed(0)}
              %
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3 text-sm">Score Scale</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 rounded bg-green-500"></div>
            <span className="text-sm text-gray-700">≥80% - Excellent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 rounded bg-yellow-500"></div>
            <span className="text-sm text-gray-700">60-79% - Good</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 rounded bg-orange-500"></div>
            <span className="text-sm text-gray-700">40-59% - Fair</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 rounded bg-red-500"></div>
            <span className="text-sm text-gray-700">&lt;40% - Poor</span>
          </div>
        </div>
      </div>
    </div>
  )
}
'@

$subScoreCode | Out-File -Encoding UTF8 -FilePath $subScoreChartPath
Write-Host "✅ SubScoreChart installed" -ForegroundColor Green

# Verification
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$matches_ok = Test-Path $matchesPagePath
$subscores_ok = Test-Path $subScoreChartPath

Write-Host "`n✅ Matches Page: $(if ($matches_ok) { 'INSTALLED' } else { 'NOT FOUND' })" -ForegroundColor $(if ($matches_ok) { 'Green' } else { 'Red' })
Write-Host "✅ SubScoreChart: $(if ($subscores_ok) { 'INSTALLED' } else { 'NOT FOUND' })" -ForegroundColor $(if ($subscores_ok) { 'Green' } else { 'Red' })

if ($matches_ok -and $subscores_ok) {
    Write-Host "`n🎉 DAY 12 INSTALLATION COMPLETE!" -ForegroundColor Green
    Write-Host "Run 'npm run dev' to start your dev server" -ForegroundColor Cyan
    Write-Host "Navigate to http://localhost:3000/dashboard/matches" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Installation incomplete!" -ForegroundColor Red
}