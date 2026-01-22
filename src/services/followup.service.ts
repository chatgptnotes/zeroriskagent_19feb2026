import { supabase } from '../lib/supabase'
import { FollowUp, EscalationRule } from '../types/database.types'
import whatsappService from './whatsapp.service'
import emailService from './email.service'

interface FollowUpMetrics {
  total: number
  pending: number
  in_progress: number
  completed: number
  overdue: number
  high_priority: number
}

interface CreateFollowUpData {
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
  auto_generated?: boolean
}

class FollowUpService {
  /**
   * Get follow-up metrics for dashboard
   */
  async getFollowUpMetrics(hospitalId?: string): Promise<FollowUpMetrics> {
    try {
      let query = supabase
        .from('follow_ups')
        .select('status, priority_score, due_date, created_at')

      if (hospitalId) {
        query = query.eq('hospital_id', hospitalId)
      }

      const { data, error } = await query

      if (error) throw error

      const now = new Date()
      const metrics: FollowUpMetrics = {
        total: data?.length || 0,
        pending: 0,
        in_progress: 0,
        completed: 0,
        overdue: 0,
        high_priority: 0
      }

      data?.forEach(followUp => {
        metrics[followUp.status as keyof FollowUpMetrics]++
        
        if (followUp.priority_score >= 8) {
          metrics.high_priority++
        }
        
        if (new Date(followUp.due_date) < now && followUp.status !== 'completed') {
          metrics.overdue++
        }
      })

      return metrics
    } catch (error) {
      console.error('Error fetching follow-up metrics:', error)
      return {
        total: 0,
        pending: 0,
        in_progress: 0,
        completed: 0,
        overdue: 0,
        high_priority: 0
      }
    }
  }

  /**
   * Get follow-ups with filtering and pagination
   */
  async getFollowUps(
    filters: {
      hospital_id?: string
      status?: string
      follow_up_type?: string
      priority_min?: number
      overdue?: boolean
      search?: string
    } = {},
    page = 1,
    limit = 20
  ): Promise<{ data: FollowUp[]; total: number; hasMore: boolean }> {
    try {
      let query = supabase
        .from('follow_ups')
        .select(`
          *,
          claims!inner(claim_number, hospital_claim_id, claimed_amount, claim_status),
          hospitals!inner(name)
        `, { count: 'exact' })

      // Apply filters
      if (filters.hospital_id) {
        query = query.eq('hospital_id', filters.hospital_id)
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.follow_up_type) {
        query = query.eq('follow_up_type', filters.follow_up_type)
      }

      if (filters.priority_min) {
        query = query.gte('priority_score', filters.priority_min)
      }

      if (filters.overdue) {
        query = query.lt('due_date', new Date().toISOString())
        query = query.neq('status', 'completed')
      }

      if (filters.search) {
        query = query.or(`description.ilike.%${filters.search}%,action_required.ilike.%${filters.search}%`)
      }

      // Pagination
      const from = (page - 1) * limit
      const to = from + limit - 1

      const { data, error, count } = await query
        .range(from, to)
        .order('priority_score', { ascending: false })
        .order('due_date', { ascending: true })

      if (error) throw error

      return {
        data: data || [],
        total: count || 0,
        hasMore: (count || 0) > page * limit
      }
    } catch (error) {
      console.error('Error fetching follow-ups:', error)
      return { data: [], total: 0, hasMore: false }
    }
  }

