import { useState, useEffect } from 'react'
import followUpService from '../services/followup.service'
import { FollowUp } from '../types/database.types'

interface FollowUpMetrics {
  total: number
  pending: number
  in_progress: number
  completed: number
  overdue: number
  high_priority: number
}

interface FollowUpFilters {
  status: string
  type: string
  priority: string
  overdue: boolean
  search: string
}

export function useFollowUps(initialHospitalId?: string) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [metrics, setMetrics] = useState<FollowUpMetrics>({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    overdue: 0,
    high_priority: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState<FollowUpFilters>({
    status: 'all',
    type: 'all',
    priority: 'all',
    overdue: false,
    search: ''
  })

  // Load metrics
  const loadMetrics = async (hospitalId?: string) => {
    try {
      const data = await followUpService.getFollowUpMetrics(hospitalId)
      setMetrics(data)
    } catch (err) {
      console.error('Error loading metrics:', err)
      setError('Failed to load metrics')
    }
  }

  // Load follow-ups with filters
  const loadFollowUps = async (hospitalId?: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const filterObj = {
        ...(hospitalId && { hospital_id: hospitalId }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.type !== 'all' && { follow_up_type: filters.type }),
        ...(filters.priority !== 'all' && { priority_min: parseInt(filters.priority) }),
        ...(filters.overdue && { overdue: true }),
        ...(filters.search && { search: filters.search })
      }

      const { data } = await followUpService.getFollowUps(filterObj)
      setFollowUps(data)
    } catch (err) {
      console.error('Error loading follow-ups:', err)
      setError('Failed to load follow-ups')
    } finally {
      setLoading(false)
    }
  }

  // Create new follow-up
  const createFollowUp = async (followUpData: {
    claim_id: string
    hospital_id: string
    follow_up_type: FollowUp['follow_up_type']
    priority_score: number
    due_date: string
    description: string
    action_required: string
    contact_person?: string
    contact_phone?: string
    contact_email?: string
  }) => {
    try {
      const result = await followUpService.createFollowUp(followUpData)
      if (result) {
        await loadFollowUps(initialHospitalId)
        await loadMetrics(initialHospitalId)
        return result
      }
      throw new Error('Failed to create follow-up')
    } catch (err) {
      console.error('Error creating follow-up:', err)
      setError('Failed to create follow-up')
      return null
    }
  }

  // Update follow-up
  const updateFollowUp = async (id: string, updates: Partial<FollowUp>) => {
    try {
      const result = await followUpService.updateFollowUp(id, updates)
      if (result) {
        await loadFollowUps(initialHospitalId)
        await loadMetrics(initialHospitalId)
        return result
      }
      throw new Error('Failed to update follow-up')
    } catch (err) {
      console.error('Error updating follow-up:', err)
      setError('Failed to update follow-up')
      return null
    }
  }

  // Send WhatsApp message
  const sendWhatsApp = async (followUpId: string, templateName: string, parameters: string[] = []) => {
    try {
      const result = await followUpService.sendWhatsAppFollowUp(followUpId, templateName, parameters)
      if (result.success) {
        await loadFollowUps(initialHospitalId)
        return result
      }
      throw new Error(result.error || 'Failed to send WhatsApp')
    } catch (err) {
      console.error('Error sending WhatsApp:', err)
      setError('Failed to send WhatsApp message')
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Send email
  const sendEmail = async (followUpId: string, templateId: string, variables: Record<string, string> = {}) => {
    try {
      const result = await followUpService.sendEmailFollowUp(followUpId, templateId, variables)
      if (result.success) {
        await loadFollowUps(initialHospitalId)
        return result
      }
      throw new Error(result.error || 'Failed to send email')
    } catch (err) {
      console.error('Error sending email:', err)
      setError('Failed to send email')
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Send bulk communications
  const sendBulkCommunications = async (
    followUpIds: string[],
    channel: 'whatsapp' | 'email',
    templateId: string,
    variables: Record<string, string> = {}
  ) => {
    try {
      const result = await followUpService.sendBulkCommunications(followUpIds, channel, templateId, variables)
      await loadFollowUps(initialHospitalId)
      await loadMetrics(initialHospitalId)
      return result
    } catch (err) {
      console.error('Error sending bulk communications:', err)
      setError('Failed to send bulk communications')
      return { sent: 0, failed: followUpIds.length, results: [] }
    }
  }

  // Run automatic follow-ups
  const runAutomaticFollowUps = async () => {
    try {
      const result = await followUpService.processAutomaticFollowUps()
      if (result.created > 0) {
        await loadFollowUps(initialHospitalId)
        await loadMetrics(initialHospitalId)
      }
      return result
    } catch (err) {
      console.error('Error running automatic follow-ups:', err)
      setError('Failed to run automatic follow-ups')
      return { processed: 0, created: 0, errors: ['Unknown error occurred'] }
    }
  }

  // Refresh all data
  const refresh = async () => {
    await Promise.all([
      loadFollowUps(initialHospitalId),
      loadMetrics(initialHospitalId)
    ])
  }

  // Update filters
  const updateFilters = (newFilters: Partial<FollowUpFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  // Initial load
  useEffect(() => {
    loadFollowUps(initialHospitalId)
    loadMetrics(initialHospitalId)
  }, [initialHospitalId])

  // Reload when filters change
  useEffect(() => {
    loadFollowUps(initialHospitalId)
  }, [filters, initialHospitalId])

  return {
    followUps,
    metrics,
    loading,
    error,
    filters,
    createFollowUp,
    updateFollowUp,
    sendWhatsApp,
    sendEmail,
    sendBulkCommunications,
    runAutomaticFollowUps,
    refresh,
    updateFilters,
    clearError: () => setError(null)
  }
}