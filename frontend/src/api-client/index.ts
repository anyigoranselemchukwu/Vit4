import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/apiClient";
import type {
  User, Match, Prediction, Wallet, Transaction,
  Validator, TrainingJob, DashboardSummary
} from "./schemas";

export type { User, Match, Prediction, Wallet, Transaction, Validator, TrainingJob, DashboardSummary };

const API = {
  me: "/auth/me",
  login: "/auth/login",
  register: "/auth/register",
  dashboard: {
    summary: "/api/dashboard/summary",
    vitcoinPrice: "/api/dashboard/vitcoin-price",
    recentActivity: "/api/dashboard/recent-activity",
  },
  matches: "/history",
  match: (id: string) => `/history/${id}`,
  predictions: "/history",
  training: {
    jobs: "/api/training/jobs",
    upload: "/api/training/upload",
    score: "/api/training/score",
    prompt: (id: string) => `/api/training/prompt/${id}`,
    modelPerformance: "/analytics/summary",
  },
  validators: "/api/blockchain/validators",
  economy: "/api/blockchain/economy",
  myValidator: "/api/blockchain/validators/my",
  applyValidator: "/api/blockchain/validators/apply",
  validatorPredict: "/api/blockchain/validators/predict",
  stake: (matchId: string) => `/api/blockchain/predictions/${matchId}/stake`,
  myStakes: "/api/blockchain/stakes/my",
  consensusPrediction: (matchId: string) => `/api/blockchain/predictions/${matchId}`,
  wallet: "/api/wallet/me",
  transactions: "/api/wallet/transactions",
  depositInitiate: "/api/wallet/deposit/initiate",
  depositVerify: "/api/wallet/deposit/verify",
  convert: "/api/wallet/convert",
  withdraw: "/api/wallet/withdraw",
  plans: "/api/wallet/plans",
  subscribe: "/api/wallet/subscribe",
  vitcoinPrice: "/api/wallet/vitcoin-price",
};

export const getGetMeQueryKey = () => [API.me];
export const getGetDashboardSummaryQueryKey = () => [API.dashboard.summary];
export const getGetVitcoinPriceQueryKey = () => [API.dashboard.vitcoinPrice];
export const getGetRecentActivityQueryKey = () => [API.dashboard.recentActivity];
export const getListMatchesQueryKey = (params?: Record<string, unknown>) => [API.matches, params];
export const getGetMatchQueryKey = (id: string) => [API.match(id)];
export const getListPredictionsQueryKey = () => [API.predictions];
export const getListTrainingJobsQueryKey = () => [API.training.jobs];
export const getGetModelPerformanceQueryKey = () => [API.training.modelPerformance];
export const getListValidatorsQueryKey = () => [API.validators];
export const getGetEconomyQueryKey = () => [API.economy];
export const getGetWalletQueryKey = () => [API.wallet];
export const getListTransactionsQueryKey = () => [API.transactions];
export const getGetMyStakesQueryKey = () => [API.myStakes];
export const getGetMyValidatorQueryKey = () => [API.myValidator];
export const getConsensusPredictionQueryKey = (matchId: string) => [API.consensusPrediction(matchId)];

export function useGetMe(opts?: { query?: { enabled?: boolean; retry?: boolean } }) {
  return useQuery<User>({
    queryKey: getGetMeQueryKey(),
    queryFn: () => apiGet<User>(API.me),
    enabled: opts?.query?.enabled ?? true,
    retry: opts?.query?.retry ?? true,
  });
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: number;
  username: string;
  role: string;
}

export function useLogin() {
  return useMutation<AuthResponse, Error, { data: { email: string; password: string } }>({
    mutationFn: ({ data }) => apiPost<AuthResponse>(API.login, data),
  });
}

export function useRegister() {
  return useMutation<AuthResponse, Error, { data: { username: string; email: string; password: string } }>({
    mutationFn: ({ data }) => apiPost<AuthResponse>(API.register, data),
  });
}

export function useGetDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: getGetDashboardSummaryQueryKey(),
    queryFn: () => apiGet<DashboardSummary>(API.dashboard.summary),
  });
}

export function useGetVitcoinPrice() {
  return useQuery<{ price: number; change_24h: number }>({
    queryKey: getGetVitcoinPriceQueryKey(),
    queryFn: () => apiGet<{ price: number; change_24h: number }>(API.dashboard.vitcoinPrice),
  });
}

export function useGetRecentActivity() {
  return useQuery<any[]>({
    queryKey: getGetRecentActivityQueryKey(),
    queryFn: () => apiGet<any[]>(API.dashboard.recentActivity),
  });
}

export function useListMatches(params?: Record<string, unknown>) {
  return useQuery<{ predictions: Match[]; total: number }>({
    queryKey: getListMatchesQueryKey(params),
    queryFn: () => {
      const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
      return apiGet<{ predictions: Match[]; total: number }>(API.matches + qs);
    },
  });
}

