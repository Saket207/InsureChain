import os
import re

file_path = r"c:\Users\asus\OneDrive\Desktop\InsureChain\src\pages\RegisterPolicy.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update the steps array
content = content.replace(
    "const steps = ['Personal Profile', 'Risk Coverage', 'Authentication', 'Final Receipt'];",
    "const steps = ['Risk Coverage', 'Authentication', 'Final Receipt'];"
)

# 2. Update currentStep numbers
# 'currentStep === 0 && (' -> deleted later
# 'currentStep === 1 && (' -> 'currentStep === 0 && ('
# 'currentStep === 2 && (' -> 'currentStep === 1 && ('
# 'currentStep === 3 && (' -> 'currentStep === 2 && ('

# 3. Handle pre-filling profile logic
# We remove the useEffect that pre-fills registration data from farmerProfile,
# because we will pull district directly from farmerProfile.
content = re.sub(
    r"// Pre-fill profile on mount.*?}, \[farmerProfile, currentStep\]\);",
    """// Sync registration data with farmer profile
  useEffect(() => {
    if (farmerProfile && !registrationData.district) {
      updateRegistrationData({
        district: farmerProfile.districtId || null,
        state: farmerProfile.state || 'Maharashtra',
        fullName: farmerProfile.fullName || farmerProfile.name || '',
        email: farmerProfile.email || '',
      });
    }
  }, [farmerProfile]);""",
    content,
    flags=re.DOTALL
)

# 4. Remove `canProceedStep0` and `handleNextStep0`
content = re.sub(r"const canProceedStep0.*?;", "", content, flags=re.DOTALL)
content = re.sub(r"const handleNextStep0 = async \(\) => \{.*?finally \{\s*setIsProcessing\(false\);\s*\}\s*\};", "", content, flags=re.DOTALL)


# 5. Replace the JSX steps
# Find the start of Step 0: `{/* ═══ STEP 0: Personal Info ═══ */}`
# Find the start of Step 1: `{/* ═══ STEP 1: Coverage ═══ */}`
# Delete everything between them.
content = re.sub(
    r"\{\/\* ═══ STEP 0: Personal Info ═══ \*\/}.*?\{\/\* ═══ STEP 1: Coverage ═══ \*\/\}",
    "{/* ═══ STEP 0: Coverage ═══ */}",
    content,
    flags=re.DOTALL
)

# Now update the step numbers in the remaining JSX
content = content.replace("currentStep === 1", "currentStep === 0")
content = content.replace("currentStep === 2", "currentStep === 1")
content = content.replace("currentStep === 3", "currentStep === 2")
content = content.replace("key=\"step-1\"", "key=\"step-0\"")
content = content.replace("key=\"step-2\"", "key=\"step-1\"")
content = content.replace("key=\"step-3\"", "key=\"step-2\"")

# Add District Confirmation and Season Selector into the new Step 0
season_selector_jsx = """
            <div className="p-8 sm:p-12">
              {/* District & Season Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirmed District</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <input
                      type="text"
                      value={selectedDistrictData?.district || registrationData.district || 'Select from profile'}
                      disabled
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 text-sm font-bold text-slate-900 outline-none cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Operational Season</label>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: 'Kharif', label: 'Kharif', icon: <Zap className="w-4 h-4" /> },
                      { id: 'Rabi', label: 'Rabi', icon: <Shield className="w-4 h-4" /> },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => updateRegistrationData({ season: s.id })}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all hover:scale-[1.01] active:scale-[0.99]
                          ${registrationData.season === s.id
                            ? 'border-emerald-500 bg-emerald-50/50 shadow-inner text-emerald-700'
                            : 'border-slate-50 bg-slate-50/30 text-slate-500'
                          }`}
                      >
                        <div className={`p-2 rounded-xl ${registrationData.season === s.id ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 border border-slate-100 shadow-sm'}`}>
                          {s.icon}
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest">{s.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <TriggerSelector
"""

content = content.replace(
    """<div className="p-8 sm:p-12">
              <TriggerSelector""",
    season_selector_jsx
)

# 6. Also need to ensure `prevStep` points to the correct previous step now
content = content.replace("onClick={prevStep}", "onClick={prevStep}") # This logic handles dynamically via standard prevStep which just decrements by 1.

# Finally, write the file back
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("RegisterPolicy.jsx updated successfully.")
