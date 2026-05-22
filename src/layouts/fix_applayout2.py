import os

file_path = r"c:\Users\asus\OneDrive\Desktop\InsureChain\src\layouts\AppLayout.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# We need to do two things:
# 1. Import getAllFarmers and useEffect to fetch them
# 2. Add the Switch Profile dropdown back, combined with the Delete Account button

new_imports = """import { useWallet } from '../hooks/useWallet';
import { getAllFarmers } from '../services/firestoreService';
"""

content = content.replace("import { useWallet } from '../hooks/useWallet';", new_imports)

# Check if farmers state exists, if not add it
if "const [farmers, setFarmers]" not in content:
    state_hooks_str = "  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);"
    new_state_hooks = """  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [farmers, setFarmers] = useState([]);

  useEffect(() => {
    getAllFarmers().then(f => setFarmers(f)).catch(e => console.error(e));
  }, []);
"""
    content = content.replace(state_hooks_str, new_state_hooks)


# Replace the AnimatePresence block for the dropdown with the full one
start_str = "              {/* Profile Dropdown */}"
end_str = "              </AnimatePresence>"

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
                    <div className="p-4 bg-slate-50 border-b border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Fast Switch (Demo)</p>
                      <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                        {farmers.map((farmer) => (
                          <button
                            key={farmer.id}
                            onClick={() => {
                              if (mockLogin) {
                                mockLogin(farmer.id);
                              }
                              setDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors ${
                              farmerProfile?.uid === farmer.id 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              farmerProfile?.uid === farmer.id ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {(farmer.name || farmer.fullName || farmer.email || 'U').substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-sm font-bold truncate">{farmer.name || farmer.fullName || farmer.email || 'Unknown'}</span>
                              <span className="text-[10px] opacity-70 truncate uppercase">{farmer.role || 'farmer'}</span>
                            </div>
                          </button>
                        ))}
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
                               if(deleteAccount) await deleteAccount();
                               navigate('/login');
                             } catch (e) {
                               alert("Failed to delete account. Please try logging out and logging back in, then trying again.");
                             }
                           }
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-left text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        <span className="text-sm font-bold">Delete Account</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>"""

if start_idx != -1:
    content = content[:start_idx] + new_dropdown + content[end_idx:]

# Make sure mockLogin is destructured from useAuth()
if "mockLogin" not in content.split("useAuth();")[0].split("const {")[-1]:
    auth_idx = content.find("= useAuth();")
    if auth_idx != -1:
        line_start = content.rfind("\\n", 0, auth_idx)
        old_line = content[line_start+1:auth_idx+12]
        new_line = old_line.replace("}", ", mockLogin }")
        content = content.replace(old_line, new_line)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("AppLayout.jsx updated.")