  /**
   * Create a new follow-up
   */
  async createFollowUp(followUpData: CreateFollowUpData): Promise<FollowUp | null> {
    try {
      const { data, error } = await supabase
        .from('follow_ups')
        .insert({
          ...followUpData,
          status: 'pending',
          escalation_level: 1,
          whatsapp_sent: false,
          email_sent: false,
          phone_attempted: false
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating follow-up:', error)
      return null
    }
  }

  /**
   * Update follow-up status and details
   */
  async updateFollowUp(
    id: string, 
    updates: Partial<FollowUp>
  ): Promise<FollowUp | null> {
    try {
      const { data, error } = await supabase
        .from('follow_ups')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating follow-up:', error)
      return null
    }
  }

  /**
   * Send WhatsApp message for follow-up
   */
  async sendWhatsAppFollowUp(
    followUpId: string,
    templateName: string,
    parameters: string[] = []
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get follow-up details
      const { data: followUp, error } = await supabase
        .from('follow_ups')
        .select('*, claims!inner(*)')
        .eq('id', followUpId)
        .single()

      if (error || !followUp) {
        return { success: false, error: 'Follow-up not found' }
      }

      if (!followUp.contact_phone) {
        return { success: false, error: 'No phone number available' }
      }

      // Send WhatsApp message
      const result = await whatsappService.sendTemplateMessage(
        followUpId,
        followUp.claim_id,
        followUp.contact_phone,
        templateName,
        parameters
      )

      if (result.success) {
        // Update follow-up
        await this.updateFollowUp(followUpId, {
          whatsapp_sent: true,
          last_contact_date: new Date().toISOString()
        })
      }

      return result
    } catch (error) {
      console.error('Error sending WhatsApp follow-up:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Send email for follow-up
   */
  async sendEmailFollowUp(
    followUpId: string,
    templateId: string,
    variables: Record<string, string> = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get follow-up details
      const { data: followUp, error } = await supabase
        .from('follow_ups')
        .select('*, claims!inner(*)')
        .eq('id', followUpId)
        .single()

      if (error || !followUp) {
        return { success: false, error: 'Follow-up not found' }
      }

      if (!followUp.contact_email) {
        return { success: false, error: 'No email address available' }
      }

      // Send email
      const result = await emailService.sendTemplateEmail(
        followUpId,
        followUp.claim_id,
        followUp.contact_email,
        templateId,
        variables
      )

      if (result.success) {
        // Update follow-up
        await this.updateFollowUp(followUpId, {
          email_sent: true,
          last_contact_date: new Date().toISOString()
        })
      }

      return result
    } catch (error) {
      console.error('Error sending email follow-up:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Process automated follow-ups based on escalation rules
   */
  async processAutomaticFollowUps(): Promise<{ processed: number; created: number; errors: string[] }> {
    const result = { processed: 0, created: 0, errors: [] as string[] }

    try {
      // Get active escalation rules
      const { data: rules, error: rulesError } = await supabase
        .from('escalation_rules')
        .select('*')
        .eq('is_active', true)

      if (rulesError) {
        result.errors.push(`Error fetching escalation rules: ${rulesError.message}`)
        return result
      }

      for (const rule of rules || []) {
        try {
          const processed = await this.processEscalationRule(rule)
          result.processed += processed.checked
          result.created += processed.created
          result.errors.push(...processed.errors)
        } catch (error) {
          result.errors.push(`Error processing rule ${rule.id}: ${error}`)
        }
      }

      return result
    } catch (error) {
      result.errors.push(`Error in automatic follow-up processing: ${error}`)
      return result
    }
  }

  /**
   * Process a specific escalation rule
   */
  private async processEscalationRule(
    rule: EscalationRule
  ): Promise<{ checked: number; created: number; errors: string[] }> {
    const result = { checked: 0, created: 0, errors: [] as string[] }

    try {
      // Build query based on rule criteria
      let claimsQuery = supabase
        .from('claims')
        .select('*')

      // Filter by hospital
      claimsQuery = claimsQuery.eq('hospital_id', rule.hospital_id)

      // Filter by claim type
      if (rule.claim_type !== 'all') {
        claimsQuery = claimsQuery.eq('claim_type', rule.claim_type)
      }

      // Apply trigger condition
      const now = new Date()
      switch (rule.trigger_condition) {
        case 'days_overdue':
          const cutoffDate = new Date(now.getTime() - (rule.trigger_value * 24 * 60 * 60 * 1000))
          claimsQuery = claimsQuery.lt('payment_due_date', cutoffDate.toISOString())
          claimsQuery = claimsQuery.in('claim_status', ['approved', 'partially_approved'])
          break

        case 'amount_threshold':
          claimsQuery = claimsQuery.gte('outstanding_amount', rule.trigger_value)
          break

        case 'status_change':
          // This would require tracking status change timestamps
          // For now, we'll skip this condition
          return result

        case 'no_response':
          const noResponseDate = new Date(now.getTime() - (rule.trigger_value * 24 * 60 * 60 * 1000))
          claimsQuery = claimsQuery.lt('last_status_update', noResponseDate.toISOString())
          break
      }

      const { data: claims, error: claimsError } = await claimsQuery

      if (claimsError) {
        result.errors.push(`Error fetching claims for rule ${rule.id}: ${claimsError.message}`)
        return result
      }

      result.checked = claims?.length || 0

      // Process each claim
      for (const claim of claims || []) {
        try {
          // Check if there's already a recent follow-up for this claim
          const { data: existingFollowUp } = await supabase
            .from('follow_ups')
            .select('id')
            .eq('claim_id', claim.id)
            .gte('created_at', new Date(now.getTime() - (24 * 60 * 60 * 1000)).toISOString())
            .limit(1)
            .single()

          if (existingFollowUp) {
            continue // Skip if there's already a recent follow-up
          }

          // Create follow-up based on escalation sequence
          // const escalationSequence = rule.escalation_sequence as any
          const followUpType = this.determineFollowUpType(rule.trigger_condition)
          const priority = this.calculatePriority(claim, rule)
          const dueDate = new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000)) // 2 days from now

          const followUp = await this.createFollowUp({
            claim_id: claim.id,
            hospital_id: claim.hospital_id,
            follow_up_type: followUpType,
            priority_score: priority,
            due_date: dueDate.toISOString(),
            description: `Auto-generated follow-up based on ${rule.trigger_condition}`,
            action_required: this.generateActionRequired(rule.trigger_condition, claim),
            auto_generated: true
          })

          if (followUp) {
            result.created++
          }
        } catch (error) {
          result.errors.push(`Error creating follow-up for claim ${claim.id}: ${error}`)
        }
      }

      return result
    } catch (error) {
      result.errors.push(`Error processing escalation rule: ${error}`)
      return result
    }
  }

  /**
   * Send bulk communications
   */
  async sendBulkCommunications(
    followUpIds: string[],
    channel: 'whatsapp' | 'email',
    templateId: string,
    variables: Record<string, string> = {}
  ): Promise<{ sent: number; failed: number; results: Array<{ followUpId: string; success: boolean; error?: string }> }> {
    const results: Array<{ followUpId: string; success: boolean; error?: string }> = []
    let sent = 0
    let failed = 0

    for (const followUpId of followUpIds) {
      try {
        let result: { success: boolean; error?: string }

        if (channel === 'whatsapp') {
          result = await this.sendWhatsAppFollowUp(followUpId, templateId, Object.values(variables))
        } else {
          result = await this.sendEmailFollowUp(followUpId, templateId, variables)
        }

        if (result.success) {
          sent++
          results.push({ followUpId, success: true })
        } else {
          failed++
          results.push({ followUpId, success: false, error: result.error })
        }
      } catch (error) {
        failed++
        results.push({
          followUpId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      // Rate limiting - small delay between sends
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return { sent, failed, results }
  }

  /**
   * Get escalation rules for a hospital
   */
  async getEscalationRules(hospitalId: string): Promise<EscalationRule[]> {
    try {
      const { data, error } = await supabase
        .from('escalation_rules')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching escalation rules:', error)
      return []
    }
  }

  /**
   * Create or update escalation rule
   */
  async upsertEscalationRule(
    rule: Omit<EscalationRule, 'id' | 'created_at' | 'updated_at'>
  ): Promise<EscalationRule | null> {
    try {
      const { data, error } = await supabase
        .from('escalation_rules')
        .upsert(rule)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error upserting escalation rule:', error)
      return null
    }
  }

  // Private helper methods

  private determineFollowUpType(triggerCondition: string): FollowUp['follow_up_type'] {
    switch (triggerCondition) {
      case 'days_overdue':
        return 'payment_overdue'
      case 'amount_threshold':
        return 'escalation'
      case 'no_response':
        return 'verification_pending'
      default:
        return 'custom'
    }
  }

  private calculatePriority(claim: any, rule: EscalationRule): number {
    let priority = 5 // Base priority

    // Increase priority based on amount
    if (claim.outstanding_amount > 100000) priority += 2
    else if (claim.outstanding_amount > 50000) priority += 1

    // Increase priority based on age
    if (claim.aged_days > 90) priority += 2
    else if (claim.aged_days > 60) priority += 1

    // Rule-specific adjustments
    if (rule.trigger_condition === 'amount_threshold') priority += 1
    if (rule.trigger_condition === 'days_overdue' && rule.trigger_value > 30) priority += 1

    return Math.min(priority, 10) // Cap at 10
  }

  private generateActionRequired(triggerCondition: string, claim: any): string {
    switch (triggerCondition) {
      case 'days_overdue':
        return `Payment overdue by ${claim.aged_days} days. Contact payer for status update.`
      case 'amount_threshold':
        return `High-value claim (₹${claim.outstanding_amount.toLocaleString()}). Escalate for priority processing.`
      case 'no_response':
        return `No response received. Follow up on documentation and processing status.`
      default:
        return 'Follow up on claim status and next steps.'
    }
  }
}

export default new FollowUpService()