# EmailJS Template Setup Guide

This guide explains how to create the EmailJS template for the Contact Us form.

## Prerequisites

1. EmailJS account: https://www.emailjs.com/
2. Email service configured (Gmail/Outlook/etc.)
3. Service ID, Template ID, and Public Key from EmailJS

## Current Configuration

The environment variables are already set in `.env`:
```env
VITE_EMAILJS_SERVICE_ID=service_orw589l
VITE_EMAILJS_TEMPLATE_ID=template_r0by6uo
VITE_EMAILJS_PUBLIC_KEY=pR4Q3cMkWIXRg1hA0

# Optional: Specific template IDs for each template type
# If not set, will fallback to VITE_EMAILJS_TEMPLATE_ID
VITE_EMAILJS_FOLLOWUP_TEMPLATE_ID=template_followup
VITE_EMAILJS_DOCUMENT_TEMPLATE_ID=template_document
VITE_EMAILJS_PAYMENT_TEMPLATE_ID=template_payment
VITE_EMAILJS_MEETING_TEMPLATE_ID=template_meeting
VITE_EMAILJS_GENERAL_TEMPLATE_ID=template_general
```

## EmailJS Template Setup

### 1. EmailComposer Template Types

The EmailComposer supports 5 template types. You can create separate templates for each or use one universal template.

#### Template Types:
1. **Follow Up** (`follow_up`) - Claim processing status updates
2. **Document Request** (`document_request`) - Requesting additional documentation
3. **Payment Inquiry** (`payment_inquiry`) - Payment status inquiries  
4. **Meeting Request** (`meeting_request`) - Schedule meetings
5. **General** (`general`) - General communications

### 2. Universal Template Configuration (Recommended)

Create one template that works for all types:

**Template ID:** `template_r0by6uo`

**IMPORTANT: EmailJS Template Settings:**
- **To Email:** `{{to_email}}` ⚠️ **MUST use variable, not hardcoded email**
- **From Name:** `{{from_name}}`
- **From Email:** Use your verified sender email
- **Reply To:** `{{reply_to}}`

**Subject Line:**
```
{{subject}} - Zero Risk Agent
```

