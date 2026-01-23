import { useState } from 'react'
import contactsService from '../services/contacts-supabase.service'

interface ContactManagerProps {
  onAddContact: (contact: { name: string; phone: string; email: string; role: string; organization?: string }) => void
  onClose: () => void
}

export default function ContactManager({ onAddContact, onClose }: ContactManagerProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'payer_contact',
    organization: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Contact name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }

    // Phone validation
    if (formData.phone && !contactsService.isValidPhone(formData.phone)) {
      newErrors.phone = 'Enter a valid Indian mobile number (10 digits starting with 6, 7, 8, or 9)'
    }

    // Email validation
    if (formData.email && !contactsService.isValidEmail(formData.email)) {
      newErrors.email = 'Enter a valid email address'
    }

    // At least one contact method required
    if (!formData.phone && !formData.email) {
      newErrors.contact = 'Either phone number or email address is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      const normalizedData = {
        ...formData,
        name: formData.name.trim(),
        phone: formData.phone ? contactsService.normalizePhone(formData.phone) : '',
        email: formData.email.trim().toLowerCase(),
        organization: formData.organization.trim()
      }
      
      onAddContact(normalizedData)
      setFormData({ name: '', phone: '', email: '', role: 'payer_contact', organization: '' })
      setErrors({})
      onClose()
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10) // Only digits, max 10
    setFormData({ ...formData, phone: value })
    
    // Clear phone error when user starts typing
    if (errors.phone) {
      setErrors({ ...errors, phone: '' })
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, email: e.target.value })
    
    // Clear email error when user starts typing
    if (errors.email) {
      setErrors({ ...errors, email: '' })
    }
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
          {/* Contact Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value })
                if (errors.name) setErrors({ ...errors, name: '' })
              }}
              className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.name 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-teal-500'
              }`}
              placeholder="Enter contact person name"
            />
            {errors.name && (
              <p className="text-xs text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={handlePhoneChange}
              className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.phone 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-teal-500'
              }`}
              placeholder="9876543210"
              maxLength={10}
            />
            {errors.phone && (
              <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
            )}
            {formData.phone && !errors.phone && contactsService.isValidPhone(formData.phone) && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Will be saved as: {contactsService.formatPhoneNumber(formData.phone)}
              </p>
            )}
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={handleEmailChange}
              className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.email 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-teal-500'
              }`}
              placeholder="contact@example.com"
            />
            {errors.email && (
              <p className="text-xs text-red-600 mt-1">{errors.email}</p>
            )}
            {formData.email && !errors.email && contactsService.isValidEmail(formData.email) && (
              <p className="text-xs text-green-600 mt-1">✓ Valid email address</p>
            )}
          </div>

          {/* Organization */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization
            </label>
            <input
              type="text"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="ESIC, CGHS, Hospital name, etc."
            />
          </div>

          {/* Contact Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="payer_contact">Payer Contact (ESIC, CGHS, etc.)</option>
              <option value="hospital_contact">Hospital Contact</option>
              <option value="patient_contact">Patient Contact</option>
              <option value="insurance_agent">Insurance Agent</option>
              <option value="tpa_contact">TPA Contact</option>
              <option value="government_official">Government Official</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Contact method error */}
          {errors.contact && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-xs text-red-600">{errors.contact}</p>
            </div>
          )}

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