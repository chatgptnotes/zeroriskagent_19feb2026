// Local Follow-up Service - localStorage-based for immediate functionality
// This provides a working system while database setup is being finalized

import { FollowUp } from '../types/database.types'

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

class LocalFollowUpService {
  private readonly STORAGE_KEY = 'zerorisk_followups'
  private readonly CLAIMS_KEY = 'zerorisk_claims'

  // Get follow-up metrics for dashboard
  async getFollowUpMetrics(hospitalId?: string): Promise<FollowUpMetrics> {
    try {
      const followUps = this.getStoredFollowUps()
      const now = new Date()
      
      const filteredFollowUps = hospitalId 
        ? followUps.filter(f => f.hospital_id === hospitalId)
        : followUps

      const metrics: FollowUpMetrics = {
        total: filteredFollowUps.length,
        pending: 0,
        in_progress: 0,
        completed: 0,
        overdue: 0,
        high_priority: 0
      }

      filteredFollowUps.forEach(followUp => {
        if (followUp.status === 'pending') metrics.pending++
        else if (followUp.status === 'in_progress') metrics.in_progress++
        else if (followUp.status === 'completed') metrics.completed++
        
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

  // Get follow-ups with filtering and pagination
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
      let followUps = this.getStoredFollowUps()
      
      // Apply filters
      if (filters.hospital_id) {
        followUps = followUps.filter(f => f.hospital_id === filters.hospital_id)
      }

      if (filters.status) {
        followUps = followUps.filter(f => f.status === filters.status)
      }

      if (filters.follow_up_type) {
        followUps = followUps.filter(f => f.follow_up_type === filters.follow_up_type)
      }

      if (filters.priority_min) {
        followUps = followUps.filter(f => f.priority_score >= filters.priority_min)
      }

      if (filters.overdue) {
        const now = new Date()
        followUps = followUps.filter(f => 
          new Date(f.due_date) < now && f.status !== 'completed'
        )
      }

      if (filters.search) {
        const search = filters.search.toLowerCase()
        followUps = followUps.filter(f => 
          f.description.toLowerCase().includes(search) ||
          f.action_required.toLowerCase().includes(search)
        )
      }

      // Sort by priority (high to low) then by due date (early to late)
      followUps.sort((a, b) => {
        if (a.priority_score !== b.priority_score) {
          return b.priority_score - a.priority_score
        }
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      })

      // Add mock claims data
      const enrichedFollowUps = followUps.map(followUp => ({
        ...followUp,
        claims: {
          claim_number: `CLM-${followUp.claim_id.slice(-6)}`,
          hospital_claim_id: `HCL-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
          claimed_amount: Math.floor(Math.random() * 100000) + 10000,
          claim_status: 'pending'
        }
      }))

      // Pagination
      const from = (page - 1) * limit
      const to = from + limit
      const paginatedData = enrichedFollowUps.slice(from, to)

      return {
        data: paginatedData as any,
        total: followUps.length,
        hasMore: followUps.length > page * limit
      }
    } catch (error) {
      console.error('Error fetching follow-ups:', error)
      return { data: [], total: 0, hasMore: false }
    }
  }

  // Create a new follow-up
  async createFollowUp(followUpData: CreateFollowUpData): Promise<FollowUp | null> {
    try {
      const followUps = this.getStoredFollowUps()
      const newFollowUp: FollowUp = {
        id: this.generateId(),
        ...followUpData,
        status: 'pending',
        escalation_level: 1,
        whatsapp_sent: false,
        email_sent: false,
        phone_attempted: false,
        last_contact_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      followUps.push(newFollowUp)
      this.saveFollowUps(followUps)
      return newFollowUp
    } catch (error) {
      console.error('Error creating follow-up:', error)
      return null
    }
  }

  // Update follow-up status and details
  async updateFollowUp(
    id: string, 
    updates: Partial<FollowUp>
  ): Promise<FollowUp | null> {
    try {
      const followUps = this.getStoredFollowUps()
      const index = followUps.findIndex(f => f.id === id)
      
      if (index === -1) return null
      
      followUps[index] = {
        ...followUps[index],
        ...updates,
        updated_at: new Date().toISOString()
      }
      
      this.saveFollowUps(followUps)
      return followUps[index]
    } catch (error) {
      console.error('Error updating follow-up:', error)
      return null
    }
  }

  // Process automatic follow-ups (simplified for local version)
  async processAutomaticFollowUps(): Promise<{ processed: number; created: number; errors: string[] }> {
    try {
      // Create some sample follow-ups to demonstrate functionality
      const sampleFollowUps = this.generateSampleFollowUps()
      let created = 0
      
      for (const followUpData of sampleFollowUps) {
        const result = await this.createFollowUp(followUpData)
        if (result) created++
      }

      return {
        processed: sampleFollowUps.length,
        created,
        errors: []
      }
    } catch (error) {
      return {
        processed: 0,
        created: 0,
        errors: [`Error processing automatic follow-ups: ${error}`]
      }
    }
  }

  // Send bulk communications (mock implementation)
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
        // Mock sending - always succeed for demo
        const success = Math.random() > 0.1 // 90% success rate
        
        if (success) {
          // Update follow-up to mark as sent
          const updateData = channel === 'whatsapp' 
            ? { whatsapp_sent: true, last_contact_date: new Date().toISOString() }
            : { email_sent: true, last_contact_date: new Date().toISOString() }
            
          await this.updateFollowUp(followUpId, updateData)
          
          sent++
          results.push({ followUpId, success: true })
        } else {
          failed++
          results.push({ followUpId, success: false, error: 'Mock failure for testing' })
        }
      } catch (error) {
        failed++
        results.push({
          followUpId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return { sent, failed, results }
  }

  // Private methods
  private getStoredFollowUps(): FollowUp[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
      return this.initializeSampleData()
    } catch (error) {
      console.error('Error loading follow-ups:', error)
      return this.initializeSampleData()
    }
  }

  private saveFollowUps(followUps: FollowUp[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(followUps))
    } catch (error) {
      console.error('Error saving follow-ups:', error)
    }
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }

  private initializeSampleData(): FollowUp[] {
    const now = new Date()
    const sampleFollowUps: FollowUp[] = [
      {
        id: 'sample-1',
        claim_id: 'claim-1',
        hospital_id: 'hospital-1',
        follow_up_type: 'payment_overdue',
        priority_score: 8,
        due_date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // tomorrow
        description: 'Payment overdue for ESIC claim - Patient discharge 2 weeks ago',
        action_required: 'Contact ESIC Mumbai office for payment status and expected timeline',
        contact_person: 'ESIC Regional Office Mumbai',
        contact_phone: '9876543210',
        contact_email: 'esic.mumbai@gov.in',
        status: 'pending',
        escalation_level: 1,
        whatsapp_sent: false,
        email_sent: false,
        phone_attempted: false,
        last_contact_date: null,
        auto_generated: true,
        created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'sample-2',
        claim_id: 'claim-2',
        hospital_id: 'hospital-1',
        follow_up_type: 'missing_documents',
        priority_score: 6,
        due_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        description: 'Missing discharge summary for CGHS claim verification',
        action_required: 'Submit completed discharge summary and final bill to CGHS office',
        contact_person: 'CGHS Delhi Office',
        contact_phone: '9876543211',
        contact_email: 'cghs.delhi@nic.in',
        status: 'in_progress',
        escalation_level: 1,
        whatsapp_sent: true,
        email_sent: false,
        phone_attempted: false,
        last_contact_date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        auto_generated: false,
        created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'sample-3',
        claim_id: 'claim-3',
        hospital_id: 'hospital-1',
        follow_up_type: 'verification_pending',
        priority_score: 9,
        due_date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // yesterday (overdue)
        description: 'High-value insurance claim pending verification for 3 weeks',
        action_required: 'Escalate to senior claims officer - provide treatment justification',
        contact_person: 'Insurance Claims Officer',
        contact_phone: '9876543214',
        contact_email: 'claims@insurance.com',
        status: 'pending',
        escalation_level: 2,
        whatsapp_sent: false,
        email_sent: true,
        phone_attempted: true,
        last_contact_date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        auto_generated: true,
        created_at: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]

    this.saveFollowUps(sampleFollowUps)
    return sampleFollowUps
  }

  private generateSampleFollowUps(): CreateFollowUpData[] {
    const now = new Date()
    return [
      {
        claim_id: `claim-auto-${Date.now()}`,
        hospital_id: 'hospital-1',
        follow_up_type: 'payment_overdue',
        priority_score: 7,
        due_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Auto-generated follow-up for payment delay',
        action_required: 'Contact payer for payment status update',
        contact_person: 'TPA Healthcare Services',
        contact_phone: '9876543213',
        contact_email: 'support@tpahealthcare.com',
        auto_generated: true
      }
    ]
  }

  // Export/Import functionality
  exportFollowUps(): string {
    return JSON.stringify(this.getStoredFollowUps(), null, 2)
  }

  importFollowUps(jsonData: string): boolean {
    try {
      const followUps = JSON.parse(jsonData)
      if (Array.isArray(followUps)) {
        this.saveFollowUps(followUps)
        return true
      }
      return false
    } catch (error) {
      console.error('Error importing follow-ups:', error)
      return false
    }
  }

  clearAllFollowUps(): void {
    localStorage.removeItem(this.STORAGE_KEY)
  }
}

export default new LocalFollowUpService()