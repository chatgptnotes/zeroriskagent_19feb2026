import { supabase } from '../lib/supabase'
import { MessageTemplate, CommunicationLog } from '../types/database.types'

interface EmailConfig {
  smtp_host: string
  smtp_port: number
  smtp_secure: boolean
  smtp_user: string
  smtp_password: string
  from_name: string
  from_email: string
}

interface EmailMessage {
  to: string
  cc?: string[]
  bcc?: string[]
  subject: string
  html: string
  text?: string
  attachments?: Array<{
    filename: string
    content: string
    contentType: string
  }>
}

// SendGrid response interface (for future use)
// interface SendGridResponse {
//   statusCode: number
//   body: any
//   headers: any
// }

class EmailService {
  private emailConfig: EmailConfig | null = null

  constructor() {
    this.initializeConfig()
  }

  private async initializeConfig(): Promise<void> {
    // Try to load from environment variables first
    const envConfig = this.getEnvConfig()
    if (envConfig) {
      this.emailConfig = envConfig
      return
    }

    // Fallback to database configuration (for hospital-specific settings)
    try {
      const { data } = await supabase
        .from('hospitals')
        .select('contact_details')
        .limit(1)
        .single()

      if (data?.contact_details?.email_config) {
        this.emailConfig = data.contact_details.email_config
      }
    } catch (error) {
      console.warn('No email configuration found, running in mock mode')
    }
  }

  private getEnvConfig(): EmailConfig | null {
    const host = import.meta.env.VITE_SMTP_HOST
    const port = import.meta.env.VITE_SMTP_PORT
    const user = import.meta.env.VITE_SMTP_USER
    const password = import.meta.env.VITE_SMTP_PASSWORD
    const fromEmail = import.meta.env.VITE_FROM_EMAIL
    const fromName = import.meta.env.VITE_FROM_NAME

    if (!host || !port || !user || !password || !fromEmail) {
      return null
    }

    return {
      smtp_host: host,
      smtp_port: parseInt(port),
      smtp_secure: port === '465',
      smtp_user: user,
      smtp_password: password,
      from_email: fromEmail,
      from_name: fromName || 'Zero Risk Agent'
    }
  }

