import { supabase } from '../lib/supabase'
import { MessageTemplate, CommunicationLog } from '../types/database.types'

interface WhatsAppMessage {
  to: string
  template?: {
    name: string
    language: { code: string }
    components: Array<{
      type: string
      parameters: Array<{ type: string; text: string }>
    }>
  }
  text?: { body: string }
}

interface WhatsAppResponse {
  messaging_product: string
  contacts: Array<{ input: string; wa_id: string }>
  messages: Array<{ id: string }>
}

interface WhatsAppWebhook {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: string
        metadata: { display_phone_number: string; phone_number_id: string }
        contacts?: Array<{ profile: { name: string }; wa_id: string }>
        messages?: Array<{
          from: string
          id: string
          timestamp: string
          text?: { body: string }
          type: string
        }>
        statuses?: Array<{
          id: string
          status: 'sent' | 'delivered' | 'read' | 'failed'
          timestamp: string
          recipient_id: string
          errors?: Array<{ code: number; title: string }>
        }>
      }
      field: string
    }>
  }>
}

class WhatsAppService {
  private readonly baseUrl = 'https://graph.facebook.com/v18.0'
  private readonly phoneNumberId: string
  private readonly accessToken: string

  constructor() {
    this.phoneNumberId = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID || ''
    this.accessToken = import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN || ''
    
    if (!this.phoneNumberId || !this.accessToken) {
      console.warn('WhatsApp credentials not configured. Service will run in mock mode.')
    }
  }

  /**
   * Send a template message via WhatsApp Business API
   */
  async sendTemplateMessage(
    followUpId: string,
    claimId: string,
    recipient: string,
    templateName: string,
    parameters: string[] = []
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        return this.mockWhatsAppSend(followUpId, claimId, recipient, `Template: ${templateName}`)
      }

