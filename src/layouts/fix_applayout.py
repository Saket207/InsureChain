import os

file_path = r"c:\Users\asus\OneDrive\Desktop\InsureChain\src\layouts\AppLayout.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# I need to find the AnimatePresence block for the Profile Dropdown and replace it
# It looks like:
#               {/* Profile Dropdown */}
#               <AnimatePresence>
#                 {dropdownOpen && (
#                   <motion.div ...>
#                     ...
#                   </motion.div>
#                 )}
#               </AnimatePresence>

start_str = "              {/* Profile Dropdown */}"
end_str = "              </AnimatePresence>"

new_block = """              {/* Profile Dropdown */}
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-[120%] right-0 w-64 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden z-50 flex flex-col"
                  >
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                        {userInitials}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{userName}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{farmerProfile?.role === 'admin' ? 'Admin Account' : 'Farmer Account'}</span>
                      </div>
                    </div>
                    
                    <div className="p-2 space-y-1">
                      <button
                        onClick={async () => {
                           try {
                             const { useAuth } = await import('../context/AuthContext');
                             // Hacky way to call it if it's not exported to this file directly,
                             // wait, I can just use `deleteAccount` from `useAuth` hook.
                             // It's better to update AppLayout to destructure `deleteAccount` from `useAuth()`.
                           } catch(e){}
                        }}
                        id="delete-btn-placeholder"
                        className="hidden"
                      ></button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>"""

# Wait, let's just do a string replacement on the exact code.
# I will first replace the `useAuth` destructure.
content = content.replace(
    "const { currentUser, farmerProfile, logout, mockLogin } = useAuth();",
    "const { currentUser, farmerProfile, logout, deleteAccount } = useAuth();"
)

content = content.replace(
    "const { farmerProfile, logout, mockLogin } = useAuth();",
    "const { farmerProfile, logout, deleteAccount } = useAuth();"
)

# And replace the dropdown block
start_idx = content.find(start_str)
end_idx = content.find(end_str) + len(end_str)

new_dropdown = """              {/* Profile Dropdown */}
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-[120%] right-0 w-64 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden z-50 flex flex-col"
                  >
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                        {userInitials}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-bold text-slate-900 truncate">{userName}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{farmerProfile?.role === 'admin' ? 'Admin Account' : 'Farmer Account'}</span>
                      </div>
                    </div>
                    
                    <div className="p-2 space-y-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-left text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm font-bold">Logout</span>
                      </button>
                      <button
                        onClick={async () => {
                           if (window.confirm("Are you sure you want to permanently delete your account and all data? This cannot be undone.")) {
                             try {
                               await deleteAccount();
                               navigate('/login');
                             } catch (e) {
                               alert("Failed to delete account. Please try logging out and logging back in, then trying again.");
                             }
                           }
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-left text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        <span className="text-sm font-bold">Delete Account</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>"""

if start_idx != -1:
    content = content[:start_idx] + new_dropdown + content[end_idx:]
    
    # Check if deleteAccount is destructured
    if "deleteAccount" not in content:
        # try to find useAuth
        auth_idx = content.find("= useAuth();")
        if auth_idx != -1:
            line_start = content.rfind("\\n", 0, auth_idx)
            old_line = content[line_start+1:auth_idx+12]
            new_line = old_line.replace("}", ", deleteAccount }")
            content = content.replace(old_line, new_line)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("AppLayout.jsx updated.")
else:
    print("Could not find dropdown block.")
