import { useState } from 'react'

interface GettingStartedProps {
  onAddContact: () => void
  onCreateFollowUp?: () => void
  onImportContacts?: () => void
}

export default function GettingStarted({ onAddContact, onCreateFollowUp, onImportContacts }: GettingStartedProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      title: "Welcome to Zero Risk Agent!",
      description: "Let's get you started with managing your healthcare claims follow-ups.",
      icon: "waves",
      action: null
    },
    {
      title: "Add Your First Contact",
      description: "Start by adding contacts from ESIC, CGHS, hospitals, or insurance companies.",
      icon: "person_add",
      action: onAddContact,
      actionText: "Add Contact"
    },
    {
      title: "Create Follow-ups",
      description: "Once you have contacts, you can create follow-ups for your claims and automate communication.",
      icon: "auto_fix_high",
      action: onCreateFollowUp,
      actionText: "Create Follow-up"
    },
    {
      title: "Import Existing Data",
      description: "Have existing contact data? Import it to quickly populate your system.",
      icon: "upload",
      action: onImportContacts,
      actionText: "Import Contacts"
    }
  ]

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const currentStepData = steps[currentStep]

  return (
    <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-lg border border-teal-200 p-6 mb-6">
      <div className="text-center max-w-md mx-auto">
        {/* Icon */}
        <div className="mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-100 rounded-full">
            <span className="material-icon text-teal-600 text-2xl">{currentStepData.icon}</span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {currentStepData.title}
        </h2>

        {/* Description */}
        <p className="text-gray-600 mb-6">
          {currentStepData.description}
        </p>

        {/* Action Button */}
        {currentStepData.action && (
          <button
            onClick={currentStepData.action}
            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto mb-6"
          >
            <span className="material-icon text-sm">{currentStepData.icon}</span>
            {currentStepData.actionText}
          </button>
        )}

        {/* Progress Indicators */}
        <div className="flex justify-center items-center gap-4 mb-4">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <span className="material-icon text-gray-500">arrow_back</span>
          </button>

          <div className="flex gap-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep ? 'bg-teal-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={nextStep}
            disabled={currentStep === steps.length - 1}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <span className="material-icon text-gray-500">arrow_forward</span>
          </button>
        </div>

        {/* Step Counter */}
        <p className="text-sm text-gray-500">
          Step {currentStep + 1} of {steps.length}
        </p>

        {/* Quick Tips */}
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4 text-left">
          <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <span className="material-icon text-blue-500 text-sm">lightbulb</span>
            Quick Tips
          </h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• All data is stored locally in your browser - no external servers</li>
            <li>• You can export/backup your contacts at any time</li>
            <li>• Phone numbers will be validated for Indian format</li>
            <li>• Sample follow-ups are included to show how the system works</li>
          </ul>
        </div>
      </div>
    </div>
  )
}