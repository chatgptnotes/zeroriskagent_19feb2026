import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import whatsappService from '../services/whatsapp.service'
import emailService from '../services/email.service'
import { MessageTemplate } from '../types/database.types'

export default function Templates() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'whatsapp' | 'email' | 'sms'>('all')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'missing_documents' | 'appeal_deadline' | 'payment_overdue' | 'verification_pending' | 'escalation' | 'custom'>('all')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    category: 'missing_documents' as MessageTemplate['category'],
    channel: 'whatsapp' as MessageTemplate['channel'],
    language: 'en' as MessageTemplate['language'],
    subject: '',
    message_content: '',
    variables: [] as string[]
  })

  useEffect(() => {
    loadTemplates()
  }, [selectedChannel, selectedCategory])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const hospitalId = (user as any)?.user_metadata?.hospital_id || 'default'
      
      let whatsappTemplates: MessageTemplate[] = []
      let emailTemplates: MessageTemplate[] = []

      if (selectedChannel === 'all' || selectedChannel === 'whatsapp') {
        whatsappTemplates = await whatsappService.getTemplates(hospitalId, selectedCategory !== 'all' ? selectedCategory : undefined)
      }

      if (selectedChannel === 'all' || selectedChannel === 'email') {
        emailTemplates = await emailService.getTemplates(hospitalId, selectedCategory !== 'all' ? selectedCategory : undefined)
      }

      const allTemplates = [...whatsappTemplates, ...emailTemplates]
      setTemplates(allTemplates)
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = async () => {
    try {
      const hospitalId = (user as any)?.user_metadata?.hospital_id
      const createdBy = user?.id || 'system'

      const templateData = {
        ...formData,
        hospital_id: hospitalId,
        is_active: true,
        usage_count: 0,
        last_used_at: null,
        created_by: createdBy
      }

      let result: MessageTemplate | null = null

      if (formData.channel === 'whatsapp') {
        result = await whatsappService.createTemplate(templateData)
      } else {
        result = await emailService.createTemplate(templateData)
      }

      if (result) {
        setShowCreateForm(false)
        resetForm()
        loadTemplates()
        alert('Template created successfully!')
      } else {
        alert('Failed to create template')
      }
    } catch (error) {
      console.error('Error creating template:', error)
      alert('Error creating template')
    }
  }

  const handleEditTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      category: template.category,
      channel: template.channel,
      language: template.language,
      subject: template.subject || '',
      message_content: template.message_content,
      variables: template.variables
    })
    setShowCreateForm(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'missing_documents',
      channel: 'whatsapp',
      language: 'en',
      subject: '',
      message_content: '',
      variables: []
    })
    setEditingTemplate(null)
  }

  const handleVariableChange = (index: number, value: string) => {
    const newVariables = [...formData.variables]
    newVariables[index] = value
    setFormData({ ...formData, variables: newVariables })
  }

  const addVariable = () => {
    setFormData({ ...formData, variables: [...formData.variables, ''] })
  }

  const removeVariable = (index: number) => {
    const newVariables = formData.variables.filter((_, i) => i !== index)
    setFormData({ ...formData, variables: newVariables })
  }

  const getCategoryLabel = (category: string) => {
    const labels = {
      'missing_documents': 'Missing Documents',
      'appeal_deadline': 'Appeal Deadline',
      'payment_overdue': 'Payment Overdue',
      'verification_pending': 'Verification Pending',
      'escalation': 'Escalation',
      'custom': 'Custom'
    }
    return labels[category as keyof typeof labels] || category
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp': return 'chat'
      case 'email': return 'email'
      case 'sms': return 'sms'
      default: return 'message'
    }
  }

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'whatsapp': return 'text-green-600 bg-green-50'
      case 'email': return 'text-blue-600 bg-blue-50'
      case 'sms': return 'text-purple-600 bg-purple-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Message Templates</h1>
            <p className="text-gray-600">Manage WhatsApp and Email templates for follow-ups</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <span className="material-icon text-sm">add</span>
            Create Template
          </button>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg border mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value as any)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="all">All Channels</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="all">All Categories</option>
                <option value="missing_documents">Missing Documents</option>
                <option value="appeal_deadline">Appeal Deadline</option>
                <option value="payment_overdue">Payment Overdue</option>
                <option value="verification_pending">Verification Pending</option>
                <option value="escalation">Escalation</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-8">
              <span className="material-icon animate-spin text-2xl text-gray-400">refresh</span>
              <p className="text-gray-500 mt-2">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <span className="material-icon text-4xl text-gray-300">message</span>
              <p className="text-gray-500 mt-2">No templates found</p>
            </div>
          ) : (
            templates.map((template) => (
              <div key={template.id} className="bg-white rounded-lg border hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">{template.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getChannelColor(template.channel)}`}>
                          <span className="material-icon text-xs mr-1">{getChannelIcon(template.channel)}</span>
                          {template.channel}
                        </span>
                        <span className="text-xs text-gray-500">{getCategoryLabel(template.category)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="p-1 hover:bg-gray-50 rounded text-gray-400 hover:text-gray-600"
                    >
                      <span className="material-icon text-sm">edit</span>
                    </button>
                  </div>

                  {template.subject && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-gray-500">Subject:</span>
                      <p className="text-sm text-gray-700 truncate">{template.subject}</p>
                    </div>
                  )}

                  <div className="mb-3">
                    <span className="text-xs font-medium text-gray-500">Message:</span>
                    <p className="text-sm text-gray-700 line-clamp-3">{template.message_content}</p>
                  </div>

                  {template.variables.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs font-medium text-gray-500">Variables:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.variables.map((variable, index) => (
                          <span key={index} className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                            {`{{${variable}}}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t">
                    <span>Used {template.usage_count} times</span>
                    <span className={template.is_active ? 'text-green-600' : 'text-red-600'}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Template Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingTemplate ? 'Edit Template' : 'Create Template'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateForm(false)
                    resetForm()
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="material-icon">close</span>
                </button>
              </div>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name*</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    placeholder="Template name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Channel*</label>
                  <select
                    value={formData.channel}
                    onChange={(e) => setFormData({ ...formData, channel: e.target.value as any })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category*</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="missing_documents">Missing Documents</option>
                    <option value="appeal_deadline">Appeal Deadline</option>
                    <option value="payment_overdue">Payment Overdue</option>
                    <option value="verification_pending">Verification Pending</option>
                    <option value="escalation">Escalation</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value as any })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="mr">Marathi</option>
                    <option value="gu">Gujarati</option>
                  </select>
                </div>
              </div>

              {formData.channel === 'email' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    placeholder="Email subject"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message Content*</label>
                <textarea
                  value={formData.message_content}
                  onChange={(e) => setFormData({ ...formData, message_content: e.target.value })}
                  rows={8}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="Template message content. Use {{variable}} for dynamic content."
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Variables</label>
                  <button
                    type="button"
                    onClick={addVariable}
                    className="text-teal-600 hover:text-teal-700 text-sm flex items-center gap-1"
                  >
                    <span className="material-icon text-sm">add</span>
                    Add Variable
                  </button>
                </div>
                {formData.variables.map((variable, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={variable}
                      onChange={(e) => handleVariableChange(index, e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                      placeholder="Variable name"
                    />
                    <button
                      type="button"
                      onClick={() => removeVariable(index)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <span className="material-icon text-sm">remove</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  resetForm()
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTemplate}
                disabled={!formData.name || !formData.message_content}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded hover:bg-teal-700 disabled:bg-gray-400"
              >
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-gray-400">
          <p>v1.8 | Message Templates | zeroriskagent.com</p>
        </div>
      </footer>
    </div>
  )
}