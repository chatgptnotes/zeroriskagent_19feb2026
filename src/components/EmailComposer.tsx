import { useState } from 'react'
import { Contact } from '../services/contacts.service'

interface EmailComposerProps {
  contact: Contact
  onSend: (emailData: EmailData) => void
  onClose: () => void
}

export interface EmailData {
  to: string
  subject: string
  body: string
  attachments?: File[]
  template?: string
}

const EMAIL_TEMPLATES = {
  follow_up: {
    subject: 'Follow-up: Claim Processing Status',
    body: `Dear {{name}},

I hope this email finds you well. I am writing to follow up on the status of our recent claim submission.

**Details:**
- Organization: {{organization}}
- Contact: {{phone}}
- Reference: [Claim Number]

Could you please provide an update on the current status and expected timeline for resolution?

Thank you for your time and assistance.

Best regards,
Zero Risk Agent Team`
  },
  document_request: {
    subject: 'Document Request - Additional Information Required',
    body: `Dear {{name}},

We are writing to request additional documentation for claim processing.

**Required Documents:**
- [List required documents here]
- [Additional requirements]

**Contact Information:**
Organization: {{organization}}
Phone: {{phone}}
Email: {{email}}

Please submit the requested documents within 7 business days to avoid any delays in processing.

Thank you for your cooperation.

Best regards,
Claims Processing Team`
  },
  payment_inquiry: {
    subject: 'Payment Status Inquiry',
    body: `Dear {{name}},

I hope you are doing well. I am reaching out regarding the payment status for our recent claim submission.

**Claim Details:**
- Submission Date: [Date]
- Amount: [Amount]
- Reference: [Reference Number]

**Contact Details:**
Organization: {{organization}}
Phone: {{phone}}

Could you please provide an update on the payment timeline?

Thank you for your prompt attention to this matter.

Best regards,
Finance Team`
  },
  meeting_request: {
    subject: 'Meeting Request - Discussion Required',
    body: `Dear {{name}},

I hope this message finds you well. I would like to schedule a meeting to discuss important matters regarding our ongoing collaboration.

**Proposed Topics:**
- [Topic 1]
- [Topic 2]
- [Any additional items]

**Your Details:**
Organization: {{organization}}
Phone: {{phone}}
Email: {{email}}

Please let me know your availability for the coming week.

Looking forward to our discussion.

Best regards,
Zero Risk Agent Team`
  },
  general: {
    subject: 'General Inquiry',
    body: `Dear {{name}},

I hope you are having a great day. I am writing to discuss [topic/matter].

**Contact Information:**
Organization: {{organization}}
Phone: {{phone}}
Email: {{email}}

Please feel free to reach out if you need any additional information.

Thank you for your time.

Best regards,
Zero Risk Agent Team`
  }
}

export default function EmailComposer({ contact, onSend, onClose }: EmailComposerProps) {
  const [emailData, setEmailData] = useState<EmailData>({
    to: contact.email,
    subject: '',
    body: ''
  })
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [isHtmlMode, setIsHtmlMode] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])

  const replaceVariables = (text: string): string => {
    return text
      .replace(/{{name}}/g, contact.name)
      .replace(/{{email}}/g, contact.email)
      .replace(/{{phone}}/g, contact.phone)
      .replace(/{{organization}}/g, contact.organization || 'Organization')
      .replace(/{{role}}/g, contact.role.replace('_', ' '))
  }

  const applyTemplate = (templateKey: string) => {
    const template = EMAIL_TEMPLATES[templateKey as keyof typeof EMAIL_TEMPLATES]
    if (template) {
      setEmailData({
        ...emailData,
        subject: replaceVariables(template.subject),
        body: replaceVariables(template.body),
        template: templateKey
      })
      setSelectedTemplate(templateKey)
    }
  }

  const handleFileAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setAttachments([...attachments, ...newFiles])
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  const handleSend = () => {
    if (!emailData.to || !emailData.subject || !emailData.body) {
      alert('Please fill in all required fields (To, Subject, and Body)')
      return
    }

    const finalEmailData = {
      ...emailData,
      attachments: attachments.length > 0 ? attachments : undefined
    }

    onSend(finalEmailData)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="material-icon text-blue-600">email</span>
                Compose Email
              </h2>
              <p className="text-sm text-gray-600">to {contact.name} ({contact.organization})</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-white"
            >
              <span className="material-icon">close</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Template Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Quick Templates</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {Object.entries(EMAIL_TEMPLATES).map(([key, _template]) => (
                <button
                  key={key}
                  onClick={() => applyTemplate(key)}
                  className={`p-2 text-xs border rounded-lg hover:bg-blue-50 transition-colors ${
                    selectedTemplate === key ? 'bg-blue-100 border-blue-300' : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  {key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          {/* Email Form */}
          <div className="space-y-4">
            {/* To Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To *</label>
              <input
                type="email"
                value={emailData.to}
                onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="recipient@example.com"
                required
              />
            </div>

            {/* Subject Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <input
                type="text"
                value={emailData.subject}
                onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter email subject"
                required
              />
            </div>

            {/* Body Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Message Body *</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Text</span>
                  <button
                    onClick={() => setIsHtmlMode(!isHtmlMode)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      isHtmlMode ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      isHtmlMode ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                  <span className="text-xs text-gray-500">HTML</span>
                </div>
              </div>
              <textarea
                value={emailData.body}
                onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                rows={12}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder={isHtmlMode ? 
                  'Enter HTML email content...' : 
                  'Enter your email message here...'
                }
                required
              />
            </div>

            {/* Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Attachments</label>
              <div className="border border-dashed border-gray-300 rounded-lg p-4">
                <input
                  type="file"
                  multiple
                  onChange={handleFileAttachment}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2 text-gray-600 hover:text-gray-800"
                >
                  <span className="material-icon text-2xl">attach_file</span>
                  <span className="text-sm">Click to attach files or drag and drop</span>
                </label>
              </div>
              
              {/* Attached Files */}
              {attachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex items-center gap-2">
                        <span className="material-icon text-gray-500 text-sm">description</span>
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                      </div>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <span className="material-icon text-sm">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Email Preview */}
          {emailData.subject && emailData.body && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
              <div className="bg-white border rounded p-3 text-sm">
                <div className="border-b pb-2 mb-3">
                  <div><strong>To:</strong> {emailData.to}</div>
                  <div><strong>Subject:</strong> {emailData.subject}</div>
                </div>
                <div className="whitespace-pre-wrap">
                  {isHtmlMode ? (
                    <div dangerouslySetInnerHTML={{ __html: emailData.body }} />
                  ) : (
                    emailData.body
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {attachments.length > 0 && (
              <span>{attachments.length} attachment(s) selected</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 text-sm font-medium text-white bg-gray-600 border border-transparent rounded hover:bg-gray-700"
            >
              Save Draft
            </button>
            <button
              onClick={handleSend}
              disabled={!emailData.to || !emailData.subject || !emailData.body}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              <span className="material-icon text-sm">send</span>
              Send Email
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}