import { useState } from 'react'
import contactsService, { Contact } from '../services/contacts-supabase.service'

interface BulkContactImportProps {
  onImportComplete: (imported: number, skipped: number, errors: string[]) => void
  onClose: () => void
}

export default function BulkContactImport({ onImportComplete, onClose }: BulkContactImportProps) {
  const [importMethod, setImportMethod] = useState<'csv' | 'json' | 'manual'>('csv')
  const [csvText, setCsvText] = useState('')
  const [jsonText, setJsonText] = useState('')
  const [manualContacts, setManualContacts] = useState([
    { name: '', phone: '', email: '', role: 'payer_contact', organization: '' }
  ])
  const [isProcessing, setIsProcessing] = useState(false)
  const [preview, setPreview] = useState<Contact[]>([])
  const [showPreview, setShowPreview] = useState(false)

  const addManualContact = () => {
    setManualContacts([...manualContacts, { name: '', phone: '', email: '', role: 'payer_contact', organization: '' }])
  }

  const removeManualContact = (index: number) => {
    setManualContacts(manualContacts.filter((_, i) => i !== index))
  }

  const updateManualContact = (index: number, field: string, value: string) => {
    const updated = [...manualContacts]
    updated[index] = { ...updated[index], [field]: value }
    setManualContacts(updated)
  }

  const parseCsvText = (text: string): Contact[] => {
    const lines = text.trim().split('\n')
    if (lines.length === 0) return []

    // Skip header row if it looks like headers
    const startIndex = lines[0].toLowerCase().includes('name') ? 1 : 0
    const contacts: Contact[] = []

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const fields = line.split(',').map(f => f.trim().replace(/"/g, ''))
      
      if (fields.length >= 3) {
        contacts.push({
          id: '',
          name: fields[0] || '',
          phone: fields[1] || '',
          email: fields[2] || '',
          role: fields[3] || 'other',
          organization: fields[4] || '',
          createdAt: new Date().toISOString()
        })
      }
    }

    return contacts
  }

  const parseJsonText = (text: string): Contact[] => {
    try {
      const data = JSON.parse(text)
      if (Array.isArray(data)) {
        return data.map(item => ({
          id: item.id || contactsService.generateId?.() || Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: item.name || '',
          phone: item.phone || '',
          email: item.email || '',
          role: item.role || 'other',
          organization: item.organization || '',
          notes: item.notes || '',
          createdAt: item.createdAt || new Date().toISOString()
        }))
      }
    } catch (error) {
      throw new Error('Invalid JSON format')
    }
    return []
  }

  const generatePreview = () => {
    try {
      let contacts: Contact[] = []

      switch (importMethod) {
        case 'csv':
          contacts = parseCsvText(csvText)
          break
        case 'json':
          contacts = parseJsonText(jsonText)
          break
        case 'manual':
          contacts = manualContacts
            .filter(c => c.name.trim())
            .map(c => ({
              id: '',
              name: c.name.trim(),
              phone: c.phone.trim(),
              email: c.email.trim(),
              role: c.role,
              organization: c.organization.trim(),
              createdAt: new Date().toISOString()
            }))
          break
      }

      setPreview(contacts)
      setShowPreview(true)
    } catch (error) {
      alert(`Error parsing data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const processImport = async () => {
    setIsProcessing(true)
    
    try {
      // Use Supabase import functionality
      const jsonData = JSON.stringify(preview)
      const result = await contactsService.importContacts(jsonData)
      
      onImportComplete(result.imported, result.skipped, result.errors)
      onClose()
    } catch (error) {
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadTemplate = () => {
    const csvTemplate = `name,phone,email,role,organization
ESIC Regional Office Mumbai,9876543210,esic.mumbai@gov.in,payer_contact,ESIC
CGHS Delhi Office,9876543211,cghs.delhi@nic.in,payer_contact,CGHS
Hospital Claims Department,9876543212,claims@hospital.com,hospital_contact,Main Hospital`
    
    const blob = new Blob([csvTemplate], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'contacts-template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Bulk Import Contacts</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="material-icon">close</span>
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          {!showPreview ? (
            <>
              {/* Import Method Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Import Method</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { key: 'csv', title: 'CSV Text', icon: 'description', desc: 'Paste CSV data directly' },
                    { key: 'json', title: 'JSON Data', icon: 'code', desc: 'Import from JSON export' },
                    { key: 'manual', title: 'Manual Entry', icon: 'edit', desc: 'Add multiple contacts manually' }
                  ].map((method) => (
                    <button
                      key={method.key}
                      onClick={() => setImportMethod(method.key as any)}
                      className={`p-4 border rounded-lg text-left hover:bg-gray-50 ${
                        importMethod === method.key ? 'border-teal-500 bg-teal-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`material-icon text-lg ${
                          importMethod === method.key ? 'text-teal-600' : 'text-gray-500'
                        }`}>
                          {method.icon}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">{method.title}</div>
                          <div className="text-xs text-gray-500">{method.desc}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* CSV Import */}
              {importMethod === 'csv' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">CSV Data</label>
                    <button
                      onClick={downloadTemplate}
                      className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
                    >
                      <span className="material-icon text-sm">download</span>
                      Download Template
                    </button>
                  </div>
                  <textarea
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    className="w-full h-48 border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                    placeholder="name,phone,email,role,organization&#10;ESIC Regional Office Mumbai,9876543210,esic.mumbai@gov.in,payer_contact,ESIC&#10;CGHS Delhi Office,9876543211,cghs.delhi@nic.in,payer_contact,CGHS"
                  />
                  <div className="text-sm text-gray-600">
                    Format: name,phone,email,role,organization (one contact per line)
                  </div>
                </div>
              )}

              {/* JSON Import */}
              {importMethod === 'json' && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">JSON Data</label>
                  <textarea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    className="w-full h-48 border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                    placeholder='[{"name": "Contact Name", "phone": "9876543210", "email": "contact@example.com", "role": "payer_contact", "organization": "ESIC"}]'
                  />
                  <div className="text-sm text-gray-600">
                    Paste JSON array of contact objects or exported contact data
                  </div>
                </div>
              )}

              {/* Manual Entry */}
              {importMethod === 'manual' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">Manual Contacts</label>
                    <button
                      onClick={addManualContact}
                      className="text-sm bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded flex items-center gap-1"
                    >
                      <span className="material-icon text-sm">add</span>
                      Add Contact
                    </button>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {manualContacts.map((contact, index) => (
                      <div key={index} className="grid grid-cols-6 gap-2 items-end">
                        <input
                          type="text"
                          placeholder="Name"
                          value={contact.name}
                          onChange={(e) => updateManualContact(index, 'name', e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Phone"
                          value={contact.phone}
                          onChange={(e) => updateManualContact(index, 'phone', e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="email"
                          placeholder="Email"
                          value={contact.email}
                          onChange={(e) => updateManualContact(index, 'email', e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                        <select
                          value={contact.role}
                          onChange={(e) => updateManualContact(index, 'role', e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          <option value="payer_contact">Payer</option>
                          <option value="hospital_contact">Hospital</option>
                          <option value="insurance_agent">Insurance</option>
                          <option value="tpa_contact">TPA</option>
                          <option value="other">Other</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Organization"
                          value={contact.organization}
                          onChange={(e) => updateManualContact(index, 'organization', e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() => removeManualContact(index)}
                          className="text-red-600 hover:text-red-700 p-1"
                          disabled={manualContacts.length === 1}
                        >
                          <span className="material-icon text-sm">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={generatePreview}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded hover:bg-teal-700 flex items-center gap-2"
                >
                  <span className="material-icon text-sm">preview</span>
                  Preview Import
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Preview */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Import Preview ({preview.length} contacts)
                  </h3>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                  >
                    <span className="material-icon text-sm">edit</span>
                    Edit Data
                  </button>
                </div>
                
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Phone</th>
                        <th className="px-3 py-2 text-left">Email</th>
                        <th className="px-3 py-2 text-left">Role</th>
                        <th className="px-3 py-2 text-left">Organization</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {preview.map((contact, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{contact.name}</td>
                          <td className="px-3 py-2">{contact.phone}</td>
                          <td className="px-3 py-2">{contact.email}</td>
                          <td className="px-3 py-2 capitalize">{contact.role.replace('_', ' ')}</td>
                          <td className="px-3 py-2">{contact.organization}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Import Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  Back to Edit
                </button>
                <button
                  onClick={processImport}
                  disabled={isProcessing || preview.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <span className="material-icon text-sm animate-spin">refresh</span>
                      Importing...
                    </>
                  ) : (
                    <>
                      <span className="material-icon text-sm">upload</span>
                      Import {preview.length} Contacts
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}