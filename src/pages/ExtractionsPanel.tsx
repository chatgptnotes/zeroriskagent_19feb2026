import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

interface ExtractionRecord {
  id: string
  hospital_name: string
  extracted_at: string
  total_claims: any
  stage_data: any
  payer_type: string | null
  upload_id: string | null
  created_at: string
}

const PANEL_TYPES = ['all', 'esic', 'cghs', 'echs', 'other'] as const

function getPanelBadgeStyle(panelType: string | null) {
  switch (panelType?.toLowerCase()) {
    case 'esic':
      return 'bg-blue-100 text-blue-800'
    case 'cghs':
      return 'bg-purple-100 text-purple-800'
    case 'echs':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function getTotalClaimsCount(totalClaims: any): number | string {
  if (!totalClaims) return 0
  if (typeof totalClaims === 'number') return totalClaims
  if (totalClaims.counts !== undefined) return totalClaims.counts
  if (totalClaims.totalRecords !== undefined) return totalClaims.totalRecords
  return '-'
}

export default function ExtractionsPanel() {
  const [extractions, setExtractions] = useState<ExtractionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPanel, setFilterPanel] = useState<string>('all')
  const [searchHospital, setSearchHospital] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [viewRecord, setViewRecord] = useState<ExtractionRecord | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchExtractions()
  }, [])

  const fetchExtractions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('esic_claims_extractions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching extractions:', error)
        return
      }

      setExtractions(data || [])
    } catch (err) {
      console.error('Error fetching extractions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this extraction?')) return
    setDeleting(id)
    try {
      const { error } = await supabase
        .from('esic_claims_extractions')
        .delete()
        .eq('id', id)

      if (error) {
        alert(`Failed to delete: ${error.message}`)
      } else {
        setExtractions(prev => prev.filter(e => e.id !== id))
        if (viewRecord?.id === id) setViewRecord(null)
      }
    } catch (err) {
      alert('Failed to delete extraction')
    } finally {
      setDeleting(null)
    }
  }

  // Apply filters
  const filtered = extractions.filter(e => {
    if (filterPanel !== 'all' && (e.payer_type?.toLowerCase() || 'other') !== filterPanel) return false
    if (searchHospital && !e.hospital_name.toLowerCase().includes(searchHospital.toLowerCase())) return false
    if (dateFrom) {
      const created = new Date(e.created_at).toISOString().split('T')[0]
      if (created < dateFrom) return false
    }
    if (dateTo) {
      const created = new Date(e.created_at).toISOString().split('T')[0]
      if (created > dateTo) return false
    }
    return true
  })

  // Summary counts
  const totalCount = extractions.length
  const panelCounts = extractions.reduce<Record<string, number>>((acc, e) => {
    const key = (e.payer_type || 'other').toLowerCase()
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="material-icon text-primary-600 animate-pulse" style={{ fontSize: '48px' }}>autorenew</span>
          <p className="text-gray-600">Loading extractions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="material-icon text-primary-600">analytics</span>
            Extractions Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            View and manage all extracted panel data from uploaded images.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-icon text-gray-500" style={{ fontSize: '20px' }}>folder</span>
              <span className="text-sm font-medium text-gray-500">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
          </div>
          {['esic', 'cghs', 'echs', 'other'].map(panel => (
            <div key={panel} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPanelBadgeStyle(panel)}`}>
                  {panel.toUpperCase()}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{panelCounts[panel] || 0}</p>
            </div>
          ))}
        </div>

        {/* Filters Row */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Panel Type:</label>
              <select
                value={filterPanel}
                onChange={e => setFilterPanel(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-primary-500 focus:border-primary-500"
              >
                {PANEL_TYPES.map(p => (
                  <option key={p} value={p}>{p === 'all' ? 'All Panels' : p.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <span className="material-icon text-gray-400" style={{ fontSize: '20px' }}>search</span>
              <input
                type="text"
                placeholder="Search hospital name..."
                value={searchHospital}
                onChange={e => setSearchHospital(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-full focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <button
              onClick={fetchExtractions}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"
            >
              <span className="material-icon" style={{ fontSize: '16px' }}>refresh</span>
              Refresh
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-icon text-gray-400" style={{ fontSize: '48px' }}>inbox</span>
              <p className="text-gray-500 mt-2">No extractions found</p>
              <p className="text-sm text-gray-400 mt-1">
                {extractions.length > 0 ? 'Try adjusting your filters' : 'Upload images to extract panel data'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hospital Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Panel Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Extracted At</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Claims</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((extraction, index) => (
                    <tr key={extraction.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{extraction.hospital_name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getPanelBadgeStyle(extraction.payer_type)}`}>
                          {(extraction.payer_type || 'other').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(extraction.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        <span className="text-gray-400 ml-1">
                          {new Date(extraction.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-medium text-gray-900">
                        {getTotalClaimsCount(extraction.total_claims)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setViewRecord(extraction)}
                            className="px-3 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200"
                          >
                            <span className="material-icon" style={{ fontSize: '14px' }}>visibility</span>
                            View
                          </button>
                          <button
                            onClick={() => handleDelete(extraction.id)}
                            disabled={deleting === extraction.id}
                            className="px-3 py-1 rounded text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            <span className="material-icon" style={{ fontSize: '14px' }}>
                              {deleting === extraction.id ? 'refresh' : 'delete'}
                            </span>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table footer */}
          {filtered.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
              Showing {filtered.length} of {totalCount} extractions
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-6 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-gray-400">
          <p>Extractions Dashboard | zeroriskagent.com</p>
        </div>
      </footer>

      {/* Report Modal */}
      {viewRecord && (
        <ReportModal extraction={viewRecord} onClose={() => setViewRecord(null)} />
      )}
    </div>
  )
}

/* ─── Report Modal ─── */
function ReportModal({ extraction, onClose }: { extraction: ExtractionRecord; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null)
  const stageData = Array.isArray(extraction.stage_data) ? extraction.stage_data : []
  const hasStageStatuses = stageData.length > 0 && stageData[0]?.stage !== undefined && stageData[0]?.statuses !== undefined
  const panelLabel = (extraction.payer_type || 'other').toUpperCase()
  const dateStr = new Date(extraction.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = new Date(extraction.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const totalClaims = getTotalClaimsCount(extraction.total_claims)

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>${extraction.hospital_name} - ${panelLabel} Report</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1a1a1a; }
            .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #0d9488; padding-bottom: 16px; }
            .header h1 { font-size: 20px; color: #0d9488; margin-bottom: 4px; }
            .header h2 { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
            .meta { display: flex; justify-content: center; gap: 24px; font-size: 12px; color: #555; }
            .meta span { display: inline-flex; align-items: center; gap: 4px; }
            .badge { background: #e0f2fe; color: #0369a1; padding: 2px 10px; border-radius: 10px; font-weight: 600; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
            th { background: #0d9488; color: white; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
            td { padding: 6px 10px; border-bottom: 1px solid #d1d5db; }
            tr:nth-child(even) td { background: #f0fdfa; }
            .stage-cell { background: #ccfbf1 !important; font-weight: 600; color: #134e4a; }
            .highlighted { color: #b91c1c; font-weight: 500; }
            .text-right { text-align: right; }
            .total-row td { background: #0d9488 !important; color: white; font-weight: 700; }
            .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 12px; }
            @media print { body { padding: 15px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Zero Risk Agent</h1>
            <h2>${extraction.hospital_name}</h2>
            <div class="meta">
              <span>Panel: <span class="badge">${panelLabel}</span></span>
              <span>Date: ${dateStr} ${timeStr}</span>
              <span>Total Claims: <strong>${totalClaims}</strong></span>
            </div>
          </div>
          ${content.innerHTML}
          <div class="footer">
            <p>Generated from Extractions Dashboard | zeroriskagent.com | Printed on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal - flex column, max height fills viewport */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[95%] max-w-6xl z-10 flex flex-col" style={{ maxHeight: 'calc(100vh - 40px)' }}>
        {/* Modal Header - fixed at top */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 rounded-t-xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-teal-100 rounded-lg p-2">
                <span className="material-icon text-teal-700" style={{ fontSize: '24px' }}>description</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{extraction.hospital_name}</h2>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getPanelBadgeStyle(extraction.payer_type)}`}>
                    {panelLabel}
                  </span>
                  <span className="text-sm text-gray-500">{dateStr}, {timeStr}</span>
                  <span className="text-sm text-gray-500">|</span>
                  <span className="text-sm font-medium text-gray-700">Total Claims: {totalClaims}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 flex items-center gap-1.5 transition-colors"
              >
                <span className="material-icon" style={{ fontSize: '16px' }}>print</span>
                Print Report
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <span className="material-icon" style={{ fontSize: '24px' }}>close</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body - only this scrolls */}
        <div className="flex-1 overflow-y-auto p-6">
          <div ref={printRef}>
            {hasStageStatuses ? (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full">
                  <thead className="bg-teal-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase border-r border-teal-600 min-w-[180px]">Stage</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase border-r border-teal-600 min-w-[280px]">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-white uppercase border-r border-teal-600 min-w-[100px]">In Patient</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-white uppercase border-r border-teal-600 min-w-[100px]">OPD Patient</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-white uppercase border-r border-teal-600 min-w-[80px]">Counts</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-white uppercase min-w-[100px]">Enhancement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stageData.map((stage: any, stageIndex: number) =>
                      (stage.statuses || []).map((status: any, statusIndex: number) => (
                        <tr
                          key={`${stageIndex}-${statusIndex}`}
                          className={`${statusIndex % 2 === 0 ? 'bg-teal-50' : 'bg-teal-100'} hover:bg-teal-200 border-b border-teal-200`}
                        >
                          <td className={`px-4 py-2 text-sm font-semibold text-teal-900 border-r border-teal-200 ${statusIndex === 0 ? 'bg-teal-200' : 'bg-transparent'}`}>
                            {statusIndex === 0 ? stage.stage : ''}
                          </td>
                          <td className={`px-4 py-2 text-sm border-r border-teal-200 ${status.isHighlighted ? 'text-red-700 font-medium' : 'text-teal-800'}`}>
                            {status.status}
                          </td>
                          <td className="px-4 py-2 text-sm text-teal-800 text-right border-r border-teal-200 font-medium">{status.inPatient}</td>
                          <td className="px-4 py-2 text-sm text-teal-800 text-right border-r border-teal-200 font-medium">{status.opd}</td>
                          <td className="px-4 py-2 text-sm text-teal-800 text-right border-r border-teal-200 font-medium">{status.counts}</td>
                          <td className="px-4 py-2 text-sm text-teal-800 text-right font-medium">{status.enhancement}</td>
                        </tr>
                      ))
                    )}
                    {extraction.total_claims && typeof extraction.total_claims === 'object' && extraction.total_claims.counts !== undefined && (
                      <tr className="bg-teal-700 font-bold">
                        <td className="px-4 py-3 text-sm text-white border-r border-teal-600" colSpan={2}>Total Claims</td>
                        <td className="px-4 py-3 text-sm text-white text-right border-r border-teal-600">{extraction.total_claims.inPatient}</td>
                        <td className="px-4 py-3 text-sm text-white text-right border-r border-teal-600">{extraction.total_claims.opd}</td>
                        <td className="px-4 py-3 text-sm text-white text-right border-r border-teal-600">{extraction.total_claims.counts}</td>
                        <td className="px-4 py-3 text-sm text-white text-right">{extraction.total_claims.enhancement}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : stageData.length > 0 ? (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      {Object.keys(stageData[0]).map(key => (
                        <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stageData.map((record: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {Object.values(record).map((val: any, j: number) => (
                          <td key={j} className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
                            {val !== null && val !== undefined ? String(val) : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No stage data available</p>
            )}
          </div>
        </div>

        {/* Modal Footer - fixed at bottom */}
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 rounded-b-xl px-6 py-3 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            Extraction ID: {extraction.id.slice(0, 8)}...
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
