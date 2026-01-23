// Supabase Contacts Service - Cloud database storage
import { supabase } from '../lib/supabase'

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

class SupabaseContactsService {
  private readonly TABLE_NAME = 'zero_contacts'

  // Get all contacts from Supabase
  async getContacts(): Promise<Contact[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching contacts:', error)
        return []
      }

      return data?.map(contact => ({
        ...contact,
        createdAt: contact.created_at
      })) || []
    } catch (error) {
      console.error('Error loading contacts:', error)
      return []
    }
  }

  // Add new contact
  async addContact(contactData: Omit<Contact, 'id' | 'createdAt'>): Promise<Contact | null> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .insert({
          name: contactData.name,
          phone: contactData.phone,
          email: contactData.email,
          role: contactData.role,
          organization: contactData.organization || null,
          notes: contactData.notes || null
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding contact:', error)
        return null
      }

      return {
        ...data,
        createdAt: data.created_at
      }
    } catch (error) {
      console.error('Error adding contact:', error)
      return null
    }
  }

  // Update existing contact
  async updateContact(id: string, updates: Partial<Contact>): Promise<Contact | null> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .update({
          name: updates.name,
          phone: updates.phone,
          email: updates.email,
          role: updates.role,
          organization: updates.organization,
          notes: updates.notes
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating contact:', error)
        return null
      }

      return {
        ...data,
        createdAt: data.created_at
      }
    } catch (error) {
      console.error('Error updating contact:', error)
      return null
    }
  }

  // Delete contact
  async deleteContact(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting contact:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting contact:', error)
      return false
    }
  }

  // Search contacts
  async searchContacts(query: string): Promise<Contact[]> {
    try {
      let supabaseQuery = supabase
        .from(this.TABLE_NAME)
        .select('*')
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%,organization.ilike.%${query}%`)


      const { data, error } = await supabaseQuery

      if (error) {
        console.error('Error searching contacts:', error)
        return []
      }

      return data?.map(contact => ({
        ...contact,
        createdAt: contact.created_at
      })) || []
    } catch (error) {
      console.error('Error searching contacts:', error)
      return []
    }
  }

  // Get contacts by role
  async getContactsByRole(role: string): Promise<Contact[]> {
    try {
      let query = supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('role', role)


      const { data, error } = await query

      if (error) {
        console.error('Error fetching contacts by role:', error)
        return []
      }

      return data?.map(contact => ({
        ...contact,
        createdAt: contact.created_at
      })) || []
    } catch (error) {
      console.error('Error fetching contacts by role:', error)
      return []
    }
  }

  // Export contacts as JSON
  async exportContacts(): Promise<string> {
    const contacts = await this.getContacts()
    return JSON.stringify(contacts, null, 2)
  }

  // Import contacts from JSON (with validation)
  async importContacts(jsonData: string): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const result = { imported: 0, skipped: 0, errors: [] as string[] }
    
    try {
      const contacts = JSON.parse(jsonData)
      if (!Array.isArray(contacts)) {
        result.errors.push('Invalid JSON format - expected array of contacts')
        return result
      }

      for (const contact of contacts) {
        try {
          // Validate required fields
          if (!contact.name || (!contact.phone && !contact.email)) {
            result.skipped++
            result.errors.push(`Skipped contact: Missing required fields`)
            continue
          }

          // Add contact
          const newContact = await this.addContact({
            name: contact.name,
            phone: contact.phone || '',
            email: contact.email || '',
            role: contact.role || 'other',
            organization: contact.organization || '',
            notes: contact.notes || '',
          })

          if (newContact) {
            result.imported++
          } else {
            result.skipped++
            result.errors.push(`Failed to import contact: ${contact.name}`)
          }
        } catch (error) {
          result.skipped++
          result.errors.push(`Error importing ${contact.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      return result
    } catch (error) {
      result.errors.push(`JSON parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return result
    }
  }

  // Migrate data from localStorage to Supabase
  async migrateFromLocalStorage(): Promise<{ imported: number; errors: string[] }> {
    const result = { imported: 0, errors: [] as string[] }
    
    try {
      // Get data from localStorage
      const stored = localStorage.getItem('zerorisk_contacts')
      if (!stored) {
        result.errors.push('No contacts found in localStorage')
        return result
      }

      const localContacts = JSON.parse(stored)
      if (!Array.isArray(localContacts) || localContacts.length === 0) {
        result.errors.push('No valid contacts found in localStorage')
        return result
      }

      // Import each contact
      for (const contact of localContacts) {
        try {
          const newContact = await this.addContact({
            name: contact.name,
            phone: contact.phone || '',
            email: contact.email || '',
            role: contact.role || 'other',
            organization: contact.organization || '',
            notes: contact.notes || '',
          })

          if (newContact) {
            result.imported++
          }
        } catch (error) {
          result.errors.push(`Failed to migrate ${contact.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      return result
    } catch (error) {
      result.errors.push(`Migration error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return result
    }
  }

  // Utility methods (same validation logic as before)
  formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '')
    if (this.isValidPhone(phone)) {
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
    }
    return phone
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.trim())
  }

  isValidPhone(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '')
    
    if (cleaned.length === 10) {
      return /^[6-9]\d{9}$/.test(cleaned)
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      const number = cleaned.slice(2)
      return /^[6-9]\d{9}$/.test(number)
    } else if (phone.startsWith('+91') && cleaned.length === 12) {
      const number = cleaned.slice(2)
      return /^[6-9]\d{9}$/.test(number)
    }
    
    return false
  }

  normalizePhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '')
    
    if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) {
      return cleaned
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      const number = cleaned.slice(2)
      if (/^[6-9]\d{9}$/.test(number)) {
        return number
      }
    }
    
    return phone
  }

  // Get statistics
  async getContactStats(): Promise<{ total: number; payers: number; hospitals: number }> {
    try {
      const contacts = await this.getContacts()
      return {
        total: contacts.length,
        payers: contacts.filter(c => c.role === 'payer_contact').length,
        hospitals: contacts.filter(c => c.role === 'hospital_contact').length
      }
    } catch (error) {
      console.error('Error getting contact stats:', error)
      return { total: 0, payers: 0, hospitals: 0 }
    }
  }

  // Helper methods
  getPayerContacts = () => this.getContactsByRole('payer_contact')
  getHospitalContacts = () => this.getContactsByRole('hospital_contact')
}

export default new SupabaseContactsService()