export function useGetMatch(id: string) {
  return useQuery<Match>({
    queryKey: getGetMatchQueryKey(id),
    queryFn: async () => {
      const raw = await apiGet<any>(API.match(id));
      // Backend returns nested { match, prediction, clv, markets } — flatten for the component
      if (raw && raw.match && raw.prediction) {
        return {
          match_id: raw.match.id,
          home_team: raw.match.home_team,
          away_team: raw.match.away_team,
          league: raw.match.league,
          kickoff_time: raw.match.kickoff_time,
          ft_score: raw.match.ft_score,
          actual_outcome: raw.match.actual_outcome,
          status: raw.match.status,
          home_prob: raw.prediction.home_prob,
          draw_prob: raw.prediction.draw_prob,
          away_prob: raw.prediction.away_prob,
          over_25_prob: raw.prediction.over_25_prob,
          btts_prob: raw.prediction.btts_prob,
          consensus_prob: raw.prediction.consensus_prob,
          recommended_stake: raw.prediction.recommended_stake,
          final_ev: raw.prediction.final_ev,
          edge: raw.prediction.edge,
          confidence: raw.prediction.confidence,
          bet_side: raw.prediction.bet_side,
          entry_odds: raw.prediction.entry_odds,
          clv: raw.clv?.clv ?? null,
          profit: raw.clv?.profit ?? null,
          timestamp: raw.prediction.timestamp,
          // Pass through extra rich data for extended display
          _markets: raw.markets,
          _model_summary: raw.model_summary,
          _neural_info: raw.neural_info,
        } as Match & { _markets?: any; _model_summary?: any; _neural_info?: any };
      }
      return raw as Match;
    },
    enabled: !!id,
  });
}

export function useCreatePrediction() {
  const queryClient = useQueryClient();
  return useMutation<Prediction, Error, { data: Record<string, unknown> }>({
    mutationFn: ({ data }) => apiPost<Prediction>("/predict", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListPredictionsQueryKey() });
    },
  });
}

export function useListPredictions() {
  return useQuery<{ predictions: Prediction[]; total: number }>({
    queryKey: getListPredictionsQueryKey(),
    queryFn: () => apiGet<{ predictions: Prediction[]; total: number }>(API.predictions),
  });
}

export function useListTrainingJobs() {
  return useQuery<{ jobs: TrainingJob[]; total: number }>({
    queryKey: getListTrainingJobsQueryKey(),
    queryFn: () => apiGet<{ jobs: TrainingJob[]; total: number }>(API.training.jobs),
  });
}

export function useGetModelPerformance() {
  return useQuery<any>({
    queryKey: getGetModelPerformanceQueryKey(),
    queryFn: () => apiGet<any>(API.training.modelPerformance),
  });
}

export function useUploadTrainingData() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, FormData>({
    mutationFn: (formData: FormData) =>
      fetch(API.training.upload, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("vit_token")}` },
        body: formData,
      }).then((r) => {
        if (!r.ok) throw new Error("Upload failed");
        return r.json();
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTrainingJobsQueryKey() }),
  });
}

export function useListValidators() {
  return useQuery<Validator[]>({
    queryKey: getListValidatorsQueryKey(),
    queryFn: () => apiGet<Validator[]>(API.validators),
  });
}

export function useGetEconomy() {
  return useQuery<any>({
    queryKey: getGetEconomyQueryKey(),
    queryFn: () => apiGet<any>(API.economy),
  });
}

export function useGetMyValidator() {
  return useQuery<any>({
    queryKey: getGetMyValidatorQueryKey(),
    queryFn: () => apiGet<any>(API.myValidator),
    retry: false,
  });
}

export function useApplyAsValidator() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { stake_amount: number }>({
    mutationFn: (data) => apiPost<any>(API.applyValidator, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListValidatorsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetMyValidatorQueryKey() });
    },
  });
}

export function useStakeOnPrediction() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { matchId: string; prediction: string; amount: number }>({
    mutationFn: ({ matchId, prediction, amount }) =>
      apiPost<any>(API.stake(matchId), { prediction, amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetMyStakesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
    },
  });
}

export function useGetMyStakes() {
  return useQuery<any[]>({
    queryKey: getGetMyStakesQueryKey(),
    queryFn: () => apiGet<any[]>(API.myStakes),
  });
}

export function useGetConsensusPrediction(matchId: string) {
  return useQuery<any>({
    queryKey: getConsensusPredictionQueryKey(matchId),
    queryFn: () => apiGet<any>(API.consensusPrediction(matchId)),
    enabled: !!matchId,
    retry: false,
  });
}

export function useGetWallet() {
  return useQuery<Wallet>({
    queryKey: getGetWalletQueryKey(),
    queryFn: () => apiGet<Wallet>(API.wallet),
  });
}

export function useListTransactions(params?: { currency?: string; limit?: number }) {
  return useQuery<{ transactions: Transaction[]; total: number }>({
    queryKey: [API.transactions, params],
    queryFn: () => {
      const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
      return apiGet<{ transactions: Transaction[]; total: number }>(API.transactions + qs);
    },
  });
}

export function useInitiateDeposit() {
  const queryClient = useQueryClient();
  return useMutation<{ payment_link: string; reference: string; status: string; amount: number; currency: string; method: string }, Error, { currency: string; amount: number; method: string }>({
    mutationFn: (data) => apiPost<{ payment_link: string; reference: string; status: string; amount: number; currency: string; method: string }>(API.depositInitiate, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [API.transactions] }),
  });
}

export function useVerifyDeposit() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { reference: string; currency: string }>({
    mutationFn: (data) => apiPost<any>(API.depositVerify, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() }),
  });
}

export function useConvertCurrency() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { from_currency: string; to_currency: string; amount: number }>({
    mutationFn: (data) => apiPost<any>(API.convert, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
      queryClient.invalidateQueries({ queryKey: [API.transactions] });
    },
  });
}

export function useWithdraw() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { currency: string; amount: number; destination: string; destination_type: string }>({
    mutationFn: (data) => apiPost<any>(API.withdraw, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() }),
  });
}
