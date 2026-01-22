import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import followUpService from '../services/followup.service'
import whatsappService from '../services/whatsapp.service'
import emailService from '../services/email.service'
import ContactManager from '../components/ContactManager'
import EmailComposer, { EmailData } from '../components/EmailComposer'
import contactsService, { Contact } from '../services/contacts.service'
import { FollowUp, MessageTemplate } from '../types/database.types'

interface FollowUpMetrics {
  total: number
  pending: number
  in_progress: number
  completed: number
  overdue: number
  high_priority: number
}

interface BulkActionResult {
  sent: number
  failed: number
  results: Array<{ followUpId: string; success: boolean; error?: string }>
}

export default function FollowUpMaster() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<FollowUpMetrics>({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    overdue: 0,
    high_priority: 0
  })
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFollowUps, setSelectedFollowUps] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    priority: 'all',
    overdue: false,
    search: ''
  })
  
  // Templates and bulk action states
  const [whatsappTemplates, setWhatsappTemplates] = useState<MessageTemplate[]>([])
  const [emailTemplates, setEmailTemplates] = useState<MessageTemplate[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [bulkAction, setBulkAction] = useState<'whatsapp' | 'email' | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [bulkResult, setBulkResult] = useState<BulkActionResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showContactManager, setShowContactManager] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactStats, setContactStats] = useState({ total: 0, payers: 0, hospitals: 0 })
  const [showEmailComposer, setShowEmailComposer] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  useEffect(() => {
    loadDashboardData()
    loadTemplates()
    loadContacts()
  }, [])

  const loadContacts = () => {
    const allContacts = contactsService.getContacts()
    setContacts(allContacts)
    setContactStats({
      total: allContacts.length,
      payers: contactsService.getPayerContacts().length,
      hospitals: contactsService.getHospitalContacts().length
    })
  }

  useEffect(() => {
    loadFollowUps()
  }, [filters])

  const loadDashboardData = async () => {
    try {
      const metricsData = await followUpService.getFollowUpMetrics()
      setMetrics(metricsData)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const loadFollowUps = async () => {
    try {
      setLoading(true)
      const filterObj = {
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.type !== 'all' && { follow_up_type: filters.type }),
        ...(filters.priority !== 'all' && { priority_min: parseInt(filters.priority) }),
        ...(filters.overdue && { overdue: true }),
        ...(filters.search && { search: filters.search })
      }

      const { data } = await followUpService.getFollowUps(filterObj)
      setFollowUps(data)
    } catch (error) {
      console.error('Error loading follow-ups:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      const hospitalId = (user as any)?.user_metadata?.hospital_id || 'default'
      
      const [whatsappData, emailData] = await Promise.all([
        whatsappService.getTemplates(hospitalId),
        emailService.getTemplates(hospitalId)
      ])
      
      setWhatsappTemplates(whatsappData)
      setEmailTemplates(emailData)
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  const handleSelectFollowUp = (id: string) => {
    const newSelected = new Set(selectedFollowUps)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedFollowUps(newSelected)
    setShowBulkActions(newSelected.size > 0)
  }

  const handleSelectAll = () => {
    if (selectedFollowUps.size === followUps.length) {
      setSelectedFollowUps(new Set())
      setShowBulkActions(false)
    } else {
      setSelectedFollowUps(new Set(followUps.map(f => f.id)))
      setShowBulkActions(true)
    }
  }

  const handleBulkAction = async () => {
    if (!bulkAction || !selectedTemplate || selectedFollowUps.size === 0) {
      alert('Please select action, template, and follow-ups')
      return
    }

    setIsProcessing(true)
    setBulkResult(null)

    try {
      const followUpIds = Array.from(selectedFollowUps)
      const result = await followUpService.sendBulkCommunications(
        followUpIds,
        bulkAction,
        selectedTemplate
      )
      
      setBulkResult(result)
      
      // Refresh follow-ups to show updated status
      await loadFollowUps()
      
      // Clear selections
      setSelectedFollowUps(new Set())
      setShowBulkActions(false)
    } catch (error) {
      console.error('Error performing bulk action:', error)
      alert('Error performing bulk action')
    } finally {
      setIsProcessing(false)
    }
  }

  const getPriorityColor = (score: number) => {
    if (score >= 8) return 'text-red-600 bg-red-50'
    if (score >= 6) return 'text-orange-600 bg-orange-50'
    if (score >= 4) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      case 'in_progress': return 'text-blue-600 bg-blue-50'
      case 'completed': return 'text-green-600 bg-green-50'
      case 'failed': return 'text-red-600 bg-red-50'
      case 'cancelled': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const isOverdue = (dueDate: string, status: string) => {
    return new Date(dueDate) < new Date() && status !== 'completed'
  }

  const handleAddContact = (contact: { name: string; phone: string; email: string; role: string }) => {
    const newContact = contactsService.addContact(contact)
    loadContacts() // Reload contacts from service
    alert(`Contact "${newContact.name}" added successfully!`)
  }

  const handleDeleteContact = (contactId: string) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      const success = contactsService.deleteContact(contactId)
      if (success) {
        loadContacts()
        alert('Contact deleted successfully!')
      }
    }
  }

  const exportContacts = () => {
    contactsService.backupContacts()
  }

  const handleSendEmail = (contact: Contact) => {
    setSelectedContact(contact)
    setShowEmailComposer(true)
  }

  const handleEmailSend = async (emailData: EmailData) => {
    try {
      if (!selectedContact) return
      
      console.log(`🚀 Attempting to send email to: ${emailData.to}`)
      console.log(`📧 Subject: ${emailData.subject}`)
      
      // Send email using email service
      const result = await emailService.sendEmail({
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.body,
        attachments: emailData.attachments?.map(file => ({
          filename: file.name,
          content: file
        }))
      })
      
      if (result.success) {
        alert(`✅ Email sent successfully to ${emailData.to}!\n\nMessage ID: ${result.messageId}`)
        console.log(`✅ Email delivered successfully!`)
        setShowEmailComposer(false)
        setSelectedContact(null)
      } else {
        throw new Error(result.error || 'Email sending failed')
      }
    } catch (error) {
      console.error('❌ Error sending email:', error)
      alert(`❌ Failed to send email to ${emailData.to}\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check your email configuration in .env file.`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Follow-up Master</h1>
            <p className="text-gray-600">Manage and automate claim follow-ups</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowContactManager(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <span className="material-icon text-sm">person_add</span>
              Add Contact
            </button>
            <button
              onClick={exportContacts}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <span className="material-icon text-sm">download</span>
              Export Contacts
            </button>
            <button
              onClick={() => followUpService.processAutomaticFollowUps()}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <span className="material-icon text-sm">auto_fix_high</span>
              Run Auto Follow-ups
            </button>
            <button
              onClick={loadDashboardData}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <span className="material-icon text-sm">refresh</span>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-gray-900">{metrics.total}</div>
            <div className="text-sm text-gray-600">Total Follow-ups</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-yellow-600">{metrics.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">{metrics.in_progress}</div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-green-600">{metrics.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-red-600">{metrics.overdue}</div>
            <div className="text-sm text-gray-600">Overdue</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-orange-600">{metrics.high_priority}</div>
            <div className="text-sm text-gray-600">High Priority</div>
          </div>
        </div>

        {/* Contacts Quick View */}
        <div className="bg-white p-4 rounded-lg border mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-900">Quick Contacts</h3>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{contactStats.total} total</span>
              <span>•</span>
              <span>{contactStats.payers} payers</span>
              <span>•</span>
              <span>{contactStats.hospitals} hospitals</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {contacts.map((contact) => (
              <div key={contact.id} className="border rounded-lg p-3 hover:bg-gray-50 relative group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm">{contact.name}</div>
                    <div className="text-xs text-gray-500 capitalize mb-2">{contact.role.replace('_', ' ')}</div>
                    {contact.organization && (
                      <div className="text-xs text-blue-600 mb-2">{contact.organization}</div>
                    )}
                    <div className="space-y-1">
                      {contact.phone && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="material-icon text-xs text-green-600">phone</span>
                          <span>{contactsService.formatPhoneNumber(contact.phone)}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(contact.phone)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <span className="material-icon text-xs">content_copy</span>
                          </button>
                        </div>
                      )}
                      {contact.email && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="material-icon text-xs text-blue-600">email</span>
                          <span className="truncate">{contact.email}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(contact.email)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <span className="material-icon text-xs">content_copy</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1 ml-2">
                    <div className="flex items-center gap-1">
                      {contact.phone && (
                        <button
                          title="Send WhatsApp"
                          className="p-1 hover:bg-green-50 rounded text-green-600"
                          onClick={() => window.open(`https://wa.me/91${contact.phone.replace(/\D/g, '')}`)}
                        >
                          <span className="material-icon text-xs">chat</span>
                        </button>
                      )}
                      {contact.email && (
                        <button
                          title="Send Email"
                          className="p-1 hover:bg-blue-50 rounded text-blue-600"
                          onClick={() => handleSendEmail(contact)}
                        >
                          <span className="material-icon text-xs">email</span>
                        </button>
                      )}
                    </div>
                    {!contact.id.startsWith('default-') && (
                      <button
                        title="Delete Contact"
                        className="p-1 hover:bg-red-50 rounded text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteContact(contact.id)}
                      >
                        <span className="material-icon text-xs">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {contacts.length < 6 && (
              <button
                onClick={() => setShowContactManager(true)}
                className="border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-gray-400 hover:bg-gray-50 flex flex-col items-center justify-center text-gray-500 hover:text-gray-700"
              >
                <span className="material-icon text-2xl mb-1">add</span>
                <span className="text-sm">Add Contact</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg border mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="all">All Types</option>
                <option value="missing_documents">Missing Documents</option>
                <option value="appeal_deadline">Appeal Deadline</option>
                <option value="payment_overdue">Payment Overdue</option>
                <option value="verification_pending">Verification Pending</option>
                <option value="escalation">Escalation</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="all">All Priority</option>
                <option value="8">High (8+)</option>
                <option value="6">Medium (6+)</option>
                <option value="4">Low (4+)</option>
              </select>
            </div>
            <div>
              <label className="flex items-center mt-6">
                <input
                  type="checkbox"
                  checked={filters.overdue}
                  onChange={(e) => setFilters({ ...filters, overdue: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Show Overdue Only</span>
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search descriptions, actions..."
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {showBulkActions && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-800">
                  {selectedFollowUps.size} follow-ups selected
                </span>
                <select
                  value={bulkAction || ''}
                  onChange={(e) => setBulkAction(e.target.value as 'whatsapp' | 'email' | null)}
                  className="border border-blue-300 rounded px-3 py-1 text-sm bg-white"
                >
                  <option value="">Select Action</option>
                  <option value="whatsapp">Send WhatsApp</option>
                  <option value="email">Send Email</option>
                </select>
                {bulkAction && (
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="border border-blue-300 rounded px-3 py-1 text-sm bg-white min-w-48"
                  >
                    <option value="">Select Template</option>
                    {(bulkAction === 'whatsapp' ? whatsappTemplates : emailTemplates).map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkAction}
                  disabled={!bulkAction || !selectedTemplate || isProcessing}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm flex items-center gap-2"
                >
                  {isProcessing && <span className="material-icon text-sm animate-spin">refresh</span>}
                  {isProcessing ? 'Sending...' : 'Send Messages'}
                </button>
                <button
                  onClick={() => {
                    setSelectedFollowUps(new Set())
                    setShowBulkActions(false)
                  }}
                  className="text-blue-600 hover:text-blue-800 px-3 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
            
            {bulkResult && (
              <div className="mt-3 p-3 bg-white rounded border">
                <div className="text-sm">
                  <span className="text-green-600">✓ Sent: {bulkResult.sent}</span>
                  <span className="ml-4 text-red-600">✗ Failed: {bulkResult.failed}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Follow-ups Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <input
                      type="checkbox"
                      checked={selectedFollowUps.size === followUps.length && followUps.length > 0}
                      onChange={handleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Claim & Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type & Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Description & Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Contact Info
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Due Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Communication
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      <span className="material-icon animate-spin text-2xl">refresh</span>
                      <div className="mt-2">Loading follow-ups...</div>
                    </td>
                  </tr>
                ) : followUps.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No follow-ups found
                    </td>
                  </tr>
                ) : (
                  followUps.map((followUp) => (
                    <tr key={followUp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedFollowUps.has(followUp.id)}
                          onChange={() => handleSelectFollowUp(followUp.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {(followUp as any).claims?.claim_number || 'N/A'}
                        </div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(followUp.priority_score)}`}>
                          Priority: {followUp.priority_score}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 capitalize mb-1">
                          {followUp.follow_up_type.replace('_', ' ')}
                        </div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(followUp.status)}`}>
                          {followUp.status}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 mb-1 max-w-xs truncate" title={followUp.description}>
                          {followUp.description}
                        </div>
                        <div className="text-xs text-gray-500 max-w-xs truncate" title={followUp.action_required}>
                          {followUp.action_required}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{followUp.contact_person || 'N/A'}</div>
                        {followUp.contact_phone && (
                          <div className="text-xs text-gray-500">{followUp.contact_phone}</div>
                        )}
                        {followUp.contact_email && (
                          <div className="text-xs text-gray-500">{followUp.contact_email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className={`text-sm ${isOverdue(followUp.due_date, followUp.status) ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                          {new Date(followUp.due_date).toLocaleDateString('en-IN')}
                        </div>
                        {isOverdue(followUp.due_date, followUp.status) && (
                          <div className="text-xs text-red-500">Overdue</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-xs">
                          {followUp.whatsapp_sent && (
                            <span className="material-icon text-green-500" title="WhatsApp sent">chat</span>
                          )}
                          {followUp.email_sent && (
                            <span className="material-icon text-blue-500" title="Email sent">email</span>
                          )}
                          {followUp.phone_attempted && (
                            <span className="material-icon text-orange-500" title="Phone attempted">phone</span>
                          )}
                          {!followUp.whatsapp_sent && !followUp.email_sent && !followUp.phone_attempted && (
                            <span className="text-gray-400">No contact</span>
                          )}
                        </div>
                        {followUp.last_contact_date && (
                          <div className="text-xs text-gray-500 mt-1">
                            Last: {new Date(followUp.last_contact_date).toLocaleDateString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {followUp.contact_phone && (
                            <button
                              title="Send WhatsApp"
                              className="p-1 hover:bg-green-50 rounded text-green-600"
                            >
                              <span className="material-icon text-sm">chat</span>
                            </button>
                          )}
                          {followUp.contact_email && (
                            <button
                              title="Send Email"
                              className="p-1 hover:bg-blue-50 rounded text-blue-600"
                            >
                              <span className="material-icon text-sm">email</span>
                            </button>
                          )}
                          <button
                            title="Edit Follow-up"
                            className="p-1 hover:bg-gray-50 rounded text-gray-600"
                          >
                            <span className="material-icon text-sm">edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-gray-400">
          <p>v2.3 | Follow-up Master Dashboard with EmailJS Live Configuration | zeroriskagent.com</p>
        </div>
      </footer>

      {/* Contact Manager Modal */}
      {showContactManager && (
        <ContactManager
          onAddContact={handleAddContact}
          onClose={() => setShowContactManager(false)}
        />
      )}

      {/* Email Composer Modal */}
      {showEmailComposer && selectedContact && (
        <EmailComposer
          contact={selectedContact}
          onSend={handleEmailSend}
          onClose={() => {
            setShowEmailComposer(false)
            setSelectedContact(null)
          }}
        />
      )}
    </div>
  )
}