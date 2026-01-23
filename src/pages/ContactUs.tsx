import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import emailService from '../services/email.service'

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters')
})

type ContactFormData = z.infer<typeof contactSchema>

export default function ContactUs() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema)
  })

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      // Use the dedicated contact form method
      const result = await emailService.sendContactForm({
        name: data.name,
        email: data.email,
        phone: data.phone,
        subject: data.subject,
        message: data.message
      })

      if (result.success) {
        setSubmitStatus('success')
        reset()
      } else {
        setSubmitStatus('error')
        setErrorMessage(result.error || 'Failed to send message')
      }
    } catch (error) {
      setSubmitStatus('error')
      setErrorMessage('An unexpected error occurred')
      console.error('Contact form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 text-white">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-slate-900/50 backdrop-blur-xl border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg">
                <span className="material-icon text-white" style={{ fontSize: '28px' }}>local_hospital</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Zero Risk Agent</h1>
                <p className="text-xs text-gray-400">AI Revenue Recovery</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <a 
                href="/" 
                className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors duration-200"
              >
                <span className="material-icon" style={{ fontSize: '18px' }}>home</span>
                <span>Home</span>
              </a>
              <a 
                href="/login" 
                className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors duration-200"
              >
                <span className="material-icon" style={{ fontSize: '18px' }}>login</span>
                <span>Login</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 relative z-10">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl p-4 mb-8">
              <span className="material-icon text-white" style={{ fontSize: '32px' }}>contact_mail</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Contact Us
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Have questions about our AI-powered claims recovery system? We're here to help.
            </p>
          </div>

          {/* Contact Form */}
          <div className="relative group max-w-2xl mx-auto">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 via-orange-600 to-red-600 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-300"></div>
            <div className="relative bg-slate-800/50 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
              
              {/* Success Message */}
              {submitStatus === 'success' && (
                <div className="mb-6 bg-green-900/30 border border-green-500/50 rounded-xl p-4 flex items-center gap-3">
                  <span className="material-icon text-green-400">check_circle</span>
                  <div>
                    <p className="text-green-400 font-medium">Message sent successfully!</p>
                    <p className="text-green-300 text-sm">We'll get back to you within 24 hours.</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {submitStatus === 'error' && (
                <div className="mb-6 bg-red-900/30 border border-red-500/50 rounded-xl p-4 flex items-center gap-3">
                  <span className="material-icon text-red-400">error</span>
                  <div>
                    <p className="text-red-400 font-medium">Failed to send message</p>
                    <p className="text-red-300 text-sm">{errorMessage}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <span className="material-icon text-red-400 mr-2" style={{ fontSize: '16px' }}>person</span>
                      Full Name
                    </label>
                    <input
                      {...register('name')}
                      type="text"
                      className="w-full bg-slate-900/50 border border-white/20 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter your full name"
                    />
                    {errors.name && (
                      <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                        <span className="material-icon" style={{ fontSize: '14px' }}>error</span>
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Phone Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <span className="material-icon text-red-400 mr-2" style={{ fontSize: '16px' }}>phone</span>
                      Phone Number
                    </label>
                    <input
                      {...register('phone')}
                      type="tel"
                      className="w-full bg-slate-900/50 border border-white/20 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                      placeholder="+91 98765 43210"
                    />
                    {errors.phone && (
                      <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                        <span className="material-icon" style={{ fontSize: '14px' }}>error</span>
                        {errors.phone.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <span className="material-icon text-red-400 mr-2" style={{ fontSize: '16px' }}>email</span>
                    Email Address
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full bg-slate-900/50 border border-white/20 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                    placeholder="your.email@company.com"
                  />
                  {errors.email && (
                    <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                      <span className="material-icon" style={{ fontSize: '14px' }}>error</span>
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Subject Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <span className="material-icon text-red-400 mr-2" style={{ fontSize: '16px' }}>subject</span>
                    Subject
                  </label>
                  <input
                    {...register('subject')}
                    type="text"
                    className="w-full bg-slate-900/50 border border-white/20 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                    placeholder="How can we help you?"
                  />
                  {errors.subject && (
                    <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                      <span className="material-icon" style={{ fontSize: '14px' }}>error</span>
                      {errors.subject.message}
                    </p>
                  )}
                </div>

                {/* Message Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <span className="material-icon text-red-400 mr-2" style={{ fontSize: '16px' }}>message</span>
                    Message
                  </label>
                  <textarea
                    {...register('message')}
                    rows={5}
                    className="w-full bg-slate-900/50 border border-white/20 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 resize-none"
                    placeholder="Tell us about your hospital, current claims challenges, and how we can help..."
                  />
                  {errors.message && (
                    <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                      <span className="material-icon" style={{ fontSize: '14px' }}>error</span>
                      {errors.message.message}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl blur opacity-75 group-hover:opacity-100 group-disabled:opacity-50 transition duration-200"></div>
                    <div className="relative px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl flex items-center justify-center gap-3 text-lg font-bold group-hover:scale-105 group-disabled:scale-100 transition-transform duration-200">
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                          <span>Sending Message...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-icon">send</span>
                          <span>Send Message</span>
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </form>

              {/* Contact Information */}
              <div className="mt-12 pt-8 border-t border-white/10">
                <h3 className="text-xl font-bold text-white mb-6 text-center">Other Ways to Reach Us</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="inline-flex p-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg mb-3">
                      <span className="material-icon text-white" style={{ fontSize: '24px' }}>email</span>
                    </div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="text-white font-medium">aimsaiproject@gmail.com</p>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex p-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg mb-3">
                      <span className="material-icon text-white" style={{ fontSize: '24px' }}>call</span>
                    </div>
                    <p className="text-sm text-gray-400">Phone</p>
                    <p className="text-white font-medium">+91-22-12345678</p>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg mb-3">
                      <span className="material-icon text-white" style={{ fontSize: '24px' }}>schedule</span>
                    </div>
                    <p className="text-sm text-gray-400">Response Time</p>
                    <p className="text-white font-medium">Within 24 hours</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative bg-slate-900/80 backdrop-blur-xl border-t border-white/10 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
          <p>v1.3 - 2026-01-23 | Contact Form with EmailJS Integration</p>
          <p className="mt-2">© 2026 Zero Risk Agent. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}