      const message: WhatsAppMessage = {
        to: this.formatPhoneNumber(recipient),
        template: {
          name: templateName,
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: parameters.map(param => ({ type: 'text', text: param }))
            }
          ]
        }
      }

      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      })

      const data: WhatsAppResponse = await response.json()

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${JSON.stringify(data)}`)
      }

      const messageId = data.messages?.[0]?.id

      // Log the communication
      await this.logCommunication({
        follow_up_id: followUpId,
        claim_id: claimId,
        communication_type: 'whatsapp',
        direction: 'outbound',
        recipient: recipient,
        subject: `Template: ${templateName}`,
        message_content: `Template message sent with parameters: ${parameters.join(', ')}`,
        template_used: templateName,
        delivery_status: 'sent',
        delivery_timestamp: new Date().toISOString(),
        read_timestamp: null,
        reply_timestamp: null,
        reply_content: null,
        external_message_id: messageId,
        cost_inr: 0.50, // Estimated cost per message
        attachment_urls: null,
        metadata: { template_name: templateName, parameters }
      })

      return { success: true, messageId }
    } catch (error) {
      console.error('Error sending WhatsApp template message:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Send a text message via WhatsApp Business API
   */
  async sendTextMessage(
    followUpId: string,
    claimId: string,
    recipient: string,
    message: string,
    templateUsed?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        return this.mockWhatsAppSend(followUpId, claimId, recipient, message)
      }

      const whatsappMessage: WhatsAppMessage = {
        to: this.formatPhoneNumber(recipient),
        text: { body: message }
      }

      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(whatsappMessage)
      })

      const data: WhatsAppResponse = await response.json()

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${JSON.stringify(data)}`)
      }

      const messageId = data.messages?.[0]?.id

      // Log the communication
      await this.logCommunication({
        follow_up_id: followUpId,
        claim_id: claimId,
        communication_type: 'whatsapp',
        direction: 'outbound',
        recipient: recipient,
        subject: null,
        message_content: message,
        template_used: templateUsed || null,
        delivery_status: 'sent',
        delivery_timestamp: new Date().toISOString(),
        read_timestamp: null,
        reply_timestamp: null,
        reply_content: null,
        external_message_id: messageId,
        cost_inr: 0.50,
        attachment_urls: null,
        metadata: { text_message: true }
      })

      return { success: true, messageId }
    } catch (error) {
      console.error('Error sending WhatsApp text message:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Process WhatsApp webhook for incoming messages and status updates
   */
  async processWebhook(webhookData: WhatsAppWebhook): Promise<void> {
    try {
      for (const entry of webhookData.entry) {
        for (const change of entry.changes) {
          const { value } = change

          // Process status updates (delivery, read receipts)
          if (value.statuses) {
            for (const status of value.statuses) {
              await this.updateMessageStatus(status.id, status.status, status.timestamp)
            }
          }

          // Process incoming messages
          if (value.messages) {
            for (const message of value.messages) {
              await this.handleIncomingMessage(message, value.metadata.phone_number_id)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing WhatsApp webhook:', error)
      throw error
    }
  }

  /**
   * Get message templates available for hospital
   */
  async getTemplates(hospitalId: string, category?: string): Promise<MessageTemplate[]> {
    try {
      let query = supabase
        .from('message_templates')
        .select('*')
        .or(`hospital_id.is.null,hospital_id.eq.${hospitalId}`)
        .eq('channel', 'whatsapp')
        .eq('is_active', true)

      if (category) {
        query = query.eq('category', category)
      }

      const { data, error } = await query.order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching WhatsApp templates:', error)
      return []
    }
  }

  /**
   * Create a new message template
   */
  async createTemplate(template: Omit<MessageTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<MessageTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .insert(template)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating WhatsApp template:', error)
      return null
    }
  }

  /**
   * Replace template variables with actual values
   */
  replaceTemplateVariables(template: string, variables: Record<string, string>): string {
    let result = template
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      result = result.replace(regex, value)
    })
    return result
  }

  /**
   * Get communication logs for a follow-up
   */
  async getCommunicationLogs(followUpId: string): Promise<CommunicationLog[]> {
    try {
      const { data, error } = await supabase
        .from('communication_logs')
        .select('*')
        .eq('follow_up_id', followUpId)
        .eq('communication_type', 'whatsapp')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching communication logs:', error)
      return []
    }
  }

  // Private helper methods

  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '')
    
    // Add country code if missing (assuming India +91)
    if (cleaned.length === 10 && cleaned.startsWith('9')) {
      return `91${cleaned}`
    }
    
    // If already has country code
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return cleaned
    }
    
    // Default fallback
    return cleaned.startsWith('91') ? cleaned : `91${cleaned}`
  }

  private async logCommunication(log: Omit<CommunicationLog, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('communication_logs')
        .insert(log)

      if (error) {
        console.error('Error logging communication:', error)
      }
    } catch (error) {
      console.error('Error logging communication:', error)
    }
  }

  private async updateMessageStatus(messageId: string, status: string, timestamp: string): Promise<void> {
    try {
      const updateData: any = {
        delivery_status: status,
        updated_at: new Date().toISOString()
      }

      if (status === 'delivered') {
        updateData.delivery_timestamp = timestamp
      } else if (status === 'read') {
        updateData.read_timestamp = timestamp
      }

      const { error } = await supabase
        .from('communication_logs')
        .update(updateData)
        .eq('external_message_id', messageId)

      if (error) {
        console.error('Error updating message status:', error)
      }
    } catch (error) {
      console.error('Error updating message status:', error)
    }
  }

  private async handleIncomingMessage(message: any, _phoneNumberId: string): Promise<void> {
    try {
      // Find related follow-up based on phone number
      const { data: followUp, error } = await supabase
        .from('follow_ups')
        .select('*')
        .eq('contact_phone', message.from)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !followUp) {
        console.log('No active follow-up found for incoming message from:', message.from)
        return
      }

      // Log incoming message
      await this.logCommunication({
        follow_up_id: followUp.id,
        claim_id: followUp.claim_id,
        communication_type: 'whatsapp',
        direction: 'inbound',
        recipient: message.from,
        subject: null,
        message_content: message.text?.body || 'Non-text message received',
        template_used: null,
        delivery_status: 'delivered',
        delivery_timestamp: new Date().toISOString(),
        read_timestamp: null,
        reply_timestamp: new Date().toISOString(),
        reply_content: message.text?.body || 'Non-text message',
        external_message_id: message.id,
        cost_inr: null,
        attachment_urls: null,
        metadata: { incoming_message: true, message_type: message.type }
      })

      // Update follow-up with last contact date
      await supabase
        .from('follow_ups')
        .update({
          last_contact_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', followUp.id)

    } catch (error) {
      console.error('Error handling incoming WhatsApp message:', error)
    }
  }

  private async mockWhatsAppSend(
    followUpId: string, 
    claimId: string, 
    recipient: string, 
    message: string
  ): Promise<{ success: boolean; messageId: string }> {
    // Mock implementation for development
    const mockMessageId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    await this.logCommunication({
      follow_up_id: followUpId,
      claim_id: claimId,
      communication_type: 'whatsapp',
      direction: 'outbound',
      recipient: recipient,
      subject: 'Mock WhatsApp Message',
      message_content: message,
      template_used: null,
      delivery_status: 'sent',
      delivery_timestamp: new Date().toISOString(),
      read_timestamp: null,
      reply_timestamp: null,
      reply_content: null,
      external_message_id: mockMessageId,
      cost_inr: 0.50,
      attachment_urls: null,
      metadata: { mock_mode: true, reason: 'WhatsApp credentials not configured' }
    })

    console.log(`[MOCK] WhatsApp message sent to ${recipient}: ${message}`)
    return { success: true, messageId: mockMessageId }
  }
}

export default new WhatsAppService()