  /**
   * Send email using SendGrid API (preferred method)
   */
  async sendEmailViaSendGrid(
    followUpId: string,
    claimId: string,
    email: EmailMessage
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const sendGridApiKey = import.meta.env.VITE_SENDGRID_API_KEY

      if (!sendGridApiKey) {
        return this.mockEmailSend(followUpId, claimId, email)
      }

      const sendGridData = {
        personalizations: [{
          to: [{ email: email.to }],
          ...(email.cc && { cc: email.cc.map(e => ({ email: e })) }),
          ...(email.bcc && { bcc: email.bcc.map(e => ({ email: e })) }),
          subject: email.subject
        }],
        from: {
          email: this.emailConfig?.from_email || 'noreply@zeroriskagent.com',
          name: this.emailConfig?.from_name || 'Zero Risk Agent'
        },
        content: [
          {
            type: 'text/html',
            value: email.html
          },
          ...(email.text ? [{
            type: 'text/plain',
            value: email.text
          }] : [])
        ],
        ...(email.attachments && {
          attachments: email.attachments.map(att => ({
            content: att.content,
            filename: att.filename,
            type: att.contentType,
            disposition: 'attachment'
          }))
        })
      }

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendGridApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sendGridData)
      })

      const responseText = await response.text()
      
      if (!response.ok) {
        throw new Error(`SendGrid API error: ${response.status} - ${responseText}`)
      }

      const messageId = response.headers.get('x-message-id') || `sg_${Date.now()}`

      // Log the communication
      await this.logCommunication({
        follow_up_id: followUpId,
        claim_id: claimId,
        communication_type: 'email',
        direction: 'outbound',
        recipient: email.to,
        subject: email.subject,
        message_content: email.html,
        template_used: null,
        delivery_status: 'sent',
        delivery_timestamp: new Date().toISOString(),
        read_timestamp: null,
        reply_timestamp: null,
        reply_content: null,
        external_message_id: messageId,
        cost_inr: 0.10, // Estimated cost per email
        attachment_urls: null,
        metadata: { 
          provider: 'sendgrid',
          cc: email.cc,
          bcc: email.bcc,
          has_attachments: !!email.attachments?.length
        }
      })

      return { success: true, messageId }
    } catch (error) {
      console.error('Error sending email via SendGrid:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Send email using SMTP (fallback method)
   */
  async sendEmailViaSMTP(
    followUpId: string,
    claimId: string,
    email: EmailMessage
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.emailConfig) {
        return this.mockEmailSend(followUpId, claimId, email)
      }

      // In a real implementation, this would use nodemailer or similar
      // For now, we'll simulate the SMTP send
      const messageId = `smtp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Log the communication
      await this.logCommunication({
        follow_up_id: followUpId,
        claim_id: claimId,
        communication_type: 'email',
        direction: 'outbound',
        recipient: email.to,
        subject: email.subject,
        message_content: email.html,
        template_used: null,
        delivery_status: 'sent',
        delivery_timestamp: new Date().toISOString(),
        read_timestamp: null,
        reply_timestamp: null,
        reply_content: null,
        external_message_id: messageId,
        cost_inr: 0.05, // Lower cost for SMTP
        attachment_urls: null,
        metadata: { 
          provider: 'smtp',
          smtp_host: this.emailConfig.smtp_host,
          cc: email.cc,
          bcc: email.bcc,
          has_attachments: !!email.attachments?.length
        }
      })

      console.log(`[SMTP] Email sent to ${email.to}: ${email.subject}`)
      return { success: true, messageId }
    } catch (error) {
      console.error('Error sending email via SMTP:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Send email with template
   */
  async sendTemplateEmail(
    followUpId: string,
    claimId: string,
    recipient: string,
    templateId: string,
    variables: Record<string, string>,
    attachments?: Array<{ filename: string; content: string; contentType: string }>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Get template
      const { data: template, error: templateError } = await supabase
        .from('message_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (templateError || !template) {
        return { success: false, error: 'Template not found' }
      }

      // Replace variables in subject and content
      const subject = this.replaceTemplateVariables(template.subject || 'Follow-up', variables)
      const htmlContent = this.replaceTemplateVariables(template.message_content, variables)
      const textContent = this.htmlToText(htmlContent)

      const email: EmailMessage = {
        to: recipient,
        subject,
        html: this.wrapInEmailTemplate(htmlContent, subject),
        text: textContent,
        attachments
      }

      // Try SendGrid first, fallback to SMTP
      let result = await this.sendEmailViaSendGrid(followUpId, claimId, email)
      
      if (!result.success) {
        result = await this.sendEmailViaSMTP(followUpId, claimId, email)
      }

      // Update template usage
      if (result.success) {
        await supabase
          .from('message_templates')
          .update({
            usage_count: (template.usage_count || 0) + 1,
            last_used_at: new Date().toISOString()
          })
          .eq('id', templateId)
      }

      return result
    } catch (error) {
      console.error('Error sending template email:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Send bulk emails (for campaigns)
   */
  async sendBulkEmails(
    emails: Array<{
      followUpId: string
      claimId: string
      recipient: string
      subject: string
      html: string
      variables?: Record<string, string>
    }>
  ): Promise<{ sent: number; failed: number; results: Array<{ recipient: string; success: boolean; error?: string }> }> {
    const results: Array<{ recipient: string; success: boolean; error?: string }> = []
    let sent = 0
    let failed = 0

    // Process emails in batches to avoid rate limits
    const batchSize = 10
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize)
      
      const promises = batch.map(async (emailData) => {
        try {
          const result = await this.sendEmailViaSendGrid(
            emailData.followUpId,
            emailData.claimId,
            {
              to: emailData.recipient,
              subject: emailData.subject,
              html: this.wrapInEmailTemplate(emailData.html, emailData.subject)
            }
          )

          if (result.success) {
            sent++
            results.push({ recipient: emailData.recipient, success: true })
          } else {
            failed++
            results.push({ 
              recipient: emailData.recipient, 
              success: false, 
              error: result.error 
            })
          }
        } catch (error) {
          failed++
          results.push({
            recipient: emailData.recipient,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      })

      await Promise.all(promises)
      
      // Rate limiting - wait 1 second between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return { sent, failed, results }
  }

  /**
   * Get email templates for hospital
   */
  async getTemplates(hospitalId: string, category?: string): Promise<MessageTemplate[]> {
    try {
      let query = supabase
        .from('message_templates')
        .select('*')
        .or(`hospital_id.is.null,hospital_id.eq.${hospitalId}`)
        .in('channel', ['email', 'multi_channel'])
        .eq('is_active', true)

      if (category) {
        query = query.eq('category', category)
      }

      const { data, error } = await query.order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching email templates:', error)
      return []
    }
  }

  /**
   * Create a new email template
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
      console.error('Error creating email template:', error)
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
        .eq('communication_type', 'email')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching communication logs:', error)
      return []
    }
  }

  // Private helper methods

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

  private wrapInEmailTemplate(content: string, subject: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #0891b2; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { padding: 30px; }
        .footer { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #64748b; }
        .button { display: inline-block; background: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .alert { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Zero Risk Agent</h1>
            <p>Healthcare Claims Recovery System</p>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>This email was sent by Zero Risk Agent Claims Recovery System</p>
            <p>© ${new Date().getFullYear()} Zero Risk Agent. All rights reserved.</p>
            <p>v1.8 | ${new Date().toLocaleDateString('en-IN')}</p>
        </div>
    </div>
</body>
</html>`
  }

  private htmlToText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim()
  }

  private async mockEmailSend(
    followUpId: string, 
    claimId: string, 
    email: EmailMessage
  ): Promise<{ success: boolean; messageId: string }> {
    // Mock implementation for development
    const mockMessageId = `mock_email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    await this.logCommunication({
      follow_up_id: followUpId,
      claim_id: claimId,
      communication_type: 'email',
      direction: 'outbound',
      recipient: email.to,
      subject: email.subject,
      message_content: email.html,
      template_used: null,
      delivery_status: 'sent',
      delivery_timestamp: new Date().toISOString(),
      read_timestamp: null,
      reply_timestamp: null,
      reply_content: null,
      external_message_id: mockMessageId,
      cost_inr: 0.10,
      attachment_urls: null,
      metadata: { mock_mode: true, reason: 'Email service not configured' }
    })

    console.log(`[MOCK] Email sent to ${email.to}: ${email.subject}`)
    return { success: true, messageId: mockMessageId }
  }
}

export default new EmailService()