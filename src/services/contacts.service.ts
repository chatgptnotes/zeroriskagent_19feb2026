// Simple Contact Storage Service - No Database Required
// Stores contacts in localStorage for easy access

export interface Contact {
  id: string
  name: string
  phone: string
  email: string
  role: string
  organization?: string
  notes?: string
  createdAt: string
}

class ContactsService {
  private readonly STORAGE_KEY = 'zerorisk_contacts'

  // Get all contacts from localStorage
  getContacts(): Contact[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
      return this.getDefaultContacts()
    } catch (error) {
      console.error('Error loading contacts:', error)
      return this.getDefaultContacts()
    }
  }

  // Add new contact
  addContact(contactData: Omit<Contact, 'id' | 'createdAt'>): Contact {
    const contacts = this.getContacts()
    const newContact: Contact = {
      id: this.generateId(),
      ...contactData,
      createdAt: new Date().toISOString()
    }
    
    contacts.push(newContact)
    this.saveContacts(contacts)
    return newContact
  }

  // Update existing contact
  updateContact(id: string, updates: Partial<Contact>): Contact | null {
    const contacts = this.getContacts()
    const index = contacts.findIndex(c => c.id === id)
    
    if (index === -1) return null
    
    contacts[index] = { ...contacts[index], ...updates }
    this.saveContacts(contacts)
    return contacts[index]
  }

  // Delete contact
  deleteContact(id: string): boolean {
    const contacts = this.getContacts()
    const filtered = contacts.filter(c => c.id !== id)
    
    if (filtered.length === contacts.length) return false
    
    this.saveContacts(filtered)
    return true
  }

  // Search contacts
  searchContacts(query: string): Contact[] {
    const contacts = this.getContacts()
    const searchTerm = query.toLowerCase()
    
    return contacts.filter(contact => 
      contact.name.toLowerCase().includes(searchTerm) ||
      contact.phone.includes(searchTerm) ||
      contact.email.toLowerCase().includes(searchTerm) ||
      contact.role.toLowerCase().includes(searchTerm) ||
      (contact.organization && contact.organization.toLowerCase().includes(searchTerm))
    )
  }

  // Get contacts by role
  getContactsByRole(role: string): Contact[] {
    return this.getContacts().filter(c => c.role === role)
  }

  // Export contacts as JSON
  exportContacts(): string {
    return JSON.stringify(this.getContacts(), null, 2)
  }

  // Import contacts from JSON
  importContacts(jsonData: string): boolean {
    try {
      const contacts = JSON.parse(jsonData)
      if (Array.isArray(contacts)) {
        this.saveContacts(contacts)
        return true
      }
      return false
    } catch (error) {
      console.error('Error importing contacts:', error)
      return false
    }
  }

  // Clear all contacts
  clearAllContacts(): void {
    localStorage.removeItem(this.STORAGE_KEY)
  }

  // Backup contacts
  backupContacts(): void {
    const contacts = this.getContacts()
    const backup = {
      contacts,
      timestamp: new Date().toISOString(),
      version: '1.0'
    }
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `zerorisk-contacts-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Private methods
  private saveContacts(contacts: Contact[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(contacts))
    } catch (error) {
      console.error('Error saving contacts:', error)
    }
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }

  private getDefaultContacts(): Contact[] {
    const defaultContacts: Contact[] = [
      {
        id: 'default-1',
        name: 'ESIC Regional Office Mumbai',
        phone: '9876543210',
        email: 'esic.mumbai@gov.in',
        role: 'payer_contact',
        organization: 'ESIC',
        createdAt: new Date().toISOString()
      },
      {
        id: 'default-2',
        name: 'CGHS Delhi Office',
        phone: '9876543211',
        email: 'cghs.delhi@nic.in',
        role: 'payer_contact',
        organization: 'CGHS',
        createdAt: new Date().toISOString()
      },
      {
        id: 'default-3',
        name: 'Hospital Claims Department',
        phone: '9876543212',
        email: 'claims@hospital.com',
        role: 'hospital_contact',
        organization: 'Main Hospital',
        createdAt: new Date().toISOString()
      },
      {
        id: 'default-4',
        name: 'TPA Healthcare Services',
        phone: '9876543213',
        email: 'support@tpahealthcare.com',
        role: 'tpa_contact',
        organization: 'TPA Healthcare',
        createdAt: new Date().toISOString()
      },
      {
        id: 'default-5',
        name: 'Insurance Claims Officer',
        phone: '9876543214',
        email: 'claims@insurance.com',
        role: 'insurance_agent',
        organization: 'Star Insurance',
        createdAt: new Date().toISOString()
      }
    ]

    // Save default contacts to localStorage
    this.saveContacts(defaultContacts)
    return defaultContacts
  }

  // Utility methods for quick access
  getPayerContacts(): Contact[] {
    return this.getContactsByRole('payer_contact')
  }

  getHospitalContacts(): Contact[] {
    return this.getContactsByRole('hospital_contact')
  }

  getTotalContacts(): number {
    return this.getContacts().length
  }

  // Format phone number
  formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10 && cleaned.startsWith('9')) {
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
    }
    return phone
  }

  // Validate email
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Validate phone
  isValidPhone(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '')
    return cleaned.length === 10 && cleaned.startsWith('9')
  }
}

export default new ContactsService()