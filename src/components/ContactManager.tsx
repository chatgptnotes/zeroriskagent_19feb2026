import { useState } from 'react'

interface ContactManagerProps {
  onAddContact: (contact: { name: string; phone: string; email: string; role: string }) => void
  onClose: () => void
}

export default function ContactManager({ onAddContact, onClose }: ContactManagerProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'payer_contact'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name && (formData.phone || formData.email)) {
      onAddContact(formData)
      setFormData({ name: '', phone: '', email: '', role: 'payer_contact' })
      onClose()
    }
  }

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10 && cleaned.startsWith('9')) {
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
    }
    return phone
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Add Contact</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="material-icon">close</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Enter contact person name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="9876543210"
              maxLength={10}
            />
            {formData.phone && (
              <p className="text-xs text-gray-500 mt-1">
                Will be saved as: {formatPhoneNumber(formData.phone)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="contact@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="payer_contact">Payer Contact</option>
              <option value="hospital_contact">Hospital Contact</option>
              <option value="patient_contact">Patient Contact</option>
              <option value="insurance_agent">Insurance Agent</option>
              <option value="tpa_contact">TPA Contact</option>
              <option value="government_official">Government Official</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-start">
              <span className="material-icon text-blue-500 text-sm mt-0.5 mr-2">info</span>
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Quick Add Tips:</p>
                <ul className="text-xs space-y-1">
                  <li>• Phone numbers will be formatted automatically (+91 prefix)</li>
                  <li>• Either phone or email is required (both is better)</li>
                  <li>• This contact will be available for WhatsApp & Email follow-ups</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.name || (!formData.phone && !formData.email)}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded hover:bg-teal-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              <span className="material-icon text-sm">add</span>
              Add Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}