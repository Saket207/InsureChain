import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Vote,
  Users,
  Landmark,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Clock,
  Loader2,
  Zap,
  Shield,
  TrendingUp,
  AlertTriangle,
  Flame,
  Link2,
  Wallet,
  Satellite,
  CircleDollarSign,
  Sparkles,
  ArrowUpRight,
  Timer,
  Eye,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  seedGovernanceProposals,
  getGovernanceProposals,
  castGovernanceVote,
  getUserGovernanceVotes,
} from '../services/firestoreService';

const CATEGORY_CONFIG = {
  Premium: {
    icon: CircleDollarSign,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    gradient: 'from-violet-500 to-purple-600',
    pill: 'bg-violet-100 text-violet-700',
    label: '💰 Premium',
  },
  Expansion: {
    icon: Users,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    border: 'border-cyan-100',
    gradient: 'from-cyan-500 to-blue-600',
    pill: 'bg-cyan-100 text-cyan-700',
    label: '🗺️ Expansion',
  },
  Parameters: {
    icon: BarChart3,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    gradient: 'from-amber-500 to-orange-500',
    pill: 'bg-amber-100 text-amber-700',
    label: '⚙️ Parameters',
  },
  Oracle: {
    icon: Link2,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    gradient: 'from-blue-500 to-indigo-600',
    pill: 'bg-blue-100 text-blue-700',
    label: '🔗 Oracle',
  },
  Payout: {
    icon: Wallet,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    gradient: 'from-rose-500 to-pink-600',
    pill: 'bg-rose-100 text-rose-700',
    label: '💸 Payout',
  },
};