**HTML Content:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contact Form Submission</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 20px; 
            background-color: #f5f5f5;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: #fff; 
            border-radius: 12px; 
            box-shadow: 0 4px 20px rgba(0,0,0,0.1); 
            overflow: hidden;
        }
        .header { 
            background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); 
            color: white; 
            padding: 30px; 
            text-align: center; 
        }
        .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: bold; 
        }
        .header p { 
            margin: 8px 0 0 0; 
            opacity: 0.9; 
            font-size: 14px; 
        }
        .content { 
            padding: 30px; 
        }
        .contact-info { 
            background: #f8fafc; 
            padding: 25px; 
            border-radius: 8px; 
            margin: 20px 0; 
            border-left: 4px solid #dc2626;
        }
        .contact-info h3 { 
            margin: 0 0 15px 0; 
            color: #dc2626; 
            font-size: 18px; 
        }
        .info-row { 
            margin: 10px 0; 
            display: flex; 
            align-items: center; 
        }
        .info-row strong { 
            min-width: 80px; 
            color: #374151; 
        }
        .message-section { 
            background: #fff; 
            padding: 25px; 
            border-radius: 8px; 
            border: 1px solid #e5e7eb; 
            margin: 20px 0; 
        }
        .message-section h3 { 
            margin: 0 0 15px 0; 
            color: #111827; 
            font-size: 18px; 
        }
        .message-content { 
            background: #f9fafb; 
            padding: 20px; 
            border-radius: 6px; 
            border-left: 4px solid #059669; 
            font-style: italic; 
            line-height: 1.7;
        }
        .footer { 
            background: #1f2937; 
            color: #9ca3af; 
            padding: 25px; 
            text-align: center; 
            font-size: 12px; 
        }
        .footer p { 
            margin: 5px 0; 
        }
        .badge { 
            display: inline-block; 
            background: linear-gradient(135deg, #059669 0%, #10b981 100%); 
            color: white; 
            padding: 6px 12px; 
            border-radius: 20px; 
            font-size: 11px; 
            font-weight: bold; 
            text-transform: uppercase; 
            margin: 10px 0; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 Zero Risk Agent</h1>
            <p>AI-Powered Healthcare Claims Recovery</p>
            <div class="badge">New Contact Form Submission</div>
        </div>
        
        <div class="content">
            <h2 style="color: #111827; margin-top: 0;">Contact Form Submission</h2>
            <p style="color: #6b7280;">You have received a new message through your website contact form.</p>
            
            <div class="contact-info">
                <h3>📋 Contact Information</h3>
                <div class="info-row">
                    <strong>👤 Name:</strong> 
                    <span>{{name}}</span>
                </div>
                <div class="info-row">
                    <strong>📧 Email:</strong> 
                    <span><a href="mailto:{{email}}" style="color: #dc2626; text-decoration: none;">{{email}}</a></span>
                </div>
                <div class="info-row">
                    <strong>📞 Phone:</strong> 
                    <span><a href="tel:{{phone}}" style="color: #dc2626; text-decoration: none;">{{phone}}</a></span>
                </div>
                <div class="info-row">
                    <strong>📝 Subject:</strong> 
                    <span>{{subject}}</span>
                </div>
            </div>

            <div class="message-section">
                <h3>💬 Message Content</h3>
                <div class="message-content">
                    {{message}}
                </div>
            </div>

            <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-weight: 500;">
                    <strong>⏰ Action Required:</strong> Please respond to this inquiry within 24 hours to maintain our commitment to excellent customer service.
                </p>
            </div>
        </div>

        <div class="footer">
            <p><strong>Zero Risk Agent</strong> - Healthcare Claims Recovery System</p>
            <p>This email was automatically generated from your website contact form</p>
            <p>© 2026 Zero Risk Agent. All rights reserved.</p>
            <p style="margin-top: 15px; font-size: 11px;">
                🌐 zeroriskagent.com | 📱 +91-22-12345678 | 📧 aimsaiproject@gmail.com
            </p>
        </div>
    </div>
</body>
</html>
```

### 3. Template Variables

The template uses these variables that will be automatically populated by the contact form:

- `{{name}}` - Customer's full name
- `{{email}}` - Customer's email address  
- `{{phone}}` - Customer's phone number
- `{{subject}}` - Subject line from form
- `{{message}}` - Main message content

### 4. Auto-Reply Template (Optional)

Create a second template for auto-reply to customers:

**Template ID:** `template_auto_reply`

**Subject:** `Thank you for contacting Zero Risk Agent - We'll respond within 24 hours`

**HTML Content:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Thank you for contacting us</title>
    <style>
        /* Same styles as above */
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .footer { background: #1f2937; color: #9ca3af; padding: 25px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Message Received</h1>
            <p>Thank you for contacting Zero Risk Agent</p>
        </div>
        
        <div class="content">
            <h2>Dear {{name}},</h2>
            <p>Thank you for reaching out to Zero Risk Agent. We have successfully received your message and our team will review it shortly.</p>
            
            <div style="background: #f0fdf4; border: 1px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #047857;">
                    <strong>📋 Your Message Summary:</strong><br>
                    <strong>Subject:</strong> {{subject}}<br>
                    <strong>Submitted:</strong> Today
                </p>
            </div>

            <p><strong>What happens next?</strong></p>
            <ul style="color: #374151;">
                <li>Our AI specialists will review your inquiry</li>
                <li>We'll respond within 24 hours with personalized recommendations</li>
                <li>If urgent, please call us at +91-22-12345678</li>
            </ul>

            <p>In the meantime, feel free to explore our <a href="https://zeroriskagent.com" style="color: #dc2626;">claims recovery platform</a> and see how we've helped recover millions for hospitals like yours.</p>
            
            <p style="margin-top: 30px;">Best regards,<br><strong>Zero Risk Agent Team</strong></p>
        </div>

        <div class="footer">
            <p><strong>Zero Risk Agent</strong> - AI-Powered Healthcare Claims Recovery</p>
            <p>🌐 zeroriskagent.com | 📱 +91-22-12345678 | 📧 aimsaiproject@gmail.com</p>
        </div>
    </div>
</body>
</html>
```

## Testing the Template

1. Use the "Test" feature in EmailJS dashboard
2. Fill in sample values for all variables
3. Send test email to verify formatting
4. Check both desktop and mobile rendering

## EmailComposer Integration

### How It Works

1. **Template Selection**: User selects a quick template in EmailComposer
2. **EmailJS Toggle**: User can enable/disable EmailJS mode (enabled by default)
3. **Smart Routing**: 
   - If EmailJS enabled + template selected → Uses `sendTemplateEmail()` method
   - Otherwise → Uses standard `sendEmail()` method
4. **Variable Substitution**: Contact details automatically populate template variables

### Template Variables Available

The EmailComposer passes these variables to EmailJS templates:

- `{{to_email}}` - Recipient email address
- `{{to_name}}` - Recipient name (from contact)
- `{{from_name}}` - Sender name (Zero Risk Agent)
- `{{reply_to}}` - Reply-to email address
- `{{subject}}` - Email subject line
- `{{message}}` - Email body content
- `{{html_content}}` - HTML formatted body
- `{{name}}` - Contact name
- `{{email}}` - Contact email  
- `{{phone}}` - Contact phone number
- `{{organization}}` - Contact organization

### Usage in FollowUpMaster

1. Navigate to FollowUpMaster dashboard (`/followups`)
2. Click on any contact's email action
3. Select a quick template (Follow Up, Document Request, etc.)
4. Compose email with auto-populated template
5. Toggle EmailJS on/off as needed
6. Send email via EmailJS or standard method

## Integration Notes

- The contact form component automatically uses the configured EmailJS service
- Form validation prevents submission of incomplete data
- Success/error messages provide user feedback
- Form resets after successful submission
- EmailComposer supports both EmailJS templates and standard email sending
- Fallback to standard email if EmailJS fails or is disabled

## Troubleshooting

### ⚠️ **CRITICAL: Emails Going to Wrong Recipient**

**Problem**: Emails are sent to admin email instead of intended recipient

**Solution**: 
1. Go to EmailJS Dashboard → Email Templates → Your Template
2. In **Template Settings** tab (not Content tab)
3. Change **"To Email"** field from hardcoded email to: `{{to_email}}`
4. Save template
5. Test again

**Before:** 
- To Email: `aimsaiproject@gmail.com` ❌

**After:**
- To Email: `{{to_email}}` ✅

### Other Issues:

1. **Template not found**: Verify template ID matches `.env` configuration
2. **Variables not working**: Ensure variable names match exactly (case-sensitive)
3. **Emails not sending**: Check service ID and public key
4. **Formatting issues**: Test template with sample data in EmailJS dashboard
5. **Emails in wrong language**: Check your EmailJS service language settings

## Security Notes

- Never expose private keys in client-side code
- Public key is safe to include in frontend
- Rate limiting is handled by EmailJS
- Form includes client-side validation