const IMPACT_BADGE = {
  low: { label: 'Low Impact', cls: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Medium Impact', cls: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'High Impact', cls: 'bg-orange-100 text-orange-700' },
  critical: { label: '🔥 Critical', cls: 'bg-red-100 text-red-700' },
};

function VoteProgressBar({ votesFor, votesAgainst }) {
  const total = votesFor + votesAgainst;
  const forPercent = total > 0 ? Math.round((votesFor / total) * 100) : 0;
  const againstPercent = total > 0 ? 100 - forPercent : 0;
  const quorumMet = total >= 10;

  return (
    <div className="mt-5">
      <div className="flex justify-between text-xs font-bold mb-2">
        <span className="flex items-center gap-1.5 text-emerald-600">
          <ThumbsUp className="w-3 h-3" />
          {votesFor} For ({forPercent}%)
        </span>
        <span className="flex items-center gap-1.5 text-red-600">
          {votesAgainst} Against ({againstPercent}%)
          <ThumbsDown className="w-3 h-3" />
        </span>
      </div>

      {/* Track */}
      <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
        <motion.div
          className="absolute left-0 top-0 h-full rounded-l-full bg-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${forPercent}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
        <motion.div
          className="absolute right-0 top-0 h-full rounded-r-full bg-red-500"
          initial={{ width: 0 }}
          animate={{ width: `${againstPercent}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.15 }}
        />
        {/* Center divider */}
        {total > 0 && (
          <div className="absolute left-1/2 top-0 w-0.5 h-full bg-white -translate-x-1/2 z-10" />
        )}
      </div>

      {/* Bottom info */}
      <div className="flex justify-between items-center mt-2">
        <p className="text-xs text-slate-500 font-medium">
          {total} vote{total !== 1 ? 's' : ''} cast
        </p>
        <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${quorumMet ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          <Shield className="w-3 h-3" />
          {quorumMet ? 'Quorum Met' : `${10 - total} more to quorum`}
        </div>
      </div>
    </div>
  );
}

function ProposalCard({ proposal, userVote, onVote, isVoting, index }) {
  const cat = CATEGORY_CONFIG[proposal.category] || CATEGORY_CONFIG.Premium;
  const CatIcon = cat.icon;
  const hasVoted = !!userVote;
  const impact = IMPACT_BADGE[proposal.impact] || IMPACT_BADGE.medium;

  const endsAt = proposal.endsAt?.toDate ? proposal.endsAt.toDate() : new Date(proposal.endsAt);
  const daysLeft = Math.max(0, Math.ceil((endsAt - new Date()) / (1000 * 60 * 60 * 24)));
  const total = (proposal.votesFor || 0) + (proposal.votesAgainst || 0);
  const forPercent = total > 0 ? Math.round(((proposal.votesFor || 0) / total) * 100) : 0;
  const isLeadingFor = forPercent >= 50;

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-white hover:border-slate-300 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-slate-200"
    >
      {/* Top Accent */}
      <div className={`h-1 bg-gradient-to-r ${cat.gradient}`} />

      <div className="p-6">
        {/* Top Row: Category + Impact + Timer */}
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${cat.pill} uppercase tracking-wider`}>
              {cat.label}
            </span>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${impact.cls} uppercase tracking-wider`}>
              {impact.label}
            </span>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded">
              {proposal.id}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg uppercase tracking-wider">
            <Timer className="w-3.5 h-3.5 text-amber-500" />
            {daysLeft}d left
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-extrabold text-slate-900 mb-2 leading-tight group-hover:text-violet-700 transition-colors">
          {proposal.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          {proposal.description}
        </p>

        {/* Proposed By + Current Verdict */}
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-xs text-slate-500">
            Proposed by <span className="font-bold text-slate-800">{proposal.proposedBy}</span>
          </p>
          <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg ${isLeadingFor ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            <TrendingUp className="w-3 h-3" />
            {total === 0 ? 'No votes yet' : isLeadingFor ? `Passing ${forPercent}%` : `Failing ${forPercent}%`}
          </div>
        </div>

        {/* Progress Bar */}
        <VoteProgressBar votesFor={proposal.votesFor || 0} votesAgainst={proposal.votesAgainst || 0} />

        {/* Vote Buttons */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          {hasVoted ? (
            <div className="flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl bg-slate-50 border border-slate-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="text-sm font-bold text-slate-700">
                Your vote: <span className={userVote === 'for' ? 'text-emerald-600' : 'text-red-600'}>{userVote === 'for' ? '✓ For' : '✗ Against'}</span>
              </span>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => onVote(proposal.id, 'for')}
                disabled={isVoting}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 
                  bg-emerald-500 text-white 
                  hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/25 
                  hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isVoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                Vote For
              </button>
              <button
                onClick={() => onVote(proposal.id, 'against')}
                disabled={isVoting}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 
                  bg-red-500 text-white 
                  hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/25 
                  hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isVoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4" />}
                Vote Against
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function Governance() {
  const { currentUser } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [userVotes, setUserVotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await seedGovernanceProposals();
        const fetchedProposals = await getGovernanceProposals();
        setProposals(fetchedProposals);
        if (currentUser?.uid) {
          const votes = await getUserGovernanceVotes(currentUser.uid);
          setUserVotes(votes);
        }
      } catch (e) {
        console.error('Governance init error:', e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [currentUser]);

  const handleVote = async (proposalId, voteType) => {
    if (!currentUser?.uid) {
      setToast({ type: 'error', message: 'Please log in to vote.' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setVotingId(proposalId);
    try {
      const result = await castGovernanceVote(proposalId, currentUser.uid, voteType);
      if (result.success) {
        setUserVotes((prev) => ({ ...prev, [proposalId]: voteType }));
        setProposals((prev) =>
          prev.map((p) =>
            p.id === proposalId
              ? {
                  ...p,
                  votesFor: voteType === 'for' ? (p.votesFor || 0) + 1 : p.votesFor || 0,
                  votesAgainst: voteType === 'against' ? (p.votesAgainst || 0) + 1 : p.votesAgainst || 0,
                  totalVoters: (p.totalVoters || 0) + 1,
                }
              : p
          )
        );
        setToast({ type: 'success', message: `Vote recorded for ${proposalId}!` });
      } else {
        setToast({ type: 'error', message: result.message || 'Vote failed.' });
      }
    } catch {
      setToast({ type: 'error', message: 'Network error. Try again.' });
    } finally {
      setVotingId(null);
      setTimeout(() => setToast(null), 3500);
    }
  };

  // Stats
  const totalVotes = proposals.reduce((sum, p) => sum + (p.totalVoters || 0), 0);
  const activeCount = proposals.filter((p) => p.status === 'active').length;
  const categories = ['all', ...new Set(proposals.map((p) => p.category))];
  const filteredProposals = filter === 'all' ? proposals : proposals.filter((p) => p.category === filter);

  return (
    <div className="max-w-5xl mx-auto pb-16">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -30, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -30, x: '-50%' }}
            className={`fixed top-6 left-1/2 z-50 px-6 py-3.5 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2 backdrop-blur-xl border ${
              toast.type === 'success'
                ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/30'
                : 'bg-red-500 text-white border-red-400 shadow-red-500/30'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ HERO ═══ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12 relative">
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-violet-500/30 rotate-3 hover:rotate-0 transition-transform duration-300">
            <Vote className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-3 tracking-tight">
            InsureChain <span className="bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">DAO</span>
          </h1>
          <p className="text-lg font-bold bg-gradient-to-r from-violet-600 to-cyan-600 bg-clip-text text-transparent mb-3">
            Decentralized Community Governance
          </p>
          <p className="text-slate-500 max-w-2xl mx-auto text-sm leading-relaxed font-medium">
            Shape the future of parametric crop insurance. Token holders vote on premium rates, new district expansions, oracle configurations, and AI risk model thresholds. Every vote is recorded on-chain.
          </p>
        </div>
      </motion.div>

      {/* ═══ STATS ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
        {[
          { icon: Zap, label: 'Active', value: activeCount, color: 'text-violet-600', bg: 'bg-violet-100', border: 'border-violet-200' },
          { icon: Users, label: 'Total Votes', value: totalVotes, color: 'text-cyan-600', bg: 'bg-cyan-100', border: 'border-cyan-200' },
          { icon: Eye, label: 'Participation', value: `${Math.min(100, Math.round(totalVotes / Math.max(1, activeCount * 10) * 100))}%`, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' },
          { icon: Shield, label: 'Quorum', value: '10 votes', color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            className={`bg-white rounded-2xl p-5 border shadow-sm text-center transition-all duration-200 ${stat.border} hover:shadow-md hover:-translate-y-1`}
          >
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center mx-auto mb-3`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ═══ CATEGORY FEATURES ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-10">
        {[
          { icon: Landmark, title: 'Premiums', desc: 'Rate adjustments', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
          { icon: Users, title: 'Districts', desc: 'Region expansion', color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-100' },
          { icon: BarChart3, title: 'ML Params', desc: 'Risk thresholds', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
          { icon: Link2, title: 'Oracles', desc: 'Data frequency', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { icon: Wallet, title: 'Payouts', desc: 'Vault limits', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 + i * 0.05 }}
            className={`rounded-xl p-4 text-center border ${item.border} ${item.bg} hover:shadow-md hover:bg-white transition-all duration-200 cursor-default`}
          >
            <item.icon className={`w-6 h-6 mx-auto mb-2 ${item.color}`} />
            <h3 className="text-xs font-bold text-slate-800">{item.title}</h3>
            <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* ═══ FILTER TABS + HEADING ═══ */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
          <Flame className="w-5 h-5 text-orange-500" />
          Active Proposals
          <span className="ml-1 text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
            {filteredProposals.length} open
          </span>
        </h2>

        {/* Filter tabs */}
        <div className="flex gap-1.5 p-1 rounded-xl bg-slate-50 border border-slate-100">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                filter === cat
                  ? 'bg-white text-violet-600 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ PROPOSALS LIST ═══ */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
          <span className="text-slate-500 font-bold text-sm">Syncing with Firestore...</span>
        </div>
      ) : (
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {filteredProposals.map((proposal, i) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                userVote={userVotes[proposal.id]}
                onVote={handleVote}
                isVoting={votingId === proposal.id}
                index={i}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ═══ FOOTER ═══ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center mt-16 space-y-3"
      >
        <div className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-slate-50 text-sm font-semibold text-slate-500 border border-slate-200">
          <Shield className="w-4 h-4 text-violet-500" />
          Votes stored securely on Firebase Firestore
        </div>
        <p className="text-xs font-medium text-slate-400">
          InsureChain DAO Governance System
        </p>
      </motion.div>
    </div>
  );
}
